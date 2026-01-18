const AgentApiKey = require('../models/AgentApiKey');

/**
 * Middleware to authenticate agent API requests
 */
const agentAuth = async (req, res, next) => {
  try {
    // Get API key from header
    const apiKey = req.headers['x-agent-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Agent API key is required',
        message: 'Please provide an API key in the X-Agent-API-Key header or Authorization header'
      });
    }

    // Find and validate API key
    const agentKey = await AgentApiKey.findOne({ key: apiKey });

    if (!agentKey) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
        message: 'The provided API key is not valid'
      });
    }

    if (!agentKey.isValid()) {
      return res.status(401).json({
        success: false,
        error: 'API key inactive or expired',
        message: 'The API key is no longer active or has expired'
      });
    }

    // Check if agent is suspended
    if (agentKey.isSuspended()) {
      return res.status(403).json({
        success: false,
        error: 'Agent suspended',
        errorCode: 'AGENT_SUSPENDED',
        message: agentKey.suspendedUntil
          ? `Your agent is suspended until ${agentKey.suspendedUntil.toISOString()}. Reason: ${agentKey.suspensionReason}`
          : `Your agent has been permanently suspended. Reason: ${agentKey.suspensionReason}`
      });
    }

    // Increment usage
    await agentKey.incrementUsage();

    // Attach full agent model to request (needed for security middleware)
    req.agent = agentKey;

    next();
  } catch (error) {
    console.error('Agent authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Middleware to check if agent has specific permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.agent) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!req.agent.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `This operation requires '${permission}' permission`
      });
    }

    next();
  };
};

module.exports = {
  agentAuth,
  requirePermission
};
