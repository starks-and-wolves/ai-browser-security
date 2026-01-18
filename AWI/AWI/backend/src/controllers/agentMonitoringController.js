/**
 * Agent Monitoring Controller
 *
 * Provides admin dashboard APIs for monitoring agent activity,
 * security events, and managing agent reputations
 */

const AgentApiKey = require('../models/AgentApiKey');
const AgentAuditLog = require('../models/AgentAuditLog');
const AgentSecurityEvent = require('../models/AgentSecurityEvent');
const slidingWindowStore = require('../utils/slidingWindowStore');
const contentSecurityAnalyzer = require('../middleware/contentSecurityAnalyzer');

/**
 * Get dashboard statistics
 * GET /api/admin/dashboard/stats
 */
async function getDashboardStats(req, res) {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Agent statistics
    const totalAgents = await AgentApiKey.countDocuments();
    const activeAgents = await AgentApiKey.countDocuments({ active: true });
    const suspendedAgents = await AgentApiKey.countDocuments({ suspended: true });

    // Reputation breakdown
    const reputationStats = await AgentApiKey.aggregate([
      {
        $group: {
          _id: '$reputation',
          count: { $sum: 1 }
        }
      }
    ]);

    // Request statistics (last 24 hours)
    const requestsLast24h = await AgentAuditLog.countDocuments({
      timestamp: { $gte: last24Hours }
    });

    const successfulRequests24h = await AgentAuditLog.countDocuments({
      timestamp: { $gte: last24Hours },
      success: true
    });

    const failedRequests24h = requestsLast24h - successfulRequests24h;

    // Security events (last 7 days)
    const securityEventsLast7d = await AgentSecurityEvent.countDocuments({
      timestamp: { $gte: last7Days }
    });

    const criticalEvents = await AgentSecurityEvent.countDocuments({
      timestamp: { $gte: last7Days },
      severity: { $in: ['high', 'critical'] },
      resolved: false
    });

    // Top operations (last 24 hours)
    const topOperations = await AgentAuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: last24Hours }
        }
      },
      {
        $group: {
          _id: '$operation',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Rate limiter statistics
    const rateLimiterStats = slidingWindowStore.getStats();

    // Content analyzer statistics
    const contentAnalyzerStats = contentSecurityAnalyzer.getCacheStats();

    res.json({
      success: true,
      data: {
        agents: {
          total: totalAgents,
          active: activeAgents,
          suspended: suspendedAgents,
          byReputation: reputationStats.reduce((acc, item) => {
            acc[item._id || 'normal'] = item.count;
            return acc;
          }, {})
        },
        requests: {
          last24Hours: requestsLast24h,
          successful: successfulRequests24h,
          failed: failedRequests24h,
          successRate: requestsLast24h > 0 ? (successfulRequests24h / requestsLast24h * 100).toFixed(2) : 0
        },
        security: {
          eventsLast7Days: securityEventsLast7d,
          criticalUnresolved: criticalEvents
        },
        topOperations,
        rateLimiter: rateLimiterStats,
        contentAnalyzer: contentAnalyzerStats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
      errorCode: 'DASHBOARD_ERROR'
    });
  }
}

/**
 * List all agents with security metrics
 * GET /api/admin/agents
 */
async function listAgents(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      reputation,
      suspended,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};

    if (reputation) {
      query.reputation = reputation;
    }

    if (suspended !== undefined) {
      query.suspended = suspended === 'true';
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Fetch agents
    const agents = await AgentApiKey.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await AgentApiKey.countDocuments(query);

    res.json({
      success: true,
      data: {
        agents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('List agents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list agents',
      errorCode: 'LIST_AGENTS_ERROR'
    });
  }
}

/**
 * Get detailed agent profile
 * GET /api/admin/agents/:agentId
 */
async function getAgentProfile(req, res) {
  try {
    const { agentId } = req.params;

    // Fetch agent
    const agent = await AgentApiKey.findById(agentId).select('-__v');

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
        errorCode: 'AGENT_NOT_FOUND'
      });
    }

    // Get recent activity (last 50 operations)
    const recentActivity = await AgentAuditLog.find({ agentId })
      .sort({ timestamp: -1 })
      .limit(50)
      .select('-requestData -__v');

    // Get statistics
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const stats = await AgentAuditLog.getAgentStats(agentId, last7Days);

    // Get security events
    const securityEvents = await AgentSecurityEvent.find({ agentId })
      .sort({ timestamp: -1 })
      .limit(20)
      .select('-__v');

    res.json({
      success: true,
      data: {
        agent,
        statistics: stats,
        recentActivity,
        securityEvents
      }
    });
  } catch (error) {
    console.error('Get agent profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent profile',
      errorCode: 'AGENT_PROFILE_ERROR'
    });
  }
}

/**
 * Get audit logs with filtering
 * GET /api/admin/audit-logs
 */
async function getAuditLogs(req, res) {
  try {
    const {
      page = 1,
      limit = 50,
      agentId,
      operation,
      success,
      minThreatScore,
      startDate,
      endDate
    } = req.query;

    // Build query
    const query = {};

    if (agentId) {
      query.agentId = agentId;
    }

    if (operation) {
      query.operation = operation;
    }

    if (success !== undefined) {
      query.success = success === 'true';
    }

    if (minThreatScore) {
      query['securityAnalysis.threatScore'] = { $gte: parseInt(minThreatScore) };
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch logs
    const logs = await AgentAuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await AgentAuditLog.countDocuments(query);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs',
      errorCode: 'AUDIT_LOGS_ERROR'
    });
  }
}

/**
 * Get security events with filtering
 * GET /api/admin/security-events
 */
async function getSecurityEvents(req, res) {
  try {
    const {
      page = 1,
      limit = 50,
      agentId,
      eventType,
      severity,
      resolved,
      startDate,
      endDate
    } = req.query;

    // Build query
    const query = {};

    if (agentId) {
      query.agentId = agentId;
    }

    if (eventType) {
      query.eventType = eventType;
    }

    if (severity) {
      query.severity = severity;
    }

    if (resolved !== undefined) {
      query.resolved = resolved === 'true';
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch events
    const events = await AgentSecurityEvent.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await AgentSecurityEvent.countDocuments(query);

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get security events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security events',
      errorCode: 'SECURITY_EVENTS_ERROR'
    });
  }
}

/**
 * Suspend an agent
 * POST /api/admin/agents/:agentId/suspend
 */
async function suspendAgent(req, res) {
  try {
    const { agentId } = req.params;
    const { reason, durationMinutes } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Suspension reason is required',
        errorCode: 'VALIDATION_ERROR'
      });
    }

    // Find agent
    const agent = await AgentApiKey.findById(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
        errorCode: 'AGENT_NOT_FOUND'
      });
    }

    // Suspend agent
    await agent.suspend(reason, durationMinutes);

    // Log security event
    await AgentSecurityEvent.logEvent({
      agentId,
      eventType: 'behavioral_anomaly',
      severity: 'high',
      details: {
        description: 'Agent manually suspended by administrator',
        reason,
        durationMinutes
      },
      actionTaken: 'suspended'
    });

    res.json({
      success: true,
      message: 'Agent suspended successfully',
      data: {
        agentId,
        suspended: true,
        suspendedUntil: agent.suspendedUntil,
        reason: agent.suspensionReason
      }
    });
  } catch (error) {
    console.error('Suspend agent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to suspend agent',
      errorCode: 'SUSPEND_AGENT_ERROR'
    });
  }
}

/**
 * Unsuspend an agent
 * POST /api/admin/agents/:agentId/unsuspend
 */
async function unsuspendAgent(req, res) {
  try {
    const { agentId } = req.params;

    // Find agent
    const agent = await AgentApiKey.findById(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found',
        errorCode: 'AGENT_NOT_FOUND'
      });
    }

    // Unsuspend agent
    agent.suspended = false;
    agent.suspendedUntil = null;
    agent.suspensionReason = null;
    await agent.save();

    res.json({
      success: true,
      message: 'Agent unsuspended successfully',
      data: {
        agentId,
        suspended: false
      }
    });
  } catch (error) {
    console.error('Unsuspend agent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unsuspend agent',
      errorCode: 'UNSUSPEND_AGENT_ERROR'
    });
  }
}

/**
 * Resolve a security event
 * POST /api/admin/security-events/:eventId/resolve
 */
async function resolveSecurityEvent(req, res) {
  try {
    const { eventId } = req.params;
    const { resolvedBy, resolution } = req.body;

    if (!resolvedBy || !resolution) {
      return res.status(400).json({
        success: false,
        error: 'resolvedBy and resolution are required',
        errorCode: 'VALIDATION_ERROR'
      });
    }

    // Find event
    const event = await AgentSecurityEvent.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Security event not found',
        errorCode: 'EVENT_NOT_FOUND'
      });
    }

    // Resolve event
    await event.resolve(resolvedBy, resolution);

    res.json({
      success: true,
      message: 'Security event resolved successfully',
      data: event
    });
  } catch (error) {
    console.error('Resolve security event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve security event',
      errorCode: 'RESOLVE_EVENT_ERROR'
    });
  }
}

module.exports = {
  getDashboardStats,
  listAgents,
  getAgentProfile,
  getAuditLogs,
  getSecurityEvents,
  suspendAgent,
  unsuspendAgent,
  resolveSecurityEvent
};
