/**
 * Redis Session State Controller
 *
 * Endpoints for querying AWI session state stored in Redis:
 * - GET /api/agent/session/state - Get current state snapshot
 * - GET /api/agent/session/history - Get action trajectory
 * - GET /api/agent/session/diff - Get incremental state updates
 * - POST /api/agent/session/end - End session and archive to MongoDB
 */

const AWIStateManager = require('../utils/awiStateManager');
const { archiveSessionToMongoDB } = require('../middleware/redisSessionState');
const asyncHandler = require('express-async-handler');

/**
 * GET /api/agent/session/state
 * Get current session state snapshot
 */
exports.getSessionState = asyncHandler(async (req, res) => {
  if (!req.sessionId) {
    return res.status(404).json({
      success: false,
      error: 'No active session found'
    });
  }

  const state = await AWIStateManager.getSessionState(req.sessionId);

  if (!state) {
    return res.status(404).json({
      success: false,
      error: 'Session not found'
    });
  }

  res.json({
    success: true,
    sessionId: state.session_id,
    currentState: {
      route: state.page_state.route,
      pagination: state.page_state.pagination,
      filters: state.page_state.filters,
      sort: state.page_state.sort,
      visibleItems: state.page_state.visible_items.length,
      metadata: state.page_state.metadata
    },
    actionState: {
      available: state.action_state.available_actions,
      disabled: state.action_state.disabled_actions
    },
    statistics: {
      totalActions: state.statistics.total_actions,
      successfulActions: state.statistics.successful_actions,
      failedActions: state.statistics.failed_actions,
      sessionDuration: new Date() - new Date(state.statistics.session_start),
      lastActivity: state.statistics.last_activity
    },
    cacheInfo: {
      activeCacheKey: state.query_cache.active_cache_key,
      cachedAt: state.query_cache.cached_at
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/agent/session/history
 * Get action history (trajectory trace)
 */
exports.getActionHistory = asyncHandler(async (req, res) => {
  if (!req.sessionId) {
    return res.status(404).json({
      success: false,
      error: 'No active session found'
    });
  }

  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;

  const history = await AWIStateManager.getActionHistory(req.sessionId, limit, offset);

  if (!history) {
    return res.status(404).json({
      success: false,
      error: 'Session not found'
    });
  }

  res.json(history);
});

/**
 * GET /api/agent/session/diff
 * Get state diff since last action (incremental update)
 */
exports.getStateDiff = asyncHandler(async (req, res) => {
  if (!req.sessionId) {
    return res.status(404).json({
      success: false,
      error: 'No active session found'
    });
  }

  const diff = await AWIStateManager.getStateDiff(req.sessionId);

  res.json(diff);
});

/**
 * POST /api/agent/session/end
 * End current session and archive to MongoDB
 */
exports.endSession = asyncHandler(async (req, res) => {
  if (!req.sessionId) {
    return res.status(404).json({
      success: false,
      error: 'No active session found'
    });
  }

  // Archive to MongoDB (this also removes from Redis)
  await archiveSessionToMongoDB(req.sessionId);

  res.json({
    success: true,
    message: 'Session ended successfully',
    sessionId: req.sessionId,
    archivedToMongoDB: true,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/agent/session/cache
 * Get cached query results (for debugging)
 */
exports.getCacheInfo = asyncHandler(async (req, res) => {
  if (!req.sessionId) {
    return res.status(404).json({
      success: false,
      error: 'No active session found'
    });
  }

  const state = await AWIStateManager.getSessionState(req.sessionId);

  if (!state) {
    return res.status(404).json({
      success: false,
      error: 'Session not found'
    });
  }

  const cacheKey = state.query_cache.active_cache_key;

  if (!cacheKey) {
    return res.json({
      success: true,
      cached: false,
      message: 'No active cache'
    });
  }

  const cachedResults = await AWIStateManager.getCachedQueryResults(cacheKey);

  res.json({
    success: true,
    cached: true,
    cacheKey: cacheKey,
    cachedAt: state.query_cache.cached_at,
    resultCount: cachedResults ? cachedResults.length : 0,
    results: cachedResults ? cachedResults.slice(0, 5) : []  // Preview only
  });
});
