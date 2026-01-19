/**
 * Agent Audit Logging Middleware
 *
 * Logs all agent API operations for security monitoring and forensics
 * Captures request/response data, security analysis, and performance metrics
 */

const AgentAuditLog = require('../models/AgentAuditLog');

/**
 * Create audit logging middleware for a specific operation
 * @param {string} operation - Operation name (e.g., 'list_posts', 'create_comment')
 * @returns {Function} Express middleware
 */
function auditLogger(operation) {
  return async (req, res, next) => {
    const agent = req.agent;

    if (!agent) {
      return next(); // Authentication will be handled by other middleware
    }

    const agentId = agent._id.toString();
    const agentName = agent.name || 'Unknown';
    const startTime = Date.now();

    // Store original res.json function
    const originalJson = res.json.bind(res);

    // Override res.json to capture response
    res.json = function (body) {
      const responseTimeMs = Date.now() - startTime;

      // Determine success/failure from response
      const success = res.statusCode < 400;
      const errorCode = !success && body && body.errorCode ? body.errorCode : null;

      // Get security analysis from request (set by contentSecurityAnalyzer)
      const securityAnalysis = req.securityAnalysis || {
        threats: [],
        threatScore: 0,
        flaggedForReview: false
      };

      // Sanitize request data (remove sensitive fields)
      const sanitizedBody = sanitizeRequestData(req.body);

      // Create audit log entry asynchronously (don't block response)
      AgentAuditLog.logOperation({
        agentId,
        agentName,
        operation,
        method: req.method,
        endpoint: req.path,
        requestData: {
          params: req.params,
          query: req.query,
          body: sanitizedBody
        },
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent'),
        statusCode: res.statusCode,
        success,
        errorCode,
        securityAnalysis,
        responseTimeMs
      }).catch(err => {
        console.error('Failed to create audit log:', err);
      });

      // Call original json function
      return originalJson(body);
    };

    next();
  };
}

/**
 * Sanitize request data by removing sensitive fields
 * @param {object} data - Request data
 * @returns {object} Sanitized data
 */
function sanitizeRequestData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };

  // Remove sensitive fields
  const sensitiveFields = [
    'password',
    'apiKey',
    'api_key',
    'token',
    'secret',
    'credentials',
    'authorization'
  ];

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Truncate long content fields (save database space)
  const contentFields = ['content', 'body', 'description'];

  for (const field of contentFields) {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      if (sanitized[field].length > 500) {
        sanitized[field] = sanitized[field].substring(0, 500) + '... [truncated]';
      }
    }
  }

  return sanitized;
}

/**
 * Middleware to attach operation name to request
 * Use this before auditLogger to specify the operation
 */
function setOperation(operationName) {
  return (req, res, next) => {
    req.operation = operationName;
    next();
  };
}

module.exports = {
  auditLogger,
  setOperation
};
