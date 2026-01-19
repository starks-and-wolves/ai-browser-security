/**
 * Sliding Window Rate Limiting Store
 *
 * In-memory implementation of sliding window log algorithm
 * Most accurate rate limiting - prevents burst attacks
 */

class SlidingWindowStore {
  constructor() {
    // Store structure: Map<agentId, Map<operation, Array<timestamp>>>
    this.store = new Map();

    // Cleanup interval (default: 60 seconds)
    this.cleanupInterval = null;
  }

  /**
   * Add a request to the log
   * @param {string} agentId - Agent ID
   * @param {string} operation - Operation name
   * @param {number} timestamp - Request timestamp (milliseconds)
   */
  addRequest(agentId, operation, timestamp = Date.now()) {
    if (!this.store.has(agentId)) {
      this.store.set(agentId, new Map());
    }

    const agentData = this.store.get(agentId);

    if (!agentData.has(operation)) {
      agentData.set(operation, []);
    }

    const requests = agentData.get(operation);
    requests.push(timestamp);
  }

  /**
   * Count requests in a time window
   * @param {string} agentId - Agent ID
   * @param {string} operation - Operation name
   * @param {number} windowMs - Window size in milliseconds
   * @returns {number} Number of requests in window
   */
  countInWindow(agentId, operation, windowMs) {
    if (!this.store.has(agentId)) {
      return 0;
    }

    const agentData = this.store.get(agentId);

    if (!agentData.has(operation)) {
      return 0;
    }

    const requests = agentData.get(operation);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Count requests within window
    return requests.filter(timestamp => timestamp >= windowStart).length;
  }

  /**
   * Check if request is allowed based on limits
   * @param {string} agentId - Agent ID
   * @param {string} operation - Operation name
   * @param {object} limits - Rate limits { hourly, minute, burst, cooldown }
   * @returns {object} { allowed: boolean, reason: string|null, retryAfter: number|null }
   */
  isAllowed(agentId, operation, limits) {
    const now = Date.now();

    // Check hourly limit
    const hourlyCount = this.countInWindow(agentId, operation, 60 * 60 * 1000);
    if (hourlyCount >= limits.hourly) {
      return {
        allowed: false,
        reason: 'hourly_limit_exceeded',
        retryAfter: this._calculateRetryAfter(agentId, operation, 60 * 60 * 1000)
      };
    }

    // Check minute limit
    const minuteCount = this.countInWindow(agentId, operation, 60 * 1000);
    if (minuteCount >= limits.minute) {
      return {
        allowed: false,
        reason: 'minute_limit_exceeded',
        retryAfter: this._calculateRetryAfter(agentId, operation, 60 * 1000)
      };
    }

    // Check burst limit (10 seconds)
    const burstCount = this.countInWindow(agentId, operation, 10 * 1000);
    if (burstCount >= limits.burst) {
      return {
        allowed: false,
        reason: 'burst_limit_exceeded',
        retryAfter: 10  // Wait 10 seconds
      };
    }

    // Check cooldown period (time between consecutive requests)
    if (limits.cooldown) {
      const lastRequest = this._getLastRequest(agentId, operation);
      if (lastRequest) {
        const timeSinceLastMs = now - lastRequest;
        const cooldownMs = limits.cooldown * 1000;

        if (timeSinceLastMs < cooldownMs) {
          return {
            allowed: false,
            reason: 'cooldown_period',
            retryAfter: Math.ceil((cooldownMs - timeSinceLastMs) / 1000)
          };
        }
      }
    }

    // All checks passed
    return {
      allowed: true,
      reason: null,
      retryAfter: null
    };
  }

  /**
   * Get the timestamp of the last request
   * @param {string} agentId - Agent ID
   * @param {string} operation - Operation name
   * @returns {number|null} Timestamp or null
   */
  _getLastRequest(agentId, operation) {
    if (!this.store.has(agentId)) {
      return null;
    }

    const agentData = this.store.get(agentId);

    if (!agentData.has(operation)) {
      return null;
    }

    const requests = agentData.get(operation);
    return requests.length > 0 ? requests[requests.length - 1] : null;
  }

  /**
   * Calculate retry-after seconds based on oldest request in window
   * @param {string} agentId - Agent ID
   * @param {string} operation - Operation name
   * @param {number} windowMs - Window size in milliseconds
   * @returns {number} Seconds until oldest request expires from window
   */
  _calculateRetryAfter(agentId, operation, windowMs) {
    if (!this.store.has(agentId)) {
      return 1;
    }

    const agentData = this.store.get(agentId);

    if (!agentData.has(operation)) {
      return 1;
    }

    const requests = agentData.get(operation);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Find oldest request in window
    const requestsInWindow = requests.filter(timestamp => timestamp >= windowStart);

    if (requestsInWindow.length === 0) {
      return 1;
    }

    const oldestRequest = Math.min(...requestsInWindow);
    const expiresAt = oldestRequest + windowMs;
    const retryAfterMs = expiresAt - now;

    return Math.max(1, Math.ceil(retryAfterMs / 1000));
  }

  /**
   * Clean up old entries from the store
   * Removes entries older than 1 hour to save memory
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000;  // 1 hour
    const cutoff = now - maxAge;

    for (const [agentId, agentData] of this.store.entries()) {
      for (const [operation, requests] of agentData.entries()) {
        // Filter out old requests
        const recentRequests = requests.filter(timestamp => timestamp >= cutoff);

        if (recentRequests.length === 0) {
          // No recent requests - remove operation
          agentData.delete(operation);
        } else {
          // Update with filtered requests
          agentData.set(operation, recentRequests);
        }
      }

      // If agent has no operations left, remove agent
      if (agentData.size === 0) {
        this.store.delete(agentId);
      }
    }
  }

  /**
   * Start automatic cleanup
   * @param {number} intervalMs - Cleanup interval in milliseconds (default: 60000)
   */
  startCleanup(intervalMs = 60000) {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, intervalMs);
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get current store statistics
   * @returns {object} Statistics
   */
  getStats() {
    let totalAgents = this.store.size;
    let totalOperations = 0;
    let totalRequests = 0;

    for (const agentData of this.store.values()) {
      totalOperations += agentData.size;

      for (const requests of agentData.values()) {
        totalRequests += requests.length;
      }
    }

    return {
      totalAgents,
      totalOperations,
      totalRequests
    };
  }

  /**
   * Clear all data (for testing)
   */
  clear() {
    this.store.clear();
  }
}

// Singleton instance
const slidingWindowStore = new SlidingWindowStore();

module.exports = slidingWindowStore;
