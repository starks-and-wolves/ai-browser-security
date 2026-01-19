const AgentSession = require('../models/AgentSession');

/**
 * Session State Middleware for AWI
 *
 * Implements server-side session state management as per AWI principles:
 * - Tracks current state across requests
 * - Maintains action history (trajectory)
 * - Enables incremental state updates
 * - Validates action availability
 *
 * Based on "Build the Web for Agents, not agents for the web" (arXiv:2506.10953v1)
 */

/**
 * Load or create session for authenticated agent
 * Must be used AFTER agentAuth middleware
 */
const loadSession = async (req, res, next) => {
  try {
    if (!req.agent) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required for session management'
      });
    }

    // Find or create session
    const session = await AgentSession.findOrCreateForAgent(
      req.agent.id,
      req.agent.name
    );

    // Validate session
    if (!session.isValid()) {
      // Session expired, create new one
      const newSession = await AgentSession.create({
        agentId: req.agent.id,
        agentName: req.agent.name
      });
      req.session = newSession;
    } else {
      req.session = session;
    }

    // Touch session to update last activity
    await req.session.touch();

    // Calculate available actions based on current state and permissions
    req.session.calculateAvailableActions(req.agent.permissions);

    next();
  } catch (error) {
    console.error('Session loading error:', error);
    // Don't fail the request if session fails - degrade gracefully
    req.session = null;
    next();
  }
};

/**
 * Record action in session trajectory
 * Call this at the END of request handling (in controller)
 */
const recordAction = (actionType) => {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);

    res.json = function(data) {
      // Record action after response is ready
      if (req.session) {
        // Don't await - let it happen in background
        req.session.recordAction({
          action: actionType,
          method: req.method,
          endpoint: req.originalUrl,
          parameters: {
            params: req.params,
            query: req.query,
            body: req.body
          },
          success: res.statusCode >= 200 && res.statusCode < 300,
          statusCode: res.statusCode,
          errorMessage: data.error || null,
          observationSummary: generateObservationSummary(actionType, data)
        }).catch(err => {
          console.error('Failed to record action:', err);
        });
      }

      // Call original json method
      return originalJson(data);
    };

    next();
  };
};

/**
 * Update session state based on action
 * Call this DURING request processing (in controller)
 */
const updateSessionState = async (req, stateUpdates) => {
  if (req.session) {
    await req.session.updateState(stateUpdates);
  }
};

/**
 * Validate if action is available in current state
 */
const validateActionAvailable = (actionName) => {
  return (req, res, next) => {
    if (!req.session) {
      // No session, allow action (degraded mode)
      return next();
    }

    const action = req.session.availableActions.find(a => a.action === actionName);

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action not available in current state',
        errorCode: 'ACTION_UNAVAILABLE',
        currentState: {
          route: req.session.currentState.currentRoute,
          page: req.session.currentState.currentPage
        },
        availableActions: req.session.availableActions.map(a => a.action)
      });
    }

    if (!action.enabled) {
      return res.status(400).json({
        success: false,
        error: 'Action currently disabled',
        errorCode: 'ACTION_DISABLED',
        reason: action.disabledReason,
        suggestion: 'Check available actions from session state'
      });
    }

    next();
  };
};

/**
 * Generate observation summary for trajectory
 */
function generateObservationSummary(actionType, responseData) {
  switch (actionType) {
    case 'list_posts':
      return `Retrieved ${responseData.posts?.length || 0} posts (page ${responseData.pagination?.currentPage || 1})`;

    case 'get_post':
      return responseData.success
        ? `Viewed post: "${responseData.data?.title?.substring(0, 50) || 'Untitled'}"`
        : 'Failed to retrieve post';

    case 'create_post':
      return responseData.success
        ? `Created post: "${responseData.data?.title?.substring(0, 50)}"`
        : `Failed to create post: ${responseData.error}`;

    case 'create_comment':
      return responseData.success
        ? `Added comment (${responseData.data?.content?.length || 0} chars)`
        : `Failed to add comment: ${responseData.error}`;

    case 'search':
      return `Search returned ${responseData.results?.length || 0} results`;

    case 'filter':
      return `Applied filter, ${responseData.posts?.length || 0} items match`;

    default:
      return `Performed ${actionType}`;
  }
}

/**
 * Get session state for response (include in API responses)
 */
const getSessionStateForResponse = (session) => {
  if (!session) return null;

  return {
    sessionId: session.sessionId,
    currentState: {
      route: session.currentState.currentRoute,
      page: session.currentState.currentPage,
      filters: session.currentState.activeFilters,
      sort: session.currentState.sortBy,
      pagination: session.currentState.pagination,
      viewing: session.currentState.currentlyViewing
    },
    availableActions: session.availableActions.filter(a => a.enabled).map(a => ({
      action: a.action,
      method: a.method,
      endpoint: a.endpoint,
      requiresPermission: a.requiresPermission
    })),
    disabledActions: session.availableActions.filter(a => !a.enabled).map(a => ({
      action: a.action,
      reason: a.disabledReason
    })),
    taskContext: session.taskContext.currentTask ? {
      task: session.taskContext.currentTask,
      progress: session.taskContext.taskProgress
    } : null,
    statistics: {
      totalActions: session.statistics.totalActions,
      successRate: session.statistics.totalActions > 0
        ? (session.statistics.successfulActions / session.statistics.totalActions * 100).toFixed(1) + '%'
        : 'N/A'
    }
  };
};

/**
 * Include session state in response
 * Use this as last middleware before sending response
 */
const enrichResponseWithState = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = function(data) {
    // Add session state to response if available
    if (req.session && data && typeof data === 'object') {
      data._sessionState = getSessionStateForResponse(req.session);
    }

    return originalJson(data);
  };

  next();
};

/**
 * Cleanup middleware - end session if requested
 */
const handleSessionEnd = async (req, res, next) => {
  if (req.query.endSession === 'true' && req.session) {
    await req.session.endSession();
    return res.json({
      success: true,
      message: 'Session ended successfully',
      sessionId: req.session.sessionId,
      statistics: {
        totalActions: req.session.statistics.totalActions,
        successfulActions: req.session.statistics.successfulActions,
        failedActions: req.session.statistics.failedActions,
        duration: (req.session.sessionEndedAt - req.session.sessionStartedAt) / 1000 + 's'
      }
    });
  }
  next();
};

module.exports = {
  loadSession,
  recordAction,
  updateSessionState,
  validateActionAvailable,
  enrichResponseWithState,
  getSessionStateForResponse,
  handleSessionEnd
};
