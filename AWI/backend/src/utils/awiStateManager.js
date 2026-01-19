/**
 * AWI State Manager
 *
 * Implements the full AWI state specification with:
 * - Redis-based primary storage
 * - Diff-based updates
 * - Progressive information transfer
 * - Efficient caching
 * - State synchronization
 *
 * Based on AWI paper principles:
 * - Universal state tracking (Section 3.1)
 * - Optimal representations (Section 3.2)
 * - Efficient hosting (Section 3.3)
 */

const { redis, KEYS, TTL } = require('../config/redis');
const crypto = require('crypto');

class AWIStateManager {
  /**
   * Initialize a new AWI session state
   */
  static async initializeSession(agentId, agentName, initialUrl = '/') {
    const sessionId = `sess_${crypto.randomUUID().replace(/-/g, '')}`;

    const initialState = {
      session_id: sessionId,
      agent_id: agentId,
      agent_name: agentName,
      user_id: null,

      current_url: initialUrl,

      page_state: {
        route: initialUrl,
        metadata: {
          title: '',
          breadcrumbs: []
        },
        visible_items: [],
        pagination: {
          cursor: 1,
          total_pages: 1,
          page_size: 10,
          total_items: 0
        },
        filters: {},
        sort: {
          key: 'createdAt',
          order: 'desc'
        }
      },

      action_state: {
        available_actions: ['list_posts', 'search'],
        disabled_actions: ['next_page', 'prev_page']
      },

      history: {
        actions: [
          {
            t: 0,
            action: 'session_start',
            input: {},
            delta: {},
            timestamp: new Date().toISOString()
          }
        ],
        last_action: null
      },

      permissions: {
        can_view_sensitive_info: false,
        can_make_financial_actions: false,
        requires_user_confirmation: []
      },

      media_cache: {
        images: {}
      },

      query_cache: {
        // Cache key → result mapping
        active_cache_key: null,
        cached_results: []
      },

      statistics: {
        total_actions: 0,
        successful_actions: 0,
        failed_actions: 0,
        session_start: new Date().toISOString(),
        last_activity: new Date().toISOString()
      },

      last_updated: new Date().toISOString()
    };

    // Store in Redis with TTL
    await redis.setex(
      KEYS.SESSION(sessionId),
      TTL.SESSION,
      JSON.stringify(initialState)
    );

    // Map agent to session
    await redis.setex(
      KEYS.AGENT_SESSION(agentId),
      TTL.SESSION,
      sessionId
    );

    return { sessionId, state: initialState };
  }

  /**
   * Get current session state
   */
  static async getSessionState(sessionId) {
    const stateJson = await redis.get(KEYS.SESSION(sessionId));

    if (!stateJson) {
      return null;
    }

    return JSON.parse(stateJson);
  }

  /**
   * Find active session for agent
   */
  static async findSessionForAgent(agentId) {
    const sessionId = await redis.get(KEYS.AGENT_SESSION(agentId));

    if (!sessionId) {
      return null;
    }

    const state = await this.getSessionState(sessionId);
    return state;
  }

  /**
   * Update session state with delta (diff-based)
   *
   * This implements the AWI paper's requirement for efficient state updates
   */
  static async updateStateWithDelta(sessionId, delta, actionInfo = {}) {
    // Get current state
    const currentState = await this.getSessionState(sessionId);

    if (!currentState) {
      throw new Error('Session not found');
    }

    // Apply delta using deep merge
    const newState = this._deepMerge(currentState, delta);

    // Add action to history
    const actionRecord = {
      t: currentState.history.actions.length,
      action: actionInfo.action || 'update',
      input: actionInfo.input || {},
      delta: delta,
      timestamp: new Date().toISOString(),
      success: actionInfo.success !== false,
      observation: actionInfo.observation
    };

    newState.history.actions.push(actionRecord);
    newState.history.last_action = actionRecord;

    // Keep only last 100 actions to prevent unbounded growth
    if (newState.history.actions.length > 100) {
      newState.history.actions = newState.history.actions.slice(-100);
    }

    // Update statistics
    newState.statistics.total_actions += 1;
    if (actionInfo.success !== false) {
      newState.statistics.successful_actions += 1;
    } else {
      newState.statistics.failed_actions += 1;
    }
    newState.statistics.last_activity = new Date().toISOString();

    // Update timestamp
    newState.last_updated = new Date().toISOString();

    // Save back to Redis with TTL refresh
    await redis.setex(
      KEYS.SESSION(sessionId),
      TTL.SESSION,
      JSON.stringify(newState)
    );

    // Store diff temporarily for /session/diff endpoint
    await redis.setex(
      KEYS.STATE_DIFF(sessionId),
      TTL.STATE_DIFF,
      JSON.stringify({ delta, action: actionRecord })
    );

    return newState;
  }

  /**
   * Get state diff (incremental update)
   */
  static async getStateDiff(sessionId) {
    const diffJson = await redis.get(KEYS.STATE_DIFF(sessionId));

    if (!diffJson) {
      return {
        success: false,
        message: 'No recent state changes'
      };
    }

    const diff = JSON.parse(diffJson);

    return {
      success: true,
      delta: diff.delta,
      last_action: diff.action,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Update page state (common operation)
   */
  static async updatePageState(sessionId, pageUpdates) {
    const delta = {
      page_state: pageUpdates,
      current_url: pageUpdates.route || undefined
    };

    return await this.updateStateWithDelta(sessionId, delta, {
      action: 'page_update',
      input: pageUpdates
    });
  }

  /**
   * Update pagination
   */
  static async updatePagination(sessionId, paginationData) {
    const delta = {
      page_state: {
        pagination: paginationData
      }
    };

    // Calculate available actions based on pagination
    const availableActions = ['list_posts', 'search'];
    const disabledActions = [];

    if (paginationData.cursor > 1) {
      availableActions.push('prev_page');
    } else {
      disabledActions.push('prev_page');
    }

    if (paginationData.cursor < paginationData.total_pages) {
      availableActions.push('next_page');
    } else {
      disabledActions.push('next_page');
    }

    delta.action_state = {
      available_actions: availableActions,
      disabled_actions: disabledActions
    };

    return await this.updateStateWithDelta(sessionId, delta, {
      action: 'pagination_update',
      input: paginationData
    });
  }

  /**
   * Cache query results (for efficient pagination)
   */
  static async cacheQueryResults(sessionId, filters, sort, results) {
    // Generate cache key from filters + sort
    const cacheKey = this._generateCacheKey(filters, sort);

    // Store results in Redis
    await redis.setex(
      KEYS.LIST_CACHE(cacheKey),
      TTL.LIST_CACHE,
      JSON.stringify(results)
    );

    // Update session state with cache reference
    const delta = {
      query_cache: {
        active_cache_key: cacheKey,
        cached_at: new Date().toISOString()
      }
    };

    await this.updateStateWithDelta(sessionId, delta, {
      action: 'cache_query_results',
      input: { filters, sort, result_count: results.length }
    });

    return cacheKey;
  }

  /**
   * Get cached query results
   */
  static async getCachedQueryResults(cacheKey) {
    const resultsJson = await redis.get(KEYS.LIST_CACHE(cacheKey));

    if (!resultsJson) {
      return null;
    }

    return JSON.parse(resultsJson);
  }

  /**
   * Check if query results are cached
   */
  static async hasValidCache(filters, sort) {
    const cacheKey = this._generateCacheKey(filters, sort);
    const exists = await redis.exists(KEYS.LIST_CACHE(cacheKey));
    return exists === 1 ? cacheKey : null;
  }

  /**
   * Touch session (refresh TTL)
   */
  static async touchSession(sessionId) {
    const state = await this.getSessionState(sessionId);

    if (!state) {
      return false;
    }

    // Update last activity
    state.statistics.last_activity = new Date().toISOString();

    // Refresh TTL
    await redis.setex(
      KEYS.SESSION(sessionId),
      TTL.SESSION,
      JSON.stringify(state)
    );

    return true;
  }

  /**
   * End session
   */
  static async endSession(sessionId) {
    const state = await this.getSessionState(sessionId);

    if (!state) {
      return null;
    }

    // Add end action to history
    const endAction = {
      t: state.history.actions.length,
      action: 'session_end',
      input: {},
      delta: {},
      timestamp: new Date().toISOString()
    };

    state.history.actions.push(endAction);
    state.statistics.session_end = new Date().toISOString();

    // Calculate session duration
    const duration = new Date(state.statistics.session_end) - new Date(state.statistics.session_start);
    state.statistics.duration_ms = duration;

    // Remove from Redis (it's now ended)
    await redis.del(KEYS.SESSION(sessionId));
    await redis.del(KEYS.AGENT_SESSION(state.agent_id));
    await redis.del(KEYS.STATE_DIFF(sessionId));

    // Return final state for archival in MongoDB
    return state;
  }

  /**
   * Get action history
   */
  static async getActionHistory(sessionId, limit = 20, offset = 0) {
    const state = await this.getSessionState(sessionId);

    if (!state) {
      return null;
    }

    const actions = state.history.actions;
    const total = actions.length;
    const trajectory = actions.slice(Math.max(0, total - offset - limit), total - offset);

    return {
      success: true,
      sessionId: sessionId,
      trajectory: trajectory.reverse(),
      total: total,
      limit: limit,
      offset: offset
    };
  }

  /**
   * Deep merge objects (for delta application)
   */
  static _deepMerge(target, source) {
    const output = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (target[key]) {
          output[key] = this._deepMerge(target[key], source[key]);
        } else {
          output[key] = source[key];
        }
      } else {
        output[key] = source[key];
      }
    }

    return output;
  }

  /**
   * Generate cache key from filters and sort
   */
  static _generateCacheKey(filters, sort) {
    const filterStr = JSON.stringify(filters || {});
    const sortStr = JSON.stringify(sort || {});
    const combined = `${filterStr}:${sortStr}`;

    return crypto.createHash('md5').update(combined).digest('hex');
  }
}

module.exports = AWIStateManager;
