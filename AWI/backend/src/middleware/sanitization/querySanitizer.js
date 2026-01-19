/**
 * MongoDB Query Sanitization
 * Prevents NoSQL injection by removing MongoDB operators from user input
 */

/**
 * List of dangerous MongoDB operators to filter
 */
const dangerousOperators = [
  '$where', '$regex', '$expr', '$jsonSchema', '$function',
  '$accumulator', '$addToSet', '$cond', '$map', '$reduce',
  '$ne', '$gt', '$lt', '$gte', '$lte', '$in', '$nin'
];

/**
 * Recursively sanitize object to remove MongoDB operators
 * @param {any} obj - Object to sanitize
 * @returns {any} - Sanitized object
 */
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  // Handle objects - remove keys starting with $
  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // Skip keys starting with $ (MongoDB operators)
      if (key.startsWith('$')) {
        continue;
      }
      // Skip __proto__ to prevent prototype pollution
      if (key === '__proto__') {
        continue;
      }
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }
  return sanitized;
}

/**
 * Sanitize search query string to prevent injection
 * @param {string} query - Search query
 * @returns {string} - Sanitized query
 */
function sanitizeSearchQuery(query) {
  if (!query || typeof query !== 'string') {
    return '';
  }

  // Remove MongoDB operators from search string
  let sanitized = query.replace(/\$\w+/g, '');

  // Remove special regex characters that could be used for injection
  sanitized = sanitized.replace(/[{}[\]\\]/g, '');

  // Limit length
  sanitized = sanitized.substring(0, 200);

  // Trim whitespace
  return sanitized.trim();
}

/**
 * Middleware to sanitize query parameters
 * Prevents NoSQL injection in URL parameters
 */
function sanitizeQueryParams(req, res, next) {
  if (req.query) {
    // FIRST: Remove all MongoDB operators from query object
    // This prevents attacks like search[$ne]=null or search[$regex]=.*
    req.query = sanitizeObject(req.query);

    // THEN: Apply specific sanitization to known parameters

    // Sanitize search query
    if (req.query.search) {
      // Handle both string and (already sanitized) object cases
      if (typeof req.query.search === 'string') {
        req.query.search = sanitizeSearchQuery(req.query.search);
      } else {
        // If it's still an object after sanitizeObject, convert to empty string
        req.query.search = '';
      }
    }

    // Sanitize tag filter
    if (req.query.tag) {
      req.query.tag = String(req.query.tag).toLowerCase().replace(/[^a-z0-9-_]/g, '');
    }

    // Sanitize category filter
    if (req.query.category) {
      req.query.category = String(req.query.category).replace(/[^a-zA-Z0-9\s-_]/g, '');
    }

    // Ensure pagination params are integers with bounds checking
    if (req.query.page !== undefined) {
      // If it's an object (after sanitization), remove it
      if (typeof req.query.page === 'object') {
        delete req.query.page;
      } else {
        const page = parseInt(req.query.page, 10);
        // Reject negative or invalid values, delete the param
        if (isNaN(page) || page < 1) {
          delete req.query.page;
        } else {
          req.query.page = Math.min(page, 10000); // Cap at 10000
        }
      }
    }

    if (req.query.limit !== undefined) {
      // If it's an object (after sanitization), remove it
      if (typeof req.query.limit === 'object') {
        delete req.query.limit;
      } else {
        const limit = parseInt(req.query.limit, 10);
        // Enforce bounds: min 1, max 100, delete if invalid
        if (isNaN(limit) || limit < 1) {
          delete req.query.limit;
        } else {
          req.query.limit = Math.min(limit, 100);
        }
      }
    }
  }

  next();
}

/**
 * Middleware to sanitize request body
 * Prevents NoSQL injection in POST/PUT bodies
 */
function sanitizeRequestBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

/**
 * Validate MongoDB ObjectId format
 * @param {string} id - ID to validate
 * @returns {boolean} - True if valid ObjectId
 */
function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

module.exports = {
  sanitizeObject,
  sanitizeSearchQuery,
  sanitizeQueryParams,
  sanitizeRequestBody,
  isValidObjectId
};
