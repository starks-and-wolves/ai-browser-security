const mongoose = require('mongoose');

/**
 * AgentSession Model
 *
 * Implements server-side session state storage for AWI
 * Based on "Build the Web for Agents, not agents for the web" (arXiv:2506.10953v1)
 *
 * Key Principles:
 * - Tracks current state (route, filters, selections, cursor position)
 * - Maintains action history (trajectory trace)
 * - Enables incremental updates (diff-based)
 * - Validates action availability based on state
 */

const actionHistorySchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'list_posts', 'get_post', 'create_post', 'update_post', 'delete_post',
      'list_comments', 'create_comment', 'update_comment', 'delete_comment',
      'search', 'filter', 'sort', 'paginate',
      'session_start', 'session_end'
    ]
  },
  method: String,  // GET, POST, PUT, DELETE
  endpoint: String,  // /api/agent/posts
  parameters: mongoose.Schema.Types.Mixed,  // Query params, body data
  timestamp: {
    type: Date,
    default: Date.now
  },
  success: Boolean,
  statusCode: Number,
  errorMessage: String,
  stateSnapshot: mongoose.Schema.Types.Mixed,  // State before action
  observationSummary: String  // Brief summary of result for agent context
}, { _id: false });

const agentSessionSchema = new mongoose.Schema({
  // Session identification
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => `sess_${require('crypto').randomUUID().replace(/-/g, '')}`
  },

  // Agent reference
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgentApiKey',
    required: true,
    index: true
  },

  agentName: String,

  // Current state representation
  currentState: {
    // Navigation state
    currentRoute: {
      type: String,
      default: '/api/agent/posts'
    },
    currentPage: {
      type: Number,
      default: 1
    },

    // Filter state
    activeFilters: {
      search: String,
      tags: [String],
      category: String
    },

    // Sort state
    sortBy: {
      field: {
        type: String,
        enum: ['createdAt', 'updatedAt', 'title', 'viewCount'],
        default: 'createdAt'
      },
      order: {
        type: String,
        enum: ['asc', 'desc'],
        default: 'desc'
      }
    },

    // Pagination state
    pagination: {
      currentPage: {
        type: Number,
        default: 1
      },
      itemsPerPage: {
        type: Number,
        default: 10
      },
      totalItems: Number,
      totalPages: Number,
      hasNextPage: Boolean,
      hasPrevPage: Boolean
    },

    // Selection state (items currently in focus)
    selectedItems: {
      posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
      comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }]
    },

    // Viewing state (currently viewing item)
    currentlyViewing: {
      resourceType: {
        type: String,
        enum: ['post', 'comment', 'list', null]
      },
      resourceId: mongoose.Schema.Types.ObjectId
    },

    // Form state (temporary inputs)
    draftContent: {
      postDraft: {
        title: String,
        content: String,
        tags: [String],
        category: String
      },
      commentDraft: {
        content: String,
        postId: mongoose.Schema.Types.ObjectId
      }
    },

    // Cache of recently viewed data (structured representation, not DOM)
    recentData: {
      posts: [{
        _id: mongoose.Schema.Types.ObjectId,
        title: String,
        excerpt: String,  // First 200 chars
        createdAt: Date,
        tags: [String],
        category: String,
        cachedAt: Date
      }],
      comments: [{
        _id: mongoose.Schema.Types.ObjectId,
        postId: mongoose.Schema.Types.ObjectId,
        excerpt: String,
        createdAt: Date,
        cachedAt: Date
      }]
    }
  },

  // Available actions based on current state
  availableActions: [{
    action: String,
    method: String,
    endpoint: String,
    requiresPermission: String,
    enabled: {
      type: Boolean,
      default: true
    },
    disabledReason: String  // "No next page", "Cart empty", etc.
  }],

  // Action history (trajectory trace)
  actionHistory: [actionHistorySchema],

  // Task context
  taskContext: {
    currentTask: String,  // "Creating blog post", "Searching for content"
    taskGoal: String,
    taskStartedAt: Date,
    taskProgress: Number  // 0-100
  },

  // Session metadata
  sessionStartedAt: {
    type: Date,
    default: Date.now
  },

  lastActivityAt: {
    type: Date,
    default: Date.now
  },

  sessionActive: {
    type: Boolean,
    default: true
  },

  sessionEndedAt: Date,

  // Expiry settings
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)  // 24 hours
  },

  // Safety controls
  safetyConstraints: {
    requireHumanConfirmation: {
      type: Boolean,
      default: false
    },
    maxActionsPerSession: {
      type: Number,
      default: 1000
    },
    sensitiveActions: [String],  // Actions that need extra validation
    permissionLevel: {
      type: String,
      enum: ['read_only', 'standard', 'elevated'],
      default: 'standard'
    }
  },

  // Statistics
  statistics: {
    totalActions: {
      type: Number,
      default: 0
    },
    successfulActions: {
      type: Number,
      default: 0
    },
    failedActions: {
      type: Number,
      default: 0
    },
    averageActionTime: Number  // milliseconds
  }

}, {
  timestamps: true
});

// Indexes for performance
agentSessionSchema.index({ agentId: 1, sessionActive: 1 });
agentSessionSchema.index({ expiresAt: 1 });
agentSessionSchema.index({ lastActivityAt: 1 });

// Methods

/**
 * Update last activity timestamp
 */
agentSessionSchema.methods.touch = async function() {
  this.lastActivityAt = new Date();
  await this.save();
};

/**
 * Check if session is still valid
 */
agentSessionSchema.methods.isValid = function() {
  if (!this.sessionActive) return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;

  // Check if idle for too long (4 hours)
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
  if (this.lastActivityAt < fourHoursAgo) return false;

  return true;
};

/**
 * Record an action in the trajectory
 */
agentSessionSchema.methods.recordAction = async function(actionData) {
  // Add to action history
  this.actionHistory.push({
    action: actionData.action,
    method: actionData.method,
    endpoint: actionData.endpoint,
    parameters: actionData.parameters,
    timestamp: new Date(),
    success: actionData.success !== false,
    statusCode: actionData.statusCode,
    errorMessage: actionData.errorMessage,
    stateSnapshot: this.currentState,
    observationSummary: actionData.observationSummary
  });

  // Keep only last 100 actions to prevent unbounded growth
  if (this.actionHistory.length > 100) {
    this.actionHistory = this.actionHistory.slice(-100);
  }

  // Update statistics
  this.statistics.totalActions += 1;
  if (actionData.success !== false) {
    this.statistics.successfulActions += 1;
  } else {
    this.statistics.failedActions += 1;
  }

  this.lastActivityAt = new Date();
  await this.save();
};

/**
 * Update current state (incremental)
 */
agentSessionSchema.methods.updateState = async function(stateUpdates) {
  // Merge state updates (only update provided fields)
  Object.keys(stateUpdates).forEach(key => {
    if (this.currentState[key] && typeof this.currentState[key] === 'object') {
      // Deep merge for nested objects
      this.currentState[key] = {
        ...this.currentState[key],
        ...stateUpdates[key]
      };
    } else {
      this.currentState[key] = stateUpdates[key];
    }
  });

  this.markModified('currentState');
  await this.save();
};

/**
 * Calculate available actions based on current state
 */
agentSessionSchema.methods.calculateAvailableActions = function(agentPermissions) {
  const actions = [];

  // Navigation actions
  if (this.currentState.pagination.hasPrevPage) {
    actions.push({
      action: 'previous_page',
      method: 'GET',
      endpoint: `/api/agent/posts?page=${this.currentState.pagination.currentPage - 1}`,
      enabled: true
    });
  } else {
    actions.push({
      action: 'previous_page',
      method: 'GET',
      endpoint: '/api/agent/posts',
      enabled: false,
      disabledReason: 'Already on first page'
    });
  }

  if (this.currentState.pagination.hasNextPage) {
    actions.push({
      action: 'next_page',
      method: 'GET',
      endpoint: `/api/agent/posts?page=${this.currentState.pagination.currentPage + 1}`,
      enabled: true
    });
  } else {
    actions.push({
      action: 'next_page',
      method: 'GET',
      endpoint: '/api/agent/posts',
      enabled: false,
      disabledReason: 'Already on last page'
    });
  }

  // Write actions (only if agent has write permission)
  if (agentPermissions.includes('write')) {
    actions.push({
      action: 'create_post',
      method: 'POST',
      endpoint: '/api/agent/posts',
      requiresPermission: 'write',
      enabled: true
    });

    // If viewing a post, can add comment
    if (this.currentState.currentlyViewing.resourceType === 'post') {
      actions.push({
        action: 'create_comment',
        method: 'POST',
        endpoint: `/api/agent/posts/${this.currentState.currentlyViewing.resourceId}/comments`,
        requiresPermission: 'write',
        enabled: true
      });
    }
  }

  // Delete actions (only if agent has delete permission)
  if (agentPermissions.includes('delete') && this.currentState.selectedItems.posts.length > 0) {
    actions.push({
      action: 'delete_selected',
      method: 'DELETE',
      endpoint: `/api/agent/posts/${this.currentState.selectedItems.posts[0]}`,
      requiresPermission: 'delete',
      enabled: true
    });
  }

  this.availableActions = actions;
  return actions;
};

/**
 * Get state diff (for incremental updates)
 */
agentSessionSchema.methods.getStateDiff = function(previousState) {
  const diff = {};

  // Compare pagination
  if (JSON.stringify(this.currentState.pagination) !== JSON.stringify(previousState.pagination)) {
    diff.pagination = this.currentState.pagination;
  }

  // Compare filters
  if (JSON.stringify(this.currentState.activeFilters) !== JSON.stringify(previousState.activeFilters)) {
    diff.activeFilters = this.currentState.activeFilters;
  }

  // Compare current page
  if (this.currentState.currentPage !== previousState.currentPage) {
    diff.currentPage = this.currentState.currentPage;
  }

  // Compare viewing state
  if (JSON.stringify(this.currentState.currentlyViewing) !== JSON.stringify(previousState.currentlyViewing)) {
    diff.currentlyViewing = this.currentState.currentlyViewing;
  }

  return diff;
};

/**
 * End the session
 */
agentSessionSchema.methods.endSession = async function() {
  this.sessionActive = false;
  this.sessionEndedAt = new Date();
  await this.recordAction({
    action: 'session_end',
    method: 'POST',
    endpoint: '/api/agent/session/end',
    success: true,
    statusCode: 200,
    observationSummary: 'Session ended successfully'
  });
  await this.save();
};

// Static methods

/**
 * Find or create session for agent
 */
agentSessionSchema.statics.findOrCreateForAgent = async function(agentId, agentName) {
  // Try to find active session
  let session = await this.findOne({
    agentId,
    sessionActive: true,
    expiresAt: { $gt: new Date() }
  }).sort({ lastActivityAt: -1 });

  // If session expired or doesn't exist, create new one
  if (!session || !session.isValid()) {
    session = await this.create({
      agentId,
      agentName,
      sessionStartedAt: new Date(),
      lastActivityAt: new Date()
    });

    // Record session start
    await session.recordAction({
      action: 'session_start',
      method: 'POST',
      endpoint: '/api/agent/session/start',
      success: true,
      statusCode: 200,
      observationSummary: 'New session started'
    });
  }

  return session;
};

/**
 * Cleanup expired sessions (for cron job)
 */
agentSessionSchema.statics.cleanupExpiredSessions = async function() {
  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

  const result = await this.updateMany(
    {
      sessionActive: true,
      $or: [
        { expiresAt: { $lt: now } },
        { lastActivityAt: { $lt: fourHoursAgo } }
      ]
    },
    {
      $set: {
        sessionActive: false,
        sessionEndedAt: now
      }
    }
  );

  return result.modifiedCount;
};

const AgentSession = mongoose.model('AgentSession', agentSessionSchema);

module.exports = AgentSession;
