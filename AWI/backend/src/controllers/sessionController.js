const AgentSession = require('../models/AgentSession');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * Session Management Controller
 *
 * Provides state query APIs for agents as per AWI principles
 * Enables agents to:
 * - Query current session state
 * - Get action history (trajectory)
 * - Request state diffs
 * - Manage session lifecycle
 */

/**
 * @desc    Get current session state
 * @route   GET /api/agent/session/state
 * @access  Agent
 */
exports.getSessionState = asyncHandler(async (req, res) => {
  if (!req.session) {
    return res.status(404).json({
      success: false,
      error: 'No active session found',
      message: 'Session may have expired or not been initialized'
    });
  }

  res.json({
    success: true,
    sessionId: req.session.sessionId,
    state: {
      navigation: {
        currentRoute: req.session.currentState.currentRoute,
        currentPage: req.session.currentState.currentPage
      },
      filters: req.session.currentState.activeFilters,
      sort: req.session.currentState.sortBy,
      pagination: req.session.currentState.pagination,
      selections: {
        postsSelected: req.session.currentState.selectedItems.posts.length,
        commentsSelected: req.session.currentState.selectedItems.comments.length
      },
      viewing: req.session.currentState.currentlyViewing,
      draftContent: {
        hasPostDraft: !!req.session.currentState.draftContent.postDraft?.title,
        hasCommentDraft: !!req.session.currentState.draftContent.commentDraft?.content
      }
    },
    availableActions: req.session.availableActions,
    taskContext: req.session.taskContext,
    statistics: req.session.statistics,
    sessionMetadata: {
      startedAt: req.session.sessionStartedAt,
      lastActivity: req.session.lastActivityAt,
      active: req.session.sessionActive,
      expiresAt: req.session.expiresAt
    }
  });
});

/**
 * @desc    Get action history (trajectory trace)
 * @route   GET /api/agent/session/history
 * @access  Agent
 */
exports.getActionHistory = asyncHandler(async (req, res) => {
  if (!req.session) {
    return res.status(404).json({
      success: false,
      error: 'No active session'
    });
  }

  const { limit = 20, offset = 0 } = req.query;

  // Get recent actions
  const recentActions = req.session.actionHistory
    .slice(-parseInt(limit) - parseInt(offset), req.session.actionHistory.length - parseInt(offset))
    .reverse();

  res.json({
    success: true,
    sessionId: req.session.sessionId,
    trajectory: recentActions.map(action => ({
      action: action.action,
      method: action.method,
      endpoint: action.endpoint,
      timestamp: action.timestamp,
      success: action.success,
      observation: action.observationSummary
    })),
    totalActions: req.session.actionHistory.length,
    returned: recentActions.length,
    hasMore: req.session.actionHistory.length > parseInt(limit) + parseInt(offset)
  });
});

/**
 * @desc    Get state diff since last action
 * @route   GET /api/agent/session/diff
 * @access  Agent
 */
exports.getStateDiff = asyncHandler(async (req, res) => {
  if (!req.session) {
    return res.status(404).json({
      success: false,
      error: 'No active session'
    });
  }

  // Get previous state from last action
  const lastAction = req.session.actionHistory[req.session.actionHistory.length - 2];

  if (!lastAction || !lastAction.stateSnapshot) {
    return res.json({
      success: true,
      message: 'No previous state to compare',
      diff: req.session.currentState
    });
  }

  const diff = req.session.getStateDiff(lastAction.stateSnapshot);

  res.json({
    success: true,
    sessionId: req.session.sessionId,
    diff,
    previousState: {
      timestamp: lastAction.timestamp,
      action: lastAction.action
    },
    currentState: {
      timestamp: new Date()
    }
  });
});

/**
 * @desc    Update session state manually
 * @route   POST /api/agent/session/state
 * @access  Agent
 */
exports.updateSessionState = asyncHandler(async (req, res) => {
  if (!req.session) {
    return res.status(404).json({
      success: false,
      error: 'No active session'
    });
  }

  const allowedUpdates = [
    'activeFilters',
    'sortBy',
    'selectedItems',
    'draftContent',
    'taskContext'
  ];

  // Extract only allowed updates
  const updates = {};
  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No valid state updates provided',
      allowedFields: allowedUpdates
    });
  }

  await req.session.updateState(updates);

  res.json({
    success: true,
    message: 'Session state updated',
    updatedFields: Object.keys(updates),
    newState: {
      filters: req.session.currentState.activeFilters,
      sort: req.session.currentState.sortBy,
      taskContext: req.session.currentState.taskContext
    }
  });
});

/**
 * @desc    Get cached data from session
 * @route   GET /api/agent/session/cache
 * @access  Agent
 */
exports.getCachedData = asyncHandler(async (req, res) => {
  if (!req.session) {
    return res.status(404).json({
      success: false,
      error: 'No active session'
    });
  }

  const { type } = req.query;  // 'posts' or 'comments'

  if (type === 'posts') {
    res.json({
      success: true,
      cached: req.session.currentState.recentData.posts,
      count: req.session.currentState.recentData.posts.length
    });
  } else if (type === 'comments') {
    res.json({
      success: true,
      cached: req.session.currentState.recentData.comments,
      count: req.session.currentState.recentData.comments.length
    });
  } else {
    res.json({
      success: true,
      cached: {
        posts: req.session.currentState.recentData.posts.length,
        comments: req.session.currentState.recentData.comments.length
      }
    });
  }
});

/**
 * @desc    End current session
 * @route   POST /api/agent/session/end
 * @access  Agent
 */
exports.endSession = asyncHandler(async (req, res) => {
  if (!req.session) {
    return res.status(404).json({
      success: false,
      error: 'No active session'
    });
  }

  const sessionId = req.session.sessionId;
  const statistics = {
    totalActions: req.session.statistics.totalActions,
    successfulActions: req.session.statistics.successfulActions,
    failedActions: req.session.statistics.failedActions,
    duration: (new Date() - req.session.sessionStartedAt) / 1000
  };

  await req.session.endSession();

  res.json({
    success: true,
    message: 'Session ended successfully',
    sessionId,
    statistics: {
      ...statistics,
      durationFormatted: `${Math.floor(statistics.duration / 60)}m ${Math.floor(statistics.duration % 60)}s`,
      successRate: statistics.totalActions > 0
        ? `${(statistics.successfulActions / statistics.totalActions * 100).toFixed(1)}%`
        : 'N/A'
    }
  });
});

/**
 * @desc    Get all sessions for current agent
 * @route   GET /api/agent/sessions
 * @access  Agent
 */
exports.getAgentSessions = asyncHandler(async (req, res) => {
  const { limit = 10, active } = req.query;

  const query = { agentId: req.agent.id };
  if (active !== undefined) {
    query.sessionActive = active === 'true';
  }

  const sessions = await AgentSession.find(query)
    .sort({ lastActivityAt: -1 })
    .limit(parseInt(limit))
    .select('sessionId sessionStartedAt sessionEndedAt lastActivityAt sessionActive statistics taskContext');

  res.json({
    success: true,
    sessions: sessions.map(s => ({
      sessionId: s.sessionId,
      startedAt: s.sessionStartedAt,
      endedAt: s.sessionEndedAt,
      lastActivity: s.lastActivityAt,
      active: s.sessionActive,
      statistics: s.statistics,
      currentTask: s.taskContext.currentTask
    })),
    count: sessions.length
  });
});

/**
 * @desc    Get specific session by ID
 * @route   GET /api/agent/sessions/:sessionId
 * @access  Agent
 */
exports.getSessionById = asyncHandler(async (req, res) => {
  const session = await AgentSession.findOne({
    sessionId: req.params.sessionId,
    agentId: req.agent.id  // Ensure agent can only access their own sessions
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Session not found'
    });
  }

  res.json({
    success: true,
    session: {
      sessionId: session.sessionId,
      metadata: {
        startedAt: session.sessionStartedAt,
        endedAt: session.sessionEndedAt,
        lastActivity: session.lastActivityAt,
        active: session.sessionActive,
        expiresAt: session.expiresAt
      },
      currentState: session.currentState,
      actionHistory: session.actionHistory.slice(-50),  // Last 50 actions
      statistics: session.statistics,
      taskContext: session.taskContext
    }
  });
});

/**
 * @desc    Clear cached data from session
 * @route   DELETE /api/agent/session/cache
 * @access  Agent
 */
exports.clearCache = asyncHandler(async (req, res) => {
  if (!req.session) {
    return res.status(404).json({
      success: false,
      error: 'No active session'
    });
  }

  const { type } = req.query;

  if (type === 'posts') {
    req.session.currentState.recentData.posts = [];
  } else if (type === 'comments') {
    req.session.currentState.recentData.comments = [];
  } else {
    req.session.currentState.recentData.posts = [];
    req.session.currentState.recentData.comments = [];
  }

  await req.session.save();

  res.json({
    success: true,
    message: type ? `${type} cache cleared` : 'All cache cleared'
  });
});
