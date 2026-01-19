const mongoose = require('mongoose');
const crypto = require('crypto');

const agentApiKeySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: () => `agent_${crypto.randomUUID().replace(/-/g, '')}`
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  active: {
    type: Boolean,
    default: true
  },
  permissions: [{
    type: String,
    enum: ['read', 'write', 'delete'],
    default: ['read']
  }],
  rateLimit: {
    requestsPerHour: {
      type: Number,
      default: 1000
    }
  },
  usage: {
    totalRequests: {
      type: Number,
      default: 0
    },
    lastUsed: Date
  },
  metadata: {
    agentType: String,
    version: String,
    framework: String
  },
  expiresAt: Date,

  // Security and reputation tracking
  reputation: {
    type: String,
    enum: ['trusted', 'normal', 'suspicious', 'restricted'],
    default: 'normal'
  },
  reputationScore: {
    type: Number,
    default: 50,  // Start at neutral (0-100 scale)
    min: 0,
    max: 100
  },
  securityMetrics: {
    totalViolations: {
      type: Number,
      default: 0
    },
    violationsByType: {
      type: Map,
      of: Number,
      default: {}
    },
    lastViolation: Date,
    suspensionHistory: [{
      suspendedAt: Date,
      suspendedUntil: Date,
      reason: String,
      resolvedAt: Date
    }]
  },

  // Suspension tracking
  suspended: {
    type: Boolean,
    default: false,
    index: true
  },
  suspendedUntil: Date,
  suspensionReason: String,

  // Per-operation usage tracking
  operationUsage: {
    type: Map,
    of: Number,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for faster lookups
agentApiKeySchema.index({ key: 1 });
agentApiKeySchema.index({ active: 1 });
agentApiKeySchema.index({ reputation: 1 });
agentApiKeySchema.index({ suspended: 1 });
agentApiKeySchema.index({ 'securityMetrics.totalViolations': -1 });

// Method to check if key is valid
agentApiKeySchema.methods.isValid = function() {
  if (!this.active) return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  return true;
};

// Method to increment usage
agentApiKeySchema.methods.incrementUsage = async function() {
  this.usage.totalRequests += 1;
  this.usage.lastUsed = new Date();
  await this.save();
};

// Method to check if agent is currently suspended
agentApiKeySchema.methods.isSuspended = function() {
  if (!this.suspended) return false;
  if (this.suspendedUntil && this.suspendedUntil < new Date()) {
    // Suspension period expired
    return false;
  }
  return true;
};

// Method to record a security violation
agentApiKeySchema.methods.recordViolation = async function(type, severity) {
  // Increment total violations
  this.securityMetrics.totalViolations += 1;

  // Track by type
  const currentCount = this.securityMetrics.violationsByType.get(type) || 0;
  this.securityMetrics.violationsByType.set(type, currentCount + 1);

  // Update last violation timestamp
  this.securityMetrics.lastViolation = new Date();

  // Adjust reputation score based on severity
  const scoreImpact = {
    low: -2,
    medium: -5,
    high: -10,
    critical: -20
  };

  this.reputationScore = Math.max(0, this.reputationScore + (scoreImpact[severity] || -5));

  // Update reputation tier
  if (this.reputationScore >= 80) {
    this.reputation = 'trusted';
  } else if (this.reputationScore >= 40) {
    this.reputation = 'normal';
  } else if (this.reputationScore >= 20) {
    this.reputation = 'suspicious';
  } else {
    this.reputation = 'restricted';
  }

  await this.save();
};

// Method to suspend the agent
agentApiKeySchema.methods.suspend = async function(reason, durationMinutes = null) {
  this.suspended = true;
  this.suspensionReason = reason;

  if (durationMinutes) {
    this.suspendedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
  }

  // Add to suspension history
  this.securityMetrics.suspensionHistory.push({
    suspendedAt: new Date(),
    suspendedUntil: this.suspendedUntil,
    reason: reason
  });

  await this.save();
};

// Method to record operation usage
agentApiKeySchema.methods.recordOperationUsage = async function(operation) {
  const currentCount = this.operationUsage.get(operation) || 0;
  this.operationUsage.set(operation, currentCount + 1);
  await this.save();
};

const AgentApiKey = mongoose.model('AgentApiKey', agentApiKeySchema);

module.exports = AgentApiKey;
