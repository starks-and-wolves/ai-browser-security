/**
 * AWI Manifest Generator
 *
 * Dynamically generates the .well-known/llm-text manifest from configuration files
 */

const { RATE_LIMIT_DESCRIPTIONS } = require('../config/rateLimits');

/**
 * Generate rate limits section for AWI manifest
 * @returns {object} Rate limits configuration
 */
function generateRateLimitsSection() {
  return {
    status: 'enabled',
    implementation: 'express-rate-limit',
    active: {
      general_api: RATE_LIMIT_DESCRIPTIONS.simple.general_api,
      create_post: RATE_LIMIT_DESCRIPTIONS.simple.create_post,
      create_comment: RATE_LIMIT_DESCRIPTIONS.simple.create_comment,
      file_upload: RATE_LIMIT_DESCRIPTIONS.simple.file_upload,
      list_posts: RATE_LIMIT_DESCRIPTIONS.advanced.list_posts,
      get_post: RATE_LIMIT_DESCRIPTIONS.advanced.get_post,
      search: RATE_LIMIT_DESCRIPTIONS.advanced.search
    },
    burst_protection: {
      enabled: RATE_LIMIT_DESCRIPTIONS.burst_protection.enabled,
      window: RATE_LIMIT_DESCRIPTIONS.burst_protection.window,
      max_burst_requests: RATE_LIMIT_DESCRIPTIONS.burst_protection.max_burst_requests
    },
    cooldown: RATE_LIMIT_DESCRIPTIONS.cooldowns
  };
}

/**
 * Generate capabilities rate limits for AWI manifest
 * @returns {object} Capabilities rate limits
 */
function generateCapabilitiesRateLimits() {
  return {
    status: 'enabled',
    active_limits: {
      read_operations: '300/minute',
      write_operations: '5 per 10 seconds (30/minute)',
      post_creation: '5 per 10 seconds (30/minute)',
      search_operations: '20/minute'
    }
  };
}

/**
 * Generate security rate limiting section
 * @returns {object} Security rate limiting info
 */
function generateSecurityRateLimiting() {
  return {
    enabled: true,
    status: 'active',
    implementation: 'express-rate-limit with sliding window',
    details: {
      post_creation: RATE_LIMIT_DESCRIPTIONS.simple.create_post,
      burst_protection: RATE_LIMIT_DESCRIPTIONS.burst_protection.enabled,
      cooldown: `${RATE_LIMIT_DESCRIPTIONS.cooldowns.create_post} between posts`
    }
  };
}

module.exports = {
  generateRateLimitsSection,
  generateCapabilitiesRateLimits,
  generateSecurityRateLimiting
};
