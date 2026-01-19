const { body, param, query } = require('express-validator');

/**
 * Validation rules for creating a comment
 */
const createCommentValidation = [
  body('postId')
    .notEmpty().withMessage('Post ID is required')
    .isMongoId().withMessage('Invalid post ID format'),

  body('content')
    .trim()
    .notEmpty().withMessage('Comment content is required')
    .isLength({ min: 1, max: 1000 }).withMessage('Comment must be between 1 and 1000 characters'),
    // HTML sanitization handled separately

  body('authorName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Author name cannot exceed 100 characters')
    .matches(/^[a-zA-Z0-9\s._-]+$/).withMessage('Author name can only contain letters, numbers, spaces, dots, underscores, and hyphens')
    .escape()
];

/**
 * Validation rules for updating a comment
 */
const updateCommentValidation = [
  param('id')
    .isMongoId().withMessage('Invalid comment ID format'),

  body('content')
    .trim()
    .notEmpty().withMessage('Comment content is required')
    .isLength({ min: 1, max: 1000 }).withMessage('Comment must be between 1 and 1000 characters')
];

/**
 * Validation rules for getting comments by post
 */
const getCommentsByPostValidation = [
  param('postId')
    .isMongoId().withMessage('Invalid post ID format'),

  query('page')
    .optional()
    .isInt({ min: 1, max: 10000 }).withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt()
];

module.exports = {
  createCommentValidation,
  updateCommentValidation,
  getCommentsByPostValidation
};
