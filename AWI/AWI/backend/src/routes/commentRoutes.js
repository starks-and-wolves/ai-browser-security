const express = require('express');
const router = express.Router();
const {
  getCommentsByPost,
  getCommentById,
  createComment,
  updateComment,
  deleteComment
} = require('../controllers/commentController');

// Import validation middleware
const {
  createCommentValidation,
  updateCommentValidation,
  getCommentsByPostValidation
} = require('../middleware/validation/commentValidation');
const { handleValidationErrors } = require('../middleware/validation/validationHandler');
const { sanitizeHtmlMiddleware } = require('../middleware/sanitization/htmlSanitizer');
const { mongoIdValidation } = require('../middleware/validation/postValidation');

// Get comments for a post
router.get('/post/:postId',
  getCommentsByPostValidation,
  handleValidationErrors,
  getCommentsByPost
);

// Create comment
router.post('/',
  createCommentValidation,
  handleValidationErrors,
  sanitizeHtmlMiddleware(['content']),
  createComment
);

// Get, update, delete comment by ID
router.route('/:id')
  .get(
    mongoIdValidation,
    handleValidationErrors,
    getCommentById
  )
  .put(
    updateCommentValidation,
    handleValidationErrors,
    sanitizeHtmlMiddleware(['content']),
    updateComment
  )
  .delete(
    mongoIdValidation,
    handleValidationErrors,
    deleteComment
  );

module.exports = router;
