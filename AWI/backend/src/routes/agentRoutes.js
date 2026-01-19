const express = require('express');
const router = express.Router();
const { agentAuth, requirePermission } = require('../middleware/agentAuth');
const {
  getCapabilities,
  getPostsForAgent,
  getPostForAgent,
  createPostForAgent,
  getCommentsForAgent,
  createCommentForAgent,
  searchForAgent,
  registerAgent
} = require('../controllers/agentController');

// Import validation middleware
const {
  agentCreatePostValidation,
  agentCreateCommentValidation,
  agentSearchValidation
} = require('../middleware/validation/agentValidation');
const { getPostsValidation } = require('../middleware/validation/postValidation');
const { handleAgentValidationErrors } = require('../middleware/validation/validationHandler');
const { sanitizeQueryParams } = require('../middleware/sanitization/querySanitizer');
const {
  sanitizeHtmlMiddleware,
  sanitizePlainTextMiddleware
} = require('../middleware/sanitization/htmlSanitizer');

// Import session state middleware
const {
  loadSession,
  recordAction,
  enrichResponseWithState
} = require('../middleware/sessionState');

// Import Phase 2 security middleware
const { agentRateLimiter } = require('../middleware/agentRateLimiter');
const contentSecurityAnalyzer = require('../middleware/contentSecurityAnalyzer');
const { auditLogger } = require('../middleware/auditLogger');

/**
 * @swagger
 * /api/agent/capabilities:
 *   get:
 *     summary: Get agent capabilities and available operations
 *     description: Returns a list of all available operations, their parameters, and requirements. No authentication needed.
 *     tags: [Agent Discovery]
 *     responses:
 *       200:
 *         description: Capabilities information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 capabilities:
 *                   type: object
 */
router.get('/capabilities', getCapabilities);

/**
 * @swagger
 * /api/agent/register:
 *   post:
 *     summary: Register a new agent and get API key
 *     description: Creates a new agent identity and returns an API key for authentication
 *     tags: [Agent Registration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Agent name
 *               description:
 *                 type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [read, write, delete]
 *               agentType:
 *                 type: string
 *               framework:
 *                 type: string
 *     responses:
 *       201:
 *         description: Agent registered successfully
 */
router.post('/register', registerAgent);

/**
 * @swagger
 * /api/agent/posts:
 *   get:
 *     summary: List all blog posts (agent-optimized)
 *     description: Returns paginated list of posts with semantic metadata
 *     tags: [Agent Posts]
 *     security:
 *       - AgentApiKey: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: List of posts
 */
router.get('/posts',
  agentAuth,
  loadSession,
  agentRateLimiter('list_posts'),
  auditLogger('list_posts'),
  sanitizeQueryParams,
  getPostsValidation,
  handleAgentValidationErrors,
  recordAction('list_posts'),
  enrichResponseWithState,
  getPostsForAgent
);

/**
 * @swagger
 * /api/agent/posts/{id}:
 *   get:
 *     summary: Get a single post by ID
 *     tags: [Agent Posts]
 *     security:
 *       - AgentApiKey: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post details
 *       404:
 *         description: Post not found
 */
router.get('/posts/:id',
  agentAuth,
  loadSession,
  agentRateLimiter('get_post'),
  auditLogger('get_post'),
  recordAction('get_post'),
  enrichResponseWithState,
  getPostForAgent
);

/**
 * @swagger
 * /api/agent/posts:
 *   post:
 *     summary: Create a new blog post
 *     tags: [Agent Posts]
 *     security:
 *       - AgentApiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               authorName:
 *                 type: string
 *               category:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Post created
 */
router.post('/posts',
  agentAuth,
  loadSession,
  requirePermission('write'),
  agentRateLimiter('create_post'),
  contentSecurityAnalyzer,
  auditLogger('create_post'),
  agentCreatePostValidation,
  handleAgentValidationErrors,
  sanitizePlainTextMiddleware(['title', 'authorName']),
  sanitizeHtmlMiddleware(['content']),
  recordAction('create_post'),
  enrichResponseWithState,
  createPostForAgent
);

/**
 * @swagger
 * /api/agent/posts/{postId}/comments:
 *   get:
 *     summary: Get comments for a post
 *     tags: [Agent Comments]
 *     security:
 *       - AgentApiKey: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of comments
 */
router.get('/posts/:postId/comments',
  agentAuth,
  loadSession,
  agentRateLimiter('get_post'),
  auditLogger('list_comments'),
  recordAction('list_comments'),
  enrichResponseWithState,
  getCommentsForAgent
);

/**
 * @swagger
 * /api/agent/posts/{postId}/comments:
 *   post:
 *     summary: Add a comment to a post
 *     tags: [Agent Comments]
 *     security:
 *       - AgentApiKey: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *               authorName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment created
 */
router.post('/posts/:postId/comments',
  agentAuth,
  loadSession,
  requirePermission('write'),
  agentRateLimiter('create_comment'),
  contentSecurityAnalyzer,
  auditLogger('create_comment'),
  agentCreateCommentValidation,
  handleAgentValidationErrors,
  sanitizeHtmlMiddleware(['content']),
  recordAction('create_comment'),
  enrichResponseWithState,
  createCommentForAgent
);

/**
 * @swagger
 * /api/agent/search:
 *   post:
 *     summary: Advanced natural language search
 *     tags: [Agent Search]
 *     security:
 *       - AgentApiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *               intent:
 *                 type: string
 *               filters:
 *                 type: object
 *     responses:
 *       200:
 *         description: Search results
 */
router.post('/search',
  agentAuth,
  loadSession,
  agentRateLimiter('search'),
  contentSecurityAnalyzer,
  auditLogger('search'),
  agentSearchValidation,
  handleAgentValidationErrors,
  recordAction('search'),
  enrichResponseWithState,
  searchForAgent
);

module.exports = router;
