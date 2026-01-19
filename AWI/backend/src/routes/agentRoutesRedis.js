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

// Redis-based session state middleware
const {
  loadRedisSession,
  recordRedisAction,
  enrichResponseWithRedisState
} = require('../middleware/redisSessionState');

// Redis session state controllers
const {
  getSessionState,
  getActionHistory,
  getStateDiff,
  endSession,
  getCacheInfo
} = require('../controllers/redisSessionController');

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

// Discovery & registration (no auth required)
router.get('/capabilities', getCapabilities);
router.post('/register', registerAgent);

// Read operations (with Redis session)
router.get('/posts',
  agentAuth,
  loadRedisSession,                // Load Redis session
  sanitizeQueryParams,
  getPostsValidation,
  handleAgentValidationErrors,
  recordRedisAction('list_posts'), // Record action in Redis
  enrichResponseWithRedisState,    // Add session state to response
  getPostsForAgent
);

router.get('/posts/:id',
  agentAuth,
  loadRedisSession,
  recordRedisAction('get_post'),
  enrichResponseWithRedisState,
  getPostForAgent
);

// Write operations (with Redis session)
router.post('/posts',
  agentAuth,
  loadRedisSession,
  requirePermission('write'),
  agentCreatePostValidation,
  handleAgentValidationErrors,
  sanitizePlainTextMiddleware(['title', 'authorName']),
  sanitizeHtmlMiddleware(['content']),
  recordRedisAction('create_post'),
  enrichResponseWithRedisState,
  createPostForAgent
);

router.get('/posts/:postId/comments',
  agentAuth,
  loadRedisSession,
  recordRedisAction('list_comments'),
  enrichResponseWithRedisState,
  getCommentsForAgent
);

router.post('/posts/:postId/comments',
  agentAuth,
  loadRedisSession,
  requirePermission('write'),
  agentCreateCommentValidation,
  handleAgentValidationErrors,
  sanitizeHtmlMiddleware(['content']),
  recordRedisAction('create_comment'),
  enrichResponseWithRedisState,
  createCommentForAgent
);

router.post('/search',
  agentAuth,
  loadRedisSession,
  agentSearchValidation,
  handleAgentValidationErrors,
  recordRedisAction('search'),
  enrichResponseWithRedisState,
  searchForAgent
);

// Redis session state endpoints
router.get('/session/state',
  agentAuth,
  loadRedisSession,
  getSessionState
);

router.get('/session/history',
  agentAuth,
  loadRedisSession,
  getActionHistory
);

router.get('/session/diff',
  agentAuth,
  loadRedisSession,
  getStateDiff
);

router.post('/session/end',
  agentAuth,
  loadRedisSession,
  endSession
);

router.get('/session/cache',
  agentAuth,
  loadRedisSession,
  getCacheInfo
);

module.exports = router;
