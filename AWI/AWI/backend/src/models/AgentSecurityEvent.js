/**
 * Agent Security Event Model
 *
 * Tracks security incidents and policy violations by agents
 */

const mongoose = require('mongoose');

const agentSecurityEventSchema = new mongoose.Schema({
  // Agent identification
  agentId: {
    type: String,
    required: true,
    index: true
  },

  // Event details
  eventType: {
    type: String,
    required: true,
    enum: [
      'rate_limit_exceeded',
      'content_blocked',
      'content_flagged',
      'pattern_detected',
      'behavioral_anomaly',
      'permission_violation',
      'authentication_failure',
      'suspicious_activity'
    ],
    index: true
  },

  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    index: true
  },

  // Detailed information
  details: {
    operation: String,
    endpoint: String,
    method: String,
    threatScore: Number,
    patterns: [String],
    description: String,
    affectedFields: [String],
    metadata: mongoose.Schema.Types.Mixed
  },

  // Action taken
  actionTaken: {
    type: String,
    required: true,
    enum: ['none', 'logged', 'flagged', 'blocked', 'suspended'],
    default: 'logged'
  },

  // Resolution tracking
  resolved: {
    type: Boolean,
    default: false,
    index: true
  },
  resolvedAt: Date,
  resolvedBy: String,
  resolution: String,

  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false  // Using custom timestamp field
});

// Compound indexes for common queries
agentSecurityEventSchema.index({ agentId: 1, severity: 1, timestamp: -1 });
agentSecurityEventSchema.index({ eventType: 1, resolved: 1 });

// Static method to log security event
agentSecurityEventSchema.statics.logEvent = async function(data) {
  const event = new this({
    ...data,
    timestamp: new Date()
  });

  return await event.save();
};

// Static method to get unresolved events for an agent
agentSecurityEventSchema.statics.getUnresolvedEvents = async function(agentId) {
  return await this.find({
    agentId,
    resolved: false
  }).sort({ timestamp: -1 });
};

// Static method to get critical events
agentSecurityEventSchema.statics.getCriticalEvents = async function(since) {
  const query = {
    severity: { $in: ['high', 'critical'] },
    resolved: false
  };

  if (since) {
    query.timestamp = { $gte: since };
  }

  return await this.find(query).sort({ timestamp: -1 });
};

// Instance method to resolve event
agentSecurityEventSchema.methods.resolve = async function(resolvedBy, resolution) {
  this.resolved = true;
  this.resolvedAt = new Date();
  this.resolvedBy = resolvedBy;
  this.resolution = resolution;
  return await this.save();
};

const AgentSecurityEvent = mongoose.model('AgentSecurityEvent', agentSecurityEventSchema);

module.exports = AgentSecurityEvent;
