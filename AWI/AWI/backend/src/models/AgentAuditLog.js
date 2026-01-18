/**
 * Agent Audit Log Model
 *
 * Tracks all agent API operations for security monitoring and forensics
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const agentAuditLogSchema = new mongoose.Schema({
  // Agent identification
  agentId: {
    type: String,
    required: true,
    index: true
  },
  agentName: {
    type: String,
    required: true
  },

  // Operation details
  operation: {
    type: String,
    required: true,
    enum: ['list_posts', 'get_post', 'create_post', 'update_post', 'delete_post',
           'create_comment', 'update_comment', 'delete_comment',
           'search', 'get_capabilities', 'register'],
    index: true
  },
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  },
  endpoint: {
    type: String,
    required: true
  },

  // Request data (sanitized for logging)
  requestData: {
    params: mongoose.Schema.Types.Mixed,
    query: mongoose.Schema.Types.Mixed,
    // Body is sanitized - sensitive fields removed
    body: mongoose.Schema.Types.Mixed
  },

  // Content hash for duplicate detection
  contentHash: {
    type: String,
    index: true
  },

  // Request metadata
  ipAddress: String,
  userAgent: String,

  // Response data
  statusCode: {
    type: Number,
    required: true
  },
  success: {
    type: Boolean,
    required: true
  },
  errorCode: String,

  // Security analysis results
  securityAnalysis: {
    threats: [{
      type: {
        type: String,
        enum: ['xss', 'nosql_injection', 'prompt_injection', 'path_traversal',
               'command_injection', 'high_entropy', 'suspicious_pattern']
      },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high']
      },
      pattern: String,
      location: String
    }],
    threatScore: {
      type: Number,
      default: 0,
      index: true
    },
    flaggedForReview: {
      type: Boolean,
      default: false
    }
  },

  // Performance metrics
  responseTimeMs: Number,

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
agentAuditLogSchema.index({ agentId: 1, timestamp: -1 });
agentAuditLogSchema.index({ operation: 1, timestamp: -1 });
agentAuditLogSchema.index({ 'securityAnalysis.threatScore': -1 });

// Static method to create audit log entry
agentAuditLogSchema.statics.logOperation = async function(data) {
  // Generate content hash if content is provided
  let contentHash = null;
  if (data.requestData && data.requestData.body && data.requestData.body.content) {
    contentHash = crypto
      .createHash('sha256')
      .update(data.requestData.body.content)
      .digest('hex');
  }

  const entry = new this({
    ...data,
    contentHash,
    timestamp: new Date()
  });

  return await entry.save();
};

// Static method to get agent statistics
agentAuditLogSchema.statics.getAgentStats = async function(agentId, since) {
  const query = { agentId };
  if (since) {
    query.timestamp = { $gte: since };
  }

  const logs = await this.find(query);

  return {
    totalActions: logs.length,
    successfulActions: logs.filter(log => log.success).length,
    failedActions: logs.filter(log => !log.success).length,
    averageThreatScore: logs.reduce((sum, log) => sum + (log.securityAnalysis.threatScore || 0), 0) / logs.length || 0,
    flaggedActions: logs.filter(log => log.securityAnalysis.flaggedForReview).length,
    operationBreakdown: logs.reduce((acc, log) => {
      acc[log.operation] = (acc[log.operation] || 0) + 1;
      return acc;
    }, {})
  };
};

const AgentAuditLog = mongoose.model('AgentAuditLog', agentAuditLogSchema);

module.exports = AgentAuditLog;
