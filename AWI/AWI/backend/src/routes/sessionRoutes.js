const express = require('express');
const router = express.Router();
const { agentAuth } = require('../middleware/agentAuth');
const { loadSession } = require('../middleware/sessionState');
const {
  getSessionState,
  getActionHistory,
  getStateDiff,
  updateSessionState,
  getCachedData,
  endSession,
  getAgentSessions,
  getSessionById,
  clearCache
} = require('../controllers/sessionController');

/**
 * Session Management Routes
 *
 * Implements AWI state query APIs
 * All routes require authentication
 */

// All session routes require authentication and session loading
router.use(agentAuth);
router.use(loadSession);

/**
 * @swagger
 * /api/agent/session/state:
 *   get:
 *     summary: Get current session state
 *     description: Returns complete current state snapshot
 *     tags: [Session State]
 *     security:
 *       - AgentApiKey: []
 *     responses:
 *       200:
 *         description: Current session state
 */
router.get('/state', getSessionState);

/**
 * @swagger
 * /api/agent/session/state:
 *   post:
 *     summary: Update session state
 *     description: Manually update filters, selections, or task context
 *     tags: [Session State]
 *     security:
 *       - AgentApiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               activeFilters:
 *                 type: object
 *               sortBy:
 *                 type: object
 *               taskContext:
 *                 type: object
 *     responses:
 *       200:
 *         description: State updated
 */
router.post('/state', updateSessionState);

/**
 * @swagger
 * /api/agent/session/history:
 *   get:
 *     summary: Get action history (trajectory trace)
 *     description: Returns sequence of actions performed in session
 *     tags: [Session State]
 *     security:
 *       - AgentApiKey: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of recent actions to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset from most recent
 *     responses:
 *       200:
 *         description: Action history
 */
router.get('/history', getActionHistory);

/**
 * @swagger
 * /api/agent/session/diff:
 *   get:
 *     summary: Get state diff since last action
 *     description: Returns only changed parts of state (incremental update)
 *     tags: [Session State]
 *     security:
 *       - AgentApiKey: []
 *     responses:
 *       200:
 *         description: State differences
 */
router.get('/diff', getStateDiff);

/**
 * @swagger
 * /api/agent/session/cache:
 *   get:
 *     summary: Get cached data
 *     description: Retrieve recently viewed posts/comments from session cache
 *     tags: [Session State]
 *     security:
 *       - AgentApiKey: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [posts, comments]
 *         description: Type of cached data
 *     responses:
 *       200:
 *         description: Cached data
 */
router.get('/cache', getCachedData);

/**
 * @swagger
 * /api/agent/session/cache:
 *   delete:
 *     summary: Clear cached data
 *     description: Clear posts/comments cache
 *     tags: [Session State]
 *     security:
 *       - AgentApiKey: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [posts, comments]
 *     responses:
 *       200:
 *         description: Cache cleared
 */
router.delete('/cache', clearCache);

/**
 * @swagger
 * /api/agent/session/end:
 *   post:
 *     summary: End current session
 *     description: Gracefully terminate session and return statistics
 *     tags: [Session State]
 *     security:
 *       - AgentApiKey: []
 *     responses:
 *       200:
 *         description: Session ended
 */
router.post('/end', endSession);

/**
 * @swagger
 * /api/agent/sessions:
 *   get:
 *     summary: Get all sessions for agent
 *     description: List historical sessions
 *     tags: [Session State]
 *     security:
 *       - AgentApiKey: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of sessions
 */
router.get('s', getAgentSessions);  // /api/agent/sessions

/**
 * @swagger
 * /api/agent/sessions/{sessionId}:
 *   get:
 *     summary: Get specific session by ID
 *     description: Retrieve complete session details
 *     tags: [Session State]
 *     security:
 *       - AgentApiKey: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session details
 */
router.get('s/:sessionId', getSessionById);  // /api/agent/sessions/:sessionId

module.exports = router;
