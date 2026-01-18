const { body, param, query } = require('express-validator');

/**
 * Validation rules for creating a post
 */
const createPostValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters')
    .matches(/^[a-zA-Z0-9\s.,!?'"()-]+$/).withMessage('Title contains invalid characters')
    .escape(), // Escape HTML entities

  body('content')
    .trim()
    .notEmpty().withMessage('Content is required')
    .isLength({ min: 10, max: 50000 }).withMessage('Content must be between 10 and 50000 characters'),
    // Note: HTML sanitization happens in separate middleware

  body('authorName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Author name cannot exceed 100 characters')
    .matches(/^[a-zA-Z0-9\s._-]+$/).withMessage('Author name can only contain letters, numbers, spaces, dots, underscores, and hyphens')
    .escape(),

  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array')
    .custom((tags) => {
      if (tags.length > 10) {
        throw new Error('Maximum 10 tags allowed');
      }
      return true;
    }),

  body('tags.*')
    .trim()
    .isLength({ min: 2, max: 30 }).withMessage('Each tag must be between 2 and 30 characters')
    .matches(/^[a-z0-9-]+$/).withMessage('Tags can only contain lowercase letters, numbers, and hyphens')
    .toLowerCase(),

  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Category cannot exceed 50 characters')
    .matches(/^[a-zA-Z0-9\s-]+$/).withMessage('Category can only contain letters, numbers, spaces, and hyphens'),

  body('mediaFiles')
    .optional()
    .isArray().withMessage('Media files must be an array')
    .custom((files) => {
      if (files && files.length > 20) {
        throw new Error('Maximum 20 media files allowed');
      }
      return true;
    })
];

/**
 * Validation rules for updating a post
 */
const updatePostValidation = [
  param('id')
    .isMongoId().withMessage('Invalid post ID format'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters')
    .matches(/^[a-zA-Z0-9\s.,!?'"()-]+$/).withMessage('Title contains invalid characters')
    .escape(),

  body('content')
    .optional()
    .trim()
    .isLength({ min: 10, max: 50000 }).withMessage('Content must be between 10 and 50000 characters'),

  body('authorName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Author name cannot exceed 100 characters')
    .matches(/^[a-zA-Z0-9\s._-]+$/).withMessage('Author name can only contain letters, numbers, spaces, dots, underscores, and hyphens')
    .escape(),

  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array')
    .custom((tags) => {
      if (tags && tags.length > 10) {
        throw new Error('Maximum 10 tags allowed');
      }
      return true;
    }),

  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 2, max: 30 }).withMessage('Each tag must be between 2 and 30 characters')
    .matches(/^[a-z0-9-]+$/).withMessage('Tags can only contain lowercase letters, numbers, and hyphens')
    .toLowerCase(),

  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Category cannot exceed 50 characters')
    .matches(/^[a-zA-Z0-9\s-]+$/).withMessage('Category can only contain letters, numbers, spaces, and hyphens')
];

/**
 * Validation rules for getting posts (query parameters)
 */
const getPostsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 10000 }).withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Search query too long')
    .matches(/^[a-zA-Z0-9\s.,!?'"()-]+$/).withMessage('Search contains invalid characters'),

  query('tag')
    .optional()
    .trim()
    .isLength({ min: 2, max: 30 }).withMessage('Tag must be between 2 and 30 characters')
    .matches(/^[a-z0-9-]+$/).withMessage('Tag can only contain lowercase letters, numbers, and hyphens')
    .toLowerCase(),

  query('category')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Category too long')
    .matches(/^[a-zA-Z0-9\s-]+$/).withMessage('Category can only contain letters, numbers, spaces, and hyphens')
];

/**
 * Validation for MongoDB ObjectId parameters
 */
const mongoIdValidation = [
  param('id')
    .isMongoId().withMessage('Invalid ID format')
    .custom((value) => {
      // Explicitly block path traversal attempts
      if (value.includes('..') || value.includes('/') || value.includes('\\')) {
        throw new Error('Path traversal not allowed');
      }
      return true;
    })
];

const slugValidation = [
  param('slug')
    .trim()
    .isLength({ min: 3, max: 250 }).withMessage('Invalid slug length')
    .matches(/^[a-z0-9-]+$/).withMessage('Slug can only contain lowercase letters, numbers, and hyphens')
    .custom((value) => {
      // Explicitly block path traversal attempts
      if (value.includes('..') || value.includes('/') || value.includes('\\')) {
        throw new Error('Path traversal not allowed');
      }
      return true;
    })
];

module.exports = {
  createPostValidation,
  updatePostValidation,
  getPostsValidation,
  mongoIdValidation,
  slugValidation
};
