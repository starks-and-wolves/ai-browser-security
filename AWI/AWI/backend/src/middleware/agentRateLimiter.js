/**
 * Agent Rate Limiting Middleware
 *
 * Implements sliding window rate limiting for agent API requests
 * Applies reputation-based multipliers to rate limits
 */

const slidingWindowStore = require('../utils/slidingWindowStore');
const { getRateLimit, isRateLimitingEnabled } = require('../config/rateLimitConfig');
const AgentSecurityEvent = require('../models/AgentSecurityEvent');

// Start automatic cleanup
const { getCleanupInterval } = require('../config/rateLimitConfig');
slidingWindowStore.startCleanup(getCleanupInterval());

/**
 * Create rate limiting middleware for a specific operation
 * @param {string} operation - Operation name (e.g., 'list_posts', 'create_comment')
 * @returns {Function} Express middleware
 */
function agentRateLimiter(operation) {
  return async (req, res, next) => {
    // Skip if rate limiting is disabled
    if (!isRateLimitingEnabled()) {
      return next();
    }

    // Get agent from request (set by agentAuth middleware)
    const agent = req.agent;

    if (!agent) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        errorCode: 'AUTHENTICATION_REQUIRED'
      });
    }

    const agentId = agent._id.toString();
    const reputation = agent.reputation || 'normal';

    // Get rate limits for this operation and reputation
    const limits = getRateLimit(operation, reputation);

    // Check if request is allowed
    const { allowed, reason, retryAfter } = slidingWindowStore.isAllowed(
      agentId,
      operation,
      limits
    );

    if (!allowed) {
      // Log security event
      await AgentSecurityEvent.logEvent({
        agentId,
        eventType: 'rate_limit_exceeded',
        severity: 'medium',
        details: {
          operation,
          endpoint: req.path,
          method: req.method,
          reason,
          limits,
          reputation
        },
        actionTaken: 'blocked'
      });

      // Return 429 Too Many Requests
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        errorCode: 'RATE_LIMIT_EXCEEDED',
        details: {
          operation,
          reason: formatReason(reason),
          retryAfter,
          limits: {
            hourly: limits.hourly,
            minute: limits.minute,
            burst: limits.burst,
            cooldown: limits.cooldown
          },
          reputation,
          message: `You have exceeded the ${formatReason(reason)}. Please retry after ${retryAfter} seconds.`
        },
        retryAfter,
        timestamp: new Date().toISOString()
      });
    }

    // Request is allowed - add to store
    slidingWindowStore.addRequest(agentId, operation);

    // Record operation usage in agent model
    if (agent.recordOperationUsage) {
      try {
        await agent.recordOperationUsage(operation);
      } catch (err) {
        // Log error but don't fail the request
        console.error(`Failed to record operation usage for agent ${agentId}:`, err);
      }
    }

    // Continue to next middleware
    next();
  };
}

/**
 * Format rate limit reason for user-friendly message
 * @param {string} reason - Reason code
 * @returns {string} Human-readable reason
 */
function formatReason(reason) {
  const reasons = {
    'hourly_limit_exceeded': 'hourly rate limit',
    'minute_limit_exceeded': 'per-minute rate limit',
    'burst_limit_exceeded': 'burst protection limit',
    'cooldown_period': 'cooldown period'
  };

  return reasons[reason] || 'rate limit';
}

/**
 * Middleware to check if agent is suspended
 * Should be used after agentAuth and before rate limiter
 */
function checkSuspension(req, res, next) {
  const agent = req.agent;

  if (!agent) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      errorCode: 'AUTHENTICATION_REQUIRED'
    });
  }

  // Check if agent is suspended
  if (agent.isSuspended && agent.isSuspended()) {
    return res.status(403).json({
      success: false,
      error: 'Agent suspended',
      errorCode: 'AGENT_SUSPENDED',
      details: {
        suspended: true,
        suspendedUntil: agent.suspendedUntil,
        reason: agent.suspensionReason,
        message: agent.suspendedUntil
          ? `Your agent is suspended until ${agent.suspendedUntil.toISOString()}. Reason: ${agent.suspensionReason}`
          : `Your agent has been permanently suspended. Reason: ${agent.suspensionReason}`
      },
      timestamp: new Date().toISOString()
    });
  }

  next();
}

module.exports = {
  agentRateLimiter,
  checkSuspension
};
