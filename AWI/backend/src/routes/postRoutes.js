const express = require('express');
const router = express.Router();
const {
  getPosts,
  getPostById,
  getPostBySlug,
  createPost,
  updatePost,
  deletePost,
  incrementViewCount,
  getAllTags,
  getAllCategories
} = require('../controllers/postController');

// Import validation middleware
const {
  createPostValidation,
  updatePostValidation,
  getPostsValidation,
  mongoIdValidation,
  slugValidation
} = require('../middleware/validation/postValidation');
const { handleValidationErrors } = require('../middleware/validation/validationHandler');
const { sanitizeQueryParams } = require('../middleware/sanitization/querySanitizer');
const {
  sanitizeHtmlMiddleware,
  sanitizePlainTextMiddleware
} = require('../middleware/sanitization/htmlSanitizer');

// Get all tags and categories (must be before /:id to avoid conflicts)
router.get('/tags/all', getAllTags);
router.get('/categories/all', getAllCategories);

// Get post by slug (must be before /:id to avoid conflicts)
router.get('/slug/:slug',
  slugValidation,
  handleValidationErrors,
  getPostBySlug
);

// Main post routes
router.route('/')
  .get(
    sanitizeQueryParams,
    getPostsValidation,
    handleValidationErrors,
    getPosts
  )
  .post(
    createPostValidation,
    handleValidationErrors,
    sanitizePlainTextMiddleware(['title', 'authorName']),
    sanitizeHtmlMiddleware(['content']),
    createPost
  );

router.route('/:id')
  .get(
    mongoIdValidation,
    handleValidationErrors,
    getPostById
  )
  .put(
    updatePostValidation,
    handleValidationErrors,
    sanitizePlainTextMiddleware(['title', 'authorName']),
    sanitizeHtmlMiddleware(['content']),
    updatePost
  )
  .delete(
    mongoIdValidation,
    handleValidationErrors,
    deletePost
  );

// Increment view count
router.post('/:id/view',
  mongoIdValidation,
  handleValidationErrors,
  incrementViewCount
);

module.exports = router;
