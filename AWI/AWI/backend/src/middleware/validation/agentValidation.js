const { body, param, query } = require('express-validator');

/**
 * Enhanced validation for agent-created posts
 * More restrictive to prevent prompt injection
 */
const agentCreatePostValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters')
    // More restrictive pattern for agent content
    .matches(/^[a-zA-Z0-9\s.,!?'"()-]+$/).withMessage('Title contains invalid characters')
    .escape()
    // Additional check for prompt injection patterns
    .custom((value) => {
      const dangerousPatterns = [
        /ignore\s+(previous|above|all)\s+instructions?/i,
        /system\s*prompt/i,
        /you\s+are\s+now/i,
        /new\s+instructions?:/i,
        /disregard/i,
        /<\s*script/i,
        /javascript:/i
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(value)) {
          throw new Error('Content contains potentially malicious patterns');
        }
      }
      return true;
    }),

  body('content')
    .trim()
    .notEmpty().withMessage('Content is required')
    .isLength({ min: 10, max: 50000 }).withMessage('Content must be between 10 and 50000 characters')
    // Check for prompt injection and XSS in content
    .custom((value) => {
      const dangerousPatterns = [
        // Prompt injection patterns
        /ignore\s+(all\s+)?(previous|above|all|any)\s+(instructions?|prompts?|commands?)/i,
        /system\s*prompt/i,
        /you\s+are\s+now/i,
        /new\s+instructions?:/i,
        /disregard\s+(all|previous|any|the)/i,

        // XSS patterns
        /<\s*script/i,
        /<\s*iframe/i,
        /<\s*svg[\s>]/i,
        /<\s*embed/i,
        /<\s*object/i,
        /javascript:/i,
        /data:text\/html/i,

        // Event handlers (common XSS vectors)
        /on\s*error\s*=/i,
        /on\s*load\s*=/i,
        /on\s*click\s*=/i,
        /on\s*mouse/i,
        /on\s*focus/i,
        /on\s*blur/i,
        /on\s*change/i,
        /on\s*submit/i,
        /on\s*key/i,

        // Command injection patterns
        /[`$]\(/,  // Backticks and $() for command substitution
        /;\s*(rm|cat|ls|curl|wget|bash|sh|eval)/i
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(value)) {
          throw new Error('Content contains potentially malicious patterns');
        }
      }
      return true;
    }),

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
    .matches(/^[a-zA-Z0-9\s-]+$/).withMessage('Category can only contain letters, numbers, spaces, and hyphens')
];

/**
 * Validation for agent comments (more restrictive)
 */
const agentCreateCommentValidation = [
  body('content')
    .trim()
    .notEmpty().withMessage('Comment content is required')
    .isLength({ min: 1, max: 1000 }).withMessage('Comment must be between 1 and 1000 characters')
    .custom((value) => {
      const dangerousPatterns = [
        // Prompt injection patterns
        /ignore\s+(all\s+)?(previous|above|all|any)\s+(instructions?|prompts?|commands?)/i,
        /system\s*prompt/i,
        /you\s+are\s+now/i,
        /new\s+instructions?:/i,
        /disregard\s+(all|previous|any|the)/i,

        // XSS patterns
        /<\s*script/i,
        /<\s*iframe/i,
        /<\s*svg[\s>]/i,
        /<\s*embed/i,
        /<\s*object/i,
        /javascript:/i,
        /data:text\/html/i,

        // Event handlers
        /on\s*error\s*=/i,
        /on\s*load\s*=/i,
        /on\s*click\s*=/i,
        /on\s*mouse/i,
        /on\s*focus/i,
        /on\s*blur/i,

        // Command injection
        /[`$]\(/,
        /;\s*(rm|cat|ls|curl|wget|bash|sh|eval)/i
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(value)) {
          throw new Error('Comment contains potentially malicious patterns');
        }
      }
      return true;
    }),

  body('authorName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Author name cannot exceed 100 characters')
    .matches(/^[a-zA-Z0-9\s._-]+$/).withMessage('Author name contains invalid characters')
    .escape()
];

/**
 * Validation for agent search requests
 * Extra strict to prevent injection
 */
const agentSearchValidation = [
  body('query')
    .trim()
    .notEmpty().withMessage('Search query is required')
    .isLength({ min: 1, max: 200 }).withMessage('Query must be between 1 and 200 characters')
    .matches(/^[a-zA-Z0-9\s.,!?'"()-]+$/).withMessage('Query contains invalid characters')
    .custom((value) => {
      // Prevent MongoDB operators in search
      if (/\$\w+/.test(value)) {
        throw new Error('Query contains invalid characters');
      }
      return true;
    }),

  body('intent')
    .optional()
    .isIn(['search', 'filter', 'find', 'list', 'query']).withMessage('Invalid intent value'),

  body('filters')
    .optional()
    .isObject().withMessage('Filters must be an object'),

  body('filters.tags')
    .optional()
    .isArray().withMessage('Tags filter must be an array'),

  body('filters.tags.*')
    .trim()
    .matches(/^[a-z0-9-]+$/).withMessage('Invalid tag format')
    .toLowerCase(),

  body('filters.category')
    .optional()
    .trim()
    .matches(/^[a-zA-Z0-9\s-]+$/).withMessage('Invalid category format'),

  body('filters.limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
    .toInt()
];

module.exports = {
  agentCreatePostValidation,
  agentCreateCommentValidation,
  agentSearchValidation
};
