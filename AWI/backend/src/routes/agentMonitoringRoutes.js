/**
 * Agent Monitoring Routes
 *
 * Admin dashboard routes for monitoring agent activity,
 * security events, and managing agent reputations
 */

const express = require('express');
const router = express.Router();

const {
  getDashboardStats,
  listAgents,
  getAgentProfile,
  getAuditLogs,
  getSecurityEvents,
  suspendAgent,
  unsuspendAgent,
  resolveSecurityEvent
} = require('../controllers/agentMonitoringController');

// TODO: Add admin authentication middleware before production use
// const { adminAuth } = require('../middleware/adminAuth');

/**
 * Dashboard statistics
 * GET /api/admin/dashboard/stats
 */
router.get('/dashboard/stats', getDashboardStats);

/**
 * Agent management
 */

// List all agents with filtering
router.get('/agents', listAgents);

// Get detailed agent profile
router.get('/agents/:agentId', getAgentProfile);

// Suspend an agent
router.post('/agents/:agentId/suspend', suspendAgent);

// Unsuspend an agent
router.post('/agents/:agentId/unsuspend', unsuspendAgent);

/**
 * Audit logs
 */

// Get audit logs with filtering
router.get('/audit-logs', getAuditLogs);

/**
 * Security events
 */

// Get security events with filtering
router.get('/security-events', getSecurityEvents);

// Resolve a security event
router.post('/security-events/:eventId/resolve', resolveSecurityEvent);

module.exports = router;
