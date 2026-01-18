/**
 * Redis Configuration for AWI State Storage
 *
 * Primary session store for:
 * - Active AWI sessions
 * - Fast state updates
 * - Diff calculations
 * - List/query result caching
 * - Media reference caching
 *
 * Based on AWI paper Section 3.1-3.3 requirements:
 * - Efficient hosting
 * - Agent queue support
 * - Progressive information transfer
 */

const Redis = require('ioredis');

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,

  // Connection pool settings
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },

  // Reconnection settings
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },

  // Performance settings
  enableReadyCheck: true,
  enableOfflineQueue: true,

  // Timeouts
  connectTimeout: 10000,
  commandTimeout: 5000
};

// Create Redis client
const redis = new Redis(redisConfig);

// Redis event handlers
redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('ready', () => {
  console.log('✅ Redis ready');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

redis.on('close', () => {
  console.log('⚠️  Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

// Redis key prefixes (namespacing)
const KEYS = {
  // AWI Session State (primary)
  SESSION: (sessionId) => `AWI:SESSION:${sessionId}`,

  // Cached list results (filtered/sorted product lists)
  LIST_CACHE: (cacheKey) => `AWI:CACHE:LIST:${cacheKey}`,

  // Media cache (image metadata, embeddings)
  MEDIA_IMAGE: (imageId) => `MEDIA:IMG:${imageId}`,
  MEDIA_EMBED: (embedKey) => `MEDIA:EMBED:${embedKey}`,

  // Agent API key to session mapping
  AGENT_SESSION: (agentId) => `AGENT:SESSION:${agentId}`,

  // Session locks (for concurrency control)
  SESSION_LOCK: (sessionId) => `LOCK:SESSION:${sessionId}`,

  // Rate limiting keys
  RATE_LIMIT: (agentId, operation) => `RATELIMIT:${agentId}:${operation}`,

  // Temporary state diffs (for incremental updates)
  STATE_DIFF: (sessionId) => `AWI:DIFF:${sessionId}`
};

// Default TTLs (in seconds)
const TTL = {
  SESSION: 30 * 60,        // 30 minutes for active sessions
  LIST_CACHE: 5 * 60,      // 5 minutes for cached lists
  MEDIA_CACHE: 60 * 60,    // 1 hour for media metadata
  LOCK: 30,                // 30 seconds for locks
  RATE_LIMIT: 60 * 60,     // 1 hour for rate limit windows
  STATE_DIFF: 5 * 60       // 5 minutes for state diffs
};

/**
 * Create a new Redis client (for pub/sub or separate connections)
 */
function createRedisClient() {
  return new Redis(redisConfig);
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  console.log('Shutting down Redis connections...');
  await redis.quit();
  console.log('✅ Redis connections closed');
}

module.exports = {
  redis,
  KEYS,
  TTL,
  createRedisClient,
  shutdown
};
