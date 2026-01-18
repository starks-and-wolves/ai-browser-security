/**
 * Redis-Based Session State Middleware
 *
 * Replaces MongoDB session storage with Redis for:
 * - Faster state access (in-memory)
 * - Diff-based updates
 * - Efficient caching
 * - Better concurrency handling
 *
 * Long-term history still stored in MongoDB for:
 * - Debugging
 * - Compliance
 * - Analytics
 * - Replay
 */

const AWIStateManager = require('../utils/awiStateManager');
const AgentSession = require('../models/AgentSession'); // MongoDB model for archival

/**
 * Load or create AWI session (Redis-based)
 */
const loadRedisSession = async (req, res, next) => {
  try {
    if (!req.agent) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required for session management'
      });
    }

    // Try to find active session in Redis
    let sessionState = await AWIStateManager.findSessionForAgent(req.agent.id);

    if (!sessionState) {
      // No active session - create new one
      const { sessionId, state } = await AWIStateManager.initializeSession(
        req.agent.id,
        req.agent.name,
        req.originalUrl
      );

      sessionState = state;

      console.log(`✅ Created new Redis session: ${sessionId} for agent: ${req.agent.name}`);
    } else {
      // Touch session to refresh TTL
      await AWIStateManager.touchSession(sessionState.session_id);
    }

    // Attach to request
    req.awiSession = sessionState;
    req.sessionId = sessionState.session_id;

    next();
  } catch (error) {
    console.error('Redis session loading error:', error);

    // Don't fail the request - degrade gracefully
    req.awiSession = null;
    req.sessionId = null;
    next();
  }
};

/**
 * Record action in Redis session state
 */
const recordRedisAction = (actionType) => {
  return async (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);

    res.json = function(data) {
      // Record action after response is ready (non-blocking)
      if (req.sessionId) {
        const actionInfo = {
          action: actionType,
          method: req.method,
          endpoint: req.originalUrl,
          input: {
            params: req.params,
            query: req.query,
            body: req.body ? Object.keys(req.body) : []  // Don't store full body
          },
          success: res.statusCode >= 200 && res.statusCode < 300,
          statusCode: res.statusCode,
          observation: generateObservationSummary(actionType, data)
        };

        // Update state with action (background)
        AWIStateManager.updateStateWithDelta(
          req.sessionId,
          {},  // No state change, just logging action
          actionInfo
        ).catch(err => {
          console.error('Failed to record action in Redis:', err);
        });
      }

      // Call original json method
      return originalJson(data);
    };

    next();
  };
};

/**
 * Update session state with page data
 */
const updatePageState = async (req, pageData) => {
  if (!req.sessionId) {
    return;
  }

  const pageStateUpdate = {
    route: req.originalUrl,
    metadata: {
      title: pageData.title || '',
      breadcrumbs: pageData.breadcrumbs || []
    },
    visible_items: pageData.items || [],
    pagination: pageData.pagination || {},
    filters: pageData.filters || {},
    sort: pageData.sort || {}
  };

  await AWIStateManager.updatePageState(req.sessionId, pageStateUpdate);
};

/**
 * Update pagination state
 */
const updatePaginationState = async (req, paginationData) => {
  if (!req.sessionId) {
    return;
  }

  await AWIStateManager.updatePagination(req.sessionId, paginationData);
};

/**
 * Enrich response with AWI session state
 */
const enrichResponseWithRedisState = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = function(data) {
    // Add session state to response if available
    if (req.awiSession && data && typeof data === 'object') {
      data._sessionState = {
        sessionId: req.awiSession.session_id,
        currentState: {
          route: req.awiSession.page_state.route,
          page: req.awiSession.page_state.pagination.cursor,
          filters: req.awiSession.page_state.filters,
          sort: req.awiSession.page_state.sort,
          pagination: req.awiSession.page_state.pagination
        },
        availableActions: req.awiSession.action_state.available_actions.map(action => ({
          action: action
        })),
        disabledActions: req.awiSession.action_state.disabled_actions.map(action => ({
          action: action,
          reason: getDisabledReason(action, req.awiSession)
        })),
        statistics: {
          totalActions: req.awiSession.statistics.total_actions,
          successfulActions: req.awiSession.statistics.successful_actions,
          failedActions: req.awiSession.statistics.failed_actions,
          successRate: req.awiSession.statistics.total_actions > 0
            ? ((req.awiSession.statistics.successful_actions / req.awiSession.statistics.total_actions) * 100).toFixed(1) + '%'
            : 'N/A'
        },
        lastUpdated: req.awiSession.last_updated
      };
    }

    return originalJson(data);
  };

  next();
};

/**
 * Archive session to MongoDB when it ends
 */
const archiveSessionToMongoDB = async (sessionId) => {
  try {
    // Get final state from Redis
    const finalState = await AWIStateManager.endSession(sessionId);

    if (!finalState) {
      return;
    }

    // Create MongoDB archive record
    const archive = new AgentSession({
      sessionId: finalState.session_id,
      agentId: finalState.agent_id,
      agentName: finalState.agent_name,
      sessionStartedAt: new Date(finalState.statistics.session_start),
      sessionEndedAt: new Date(finalState.statistics.session_end || Date.now()),
      sessionActive: false,

      // Store final state snapshot
      currentState: finalState.page_state,
      actionHistory: finalState.history.actions,

      statistics: {
        totalActions: finalState.statistics.total_actions,
        successfulActions: finalState.statistics.successful_actions,
        failedActions: finalState.statistics.failed_actions
      }
    });

    await archive.save();

    console.log(`✅ Archived session ${sessionId} to MongoDB`);
  } catch (error) {
    console.error('Failed to archive session to MongoDB:', error);
  }
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

    default:
      return `Performed ${actionType}`;
  }
}

/**
 * Get reason why action is disabled
 */
function getDisabledReason(action, sessionState) {
  const pagination = sessionState.page_state.pagination;

  switch (action) {
    case 'prev_page':
      return pagination.cursor <= 1 ? 'Already on first page' : '';
    case 'next_page':
      return pagination.cursor >= pagination.total_pages ? 'Already on last page' : '';
    default:
      return 'Action not available in current state';
  }
}

module.exports = {
  loadRedisSession,
  recordRedisAction,
  updatePageState,
  updatePaginationState,
  enrichResponseWithRedisState,
  archiveSessionToMongoDB
};
