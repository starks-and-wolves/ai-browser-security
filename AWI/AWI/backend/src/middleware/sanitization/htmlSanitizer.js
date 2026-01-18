const sanitizeHtml = require('sanitize-html');

/**
 * Configuration for sanitizing HTML content
 * Allows safe formatting tags but strips scripts, events, and dangerous attributes
 */
const sanitizeOptions = {
  allowedTags: [
    // Text formatting
    'p', 'br', 'strong', 'em', 'u', 's', 'del', 'ins', 'mark', 'small',
    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Lists
    'ul', 'ol', 'li',
    // Links
    'a',
    // Blockquotes and code
    'blockquote', 'code', 'pre',
    // Tables
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    // Divisions
    'div', 'span'
  ],
  allowedAttributes: {
    'a': ['href', 'title', 'rel'],
    'blockquote': ['cite'],
    'div': ['class'],
    'span': ['class'],
    'code': ['class']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    a: ['http', 'https', 'mailto']
  },
  allowedClasses: {
    'code': ['language-*', 'lang-*'],
    'div': ['highlight', 'code-block'],
    'span': ['highlight']
  },
  // Disallow all dangerous attributes
  allowedIframeHostnames: [], // No iframes
  allowedIframeDomains: [],
  // Strip all event handlers
  allowedScriptHostnames: [],
  // Transform relative URLs to absolute (optional)
  transformTags: {
    'a': sanitizeHtml.simpleTransform('a', {
      rel: 'noopener noreferrer' // Security: prevent window.opener attacks
    })
  },
  // Remove empty tags
  exclusiveFilter: function(frame) {
    return frame.tag === 'div' && !frame.text.trim();
  }
};

/**
 * Sanitize HTML content - strips dangerous tags and attributes
 * @param {string} html - Raw HTML input
 * @returns {string} - Sanitized safe HTML
 */
function sanitizeContent(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }
  return sanitizeHtml(html, sanitizeOptions);
}

/**
 * Sanitize plain text - more restrictive, converts HTML entities
 * Use for titles, author names, tags
 * @param {string} text - Raw text input
 * @returns {string} - Sanitized plain text
 */
function sanitizePlainText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  // Strip ALL HTML tags and decode entities
  return sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {},
    textFilter: function(text) {
      // Additional cleanup for plain text
      return text.replace(/[<>]/g, '');
    }
  });
}

/**
 * Middleware to sanitize HTML in request body
 * Apply after express-validator
 */
function sanitizeHtmlMiddleware(fields = ['content']) {
  return (req, res, next) => {
    fields.forEach(field => {
      if (req.body[field]) {
        req.body[field] = sanitizeContent(req.body[field]);
      }
    });
    next();
  };
}

/**
 * Middleware to sanitize plain text fields
 */
function sanitizePlainTextMiddleware(fields = ['title', 'authorName']) {
  return (req, res, next) => {
    fields.forEach(field => {
      if (req.body[field]) {
        req.body[field] = sanitizePlainText(req.body[field]);
      }
    });
    next();
  };
}

module.exports = {
  sanitizeContent,
  sanitizePlainText,
  sanitizeHtmlMiddleware,
  sanitizePlainTextMiddleware,
  sanitizeOptions
};
