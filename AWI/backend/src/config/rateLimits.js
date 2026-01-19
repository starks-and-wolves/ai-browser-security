/**
 * Centralized Rate Limiting Configuration
 *
 * All rate limits are defined here and referenced throughout the application.
 * Modify these values to adjust rate limiting behavior globally.
 */

/**
 * Simple Rate Limits (for express-rate-limit middleware)
 * Used by: src/middleware/rateLimiter.js
 */
const SIMPLE_RATE_LIMITS = {
  // General API rate limiter
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later.'
    }
  },

  // Post creation rate limiter
  post: {
    windowMs: 10 * 1000, // 10 seconds
    max: 5,
    message: {
      success: false,
      error: 'Too many posts created from this IP, please try again in 10 seconds.'
    }
  },

  // Comment creation rate limiter
  comment: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: {
      success: false,
      error: 'Too many comments from this IP, please try again after an hour.'
    }
  },

  // File upload rate limiter
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 30,
    message: {
      success: false,
      error: 'Too many uploads from this IP, please try again after an hour.'
    }
  }
};

/**
 * Advanced Rate Limits (per-operation with burst protection)
 * Used by: src/config/rateLimitConfig.js, src/middleware/agentRateLimiter.js
 */
const OPERATION_RATE_LIMITS = {
  // Read operations - generous limits
  list_posts: {
    hourly: 3000,
    minute: 300,
    burst: 30,
    description: 'List all posts'
  },

  get_post: {
    hourly: 6000,
    minute: 450,
    burst: 60,
    description: 'Get single post details'
  },

  get_capabilities: {
    hourly: 1500,
    minute: 150,
    burst: 15,
    description: 'Get API capabilities'
  },

  // Write operations - more restrictive with cooldowns
  create_post: {
    hourly: 150,
    minute: 15,
    burst: 5,  // 5 requests per 10 seconds
    cooldown: 2,  // 2 seconds between posts (allows 5 in 10 seconds)
    description: 'Create new post'
  },

  update_post: {
    hourly: 300,
    minute: 30,
    burst: 9,
    cooldown: 5,  // 5 seconds between updates
    description: 'Update existing post'
  },

  create_comment: {
    hourly: 300,
    minute: 30,
    burst: 9,
    cooldown: 5,  // 5 seconds between comments
    description: 'Create new comment'
  },

  update_comment: {
    hourly: 600,
    minute: 60,
    burst: 15,
    cooldown: 3,  // 3 seconds between updates
    description: 'Update existing comment'
  },

  // Delete operations - very restrictive
  delete_post: {
    hourly: 60,
    minute: 6,
    burst: 3,
    cooldown: 30,  // 30 seconds between deletes
    description: 'Delete post'
  },

  delete_comment: {
    hourly: 150,
    minute: 15,
    burst: 6,
    cooldown: 10,  // 10 seconds between deletes
    description: 'Delete comment'
  },

  // Search operations - moderate limits
  search: {
    hourly: 600,
    minute: 60,
    burst: 15,
    cooldown: 3,  // 3 seconds between searches
    description: 'Search posts'
  },

  // Registration - very restrictive
  register: {
    hourly: 30,
    minute: 6,
    burst: 3,
    cooldown: 60,  // 1 minute between registrations
    description: 'Register new agent'
  }
};

/**
 * Reputation-based multipliers
 * Adjusts rate limits based on agent reputation
 */
const REPUTATION_MULTIPLIERS = {
  trusted: 2.0,      // Trusted agents get 2x limits
  normal: 1.0,       // Normal agents get standard limits
  suspicious: 0.5,   // Suspicious agents get half limits
  restricted: 0.1    // Restricted agents get 10% of limits
};

/**
 * Rate limit settings
 */
const RATE_LIMIT_SETTINGS = {
  enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
  cleanupInterval: parseInt(process.env.RATE_LIMIT_CLEANUP_INTERVAL, 10) || 60000  // Default: 60 seconds
};

/**
 * Human-readable rate limit descriptions for API documentation
 */
const RATE_LIMIT_DESCRIPTIONS = {
  simple: {
    general_api: '100 requests per 15 minutes',
    create_post: '5 requests per 10 seconds',
    create_comment: '20 requests per hour',
    file_upload: '30 requests per hour'
  },
  advanced: {
    list_posts: '3000/hour, 300/minute, 30 burst',
    get_post: '6000/hour, 450/minute, 60 burst',
    create_post: '150/hour, 15/minute, 5 burst (2s cooldown)',
    create_comment: '300/hour, 30/minute, 9 burst (5s cooldown)',
    search: '600/hour, 60/minute, 15 burst (3s cooldown)'
  },
  burst_protection: {
    enabled: true,
    window: '10 seconds',
    max_burst_requests: 5
  },
  cooldowns: {
    create_post: '2 seconds',
    update_post: '5 seconds',
    create_comment: '5 seconds',
    update_comment: '3 seconds',
    delete_post: '30 seconds',
    delete_comment: '10 seconds',
    search: '3 seconds',
    register: '60 seconds'
  }
};

module.exports = {
  SIMPLE_RATE_LIMITS,
  OPERATION_RATE_LIMITS,
  REPUTATION_MULTIPLIERS,
  RATE_LIMIT_SETTINGS,
  RATE_LIMIT_DESCRIPTIONS
};
