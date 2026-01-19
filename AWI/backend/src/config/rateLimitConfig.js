/**
 * Rate Limiting Configuration
 *
 * This file imports from the centralized rate limits configuration.
 * All rate limit values are defined in src/config/rateLimits.js
 */

const {
  OPERATION_RATE_LIMITS: RATE_LIMITS,
  REPUTATION_MULTIPLIERS,
  RATE_LIMIT_SETTINGS
} = require('./rateLimits');

/**
 * Get rate limit for an operation and reputation
 * @param {string} operation - Operation name
 * @param {string} reputation - Agent reputation (trusted/normal/suspicious/restricted)
 * @returns {object} Rate limit configuration with applied multiplier
 */
function getRateLimit(operation, reputation = 'normal') {
  const baseLimit = RATE_LIMITS[operation];

  if (!baseLimit) {
    // Unknown operation - use conservative defaults
    return {
      hourly: 100,
      minute: 10,
      burst: 3,
      cooldown: 5,
      description: 'Unknown operation'
    };
  }

  const multiplier = REPUTATION_MULTIPLIERS[reputation] || 1.0;

  return {
    hourly: Math.ceil(baseLimit.hourly * multiplier),
    minute: Math.ceil(baseLimit.minute * multiplier),
    burst: Math.ceil(baseLimit.burst * multiplier),
    cooldown: baseLimit.cooldown,  // Cooldown doesn't change with reputation
    description: baseLimit.description
  };
}

/**
 * Check if rate limiting is enabled
 * @returns {boolean}
 */
function isRateLimitingEnabled() {
  return RATE_LIMIT_SETTINGS.enabled;
}

/**
 * Get cleanup interval for in-memory store (milliseconds)
 * @returns {number}
 */
function getCleanupInterval() {
  return RATE_LIMIT_SETTINGS.cleanupInterval;
}

module.exports = {
  RATE_LIMITS,
  REPUTATION_MULTIPLIERS,
  getRateLimit,
  isRateLimitingEnabled,
  getCleanupInterval
};
