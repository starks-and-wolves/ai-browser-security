/**
 * Content Security Analyzer Middleware
 *
 * Analyzes request content for security threats including:
 * - Injection attacks (XSS, NoSQL, Prompt injection)
 * - Encoded payloads (high entropy)
 * - Suspicious patterns
 * - Duplicate content (spam detection)
 */

const {
  detectThreats,
  calculateThreatScore,
  determineAction
} = require('../config/securityPatterns');

const {
  calculateEntropy,
  extractUrls,
  analyzeCharacterDistribution,
  isSuspiciousCharacterDistribution,
  calculateSimilarity
} = require('../utils/contentAnalyzer');

const AgentSecurityEvent = require('../models/AgentSecurityEvent');
const AgentAuditLog = require('../models/AgentAuditLog');

// Cache for recent content per agent (for duplicate detection)
const recentContentCache = new Map();
const CACHE_SIZE_PER_AGENT = 10;
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Start cache cleanup
setInterval(() => {
  // Remove entries older than 1 hour
  const cutoff = Date.now() - 60 * 60 * 1000;

  for (const [agentId, entries] of recentContentCache.entries()) {
    const recentEntries = entries.filter(entry => entry.timestamp > cutoff);

    if (recentEntries.length === 0) {
      recentContentCache.delete(agentId);
    } else {
      recentContentCache.set(agentId, recentEntries);
    }
  }
}, CACHE_CLEANUP_INTERVAL);

/**
 * Main content security analyzer middleware
 */
async function contentSecurityAnalyzer(req, res, next) {
  // Skip if content security is disabled
  if (process.env.CONTENT_SECURITY_ENABLED === 'false') {
    return next();
  }

  const agent = req.agent;

  if (!agent) {
    return next(); // Authentication will be handled by other middleware
  }

  const agentId = agent._id.toString();

  // Analyze content from request body
  const analysisResults = await analyzeContent(req.body, agentId);

  // Determine action based on threat score
  const action = determineAction(analysisResults.threatScore);

  // Store analysis results in request for audit logging
  req.securityAnalysis = analysisResults;

  // Handle based on action
  if (action === 'block') {
    // Block immediately - high threat score
    await AgentSecurityEvent.logEvent({
      agentId,
      eventType: 'content_blocked',
      severity: 'high',
      details: {
        operation: req.operation || 'unknown',
        endpoint: req.path,
        method: req.method,
        threatScore: analysisResults.threatScore,
        threats: analysisResults.threats,
        description: 'Content blocked due to high threat score'
      },
      actionTaken: 'blocked'
    });

    // Record violation
    if (agent.recordViolation) {
      await agent.recordViolation('content_blocked', 'high');
    }

    return res.status(403).json({
      success: false,
      error: 'Content blocked',
      errorCode: 'CONTENT_SECURITY_VIOLATION',
      details: {
        threatScore: analysisResults.threatScore,
        threats: analysisResults.threats.map(t => ({
          type: t.type,
          severity: t.severity,
          description: t.description
        })),
        message: 'Your content has been blocked due to security policy violations. Please review your content and remove any potentially malicious patterns.'
      },
      timestamp: new Date().toISOString()
    });
  } else if (action === 'flag') {
    // Allow but flag for review
    await AgentSecurityEvent.logEvent({
      agentId,
      eventType: 'content_flagged',
      severity: 'medium',
      details: {
        operation: req.operation || 'unknown',
        endpoint: req.path,
        method: req.method,
        threatScore: analysisResults.threatScore,
        threats: analysisResults.threats,
        description: 'Content flagged for review'
      },
      actionTaken: 'flagged'
    });

    // Record violation (lower severity)
    if (agent.recordViolation) {
      await agent.recordViolation('content_flagged', 'medium');
    }

    // Continue but mark as flagged
    req.securityAnalysis.flaggedForReview = true;
  }

  // Content is clean or flagged but allowed - continue
  next();
}

/**
 * Analyze content for security threats
 * @param {object} body - Request body
 * @param {string} agentId - Agent ID
 * @returns {object} Analysis results
 */
async function analyzeContent(body, agentId) {
  const results = {
    threats: [],
    threatScore: 0,
    entropy: 0,
    urlCount: 0,
    suspiciousChars: false,
    similarContent: false,
    flaggedForReview: false
  };

  if (!body || typeof body !== 'object') {
    return results;
  }

  // Extract text content to analyze
  const contentFields = ['content', 'title', 'description', 'comment', 'body', 'text'];
  let combinedContent = '';

  for (const field of contentFields) {
    if (body[field] && typeof body[field] === 'string') {
      combinedContent += body[field] + ' ';
    }
  }

  if (!combinedContent.trim()) {
    return results;
  }

  // 1. Pattern matching for injection attacks
  const threats = detectThreats(combinedContent);
  results.threats = threats;
  results.threatScore = calculateThreatScore(threats);

  // 2. Entropy analysis (detect encoded payloads)
  const entropy = calculateEntropy(combinedContent);
  results.entropy = entropy;

  if (entropy > 4.5) {
    // High entropy - possible encoded payload
    results.threats.push({
      type: 'high_entropy',
      severity: 'medium',
      pattern: 'entropy_analysis',
      description: `High entropy detected (${entropy.toFixed(2)}), possible encoded payload`
    });
    results.threatScore += 30;
  }

  // 3. Character distribution analysis
  const charDistribution = analyzeCharacterDistribution(combinedContent);

  if (isSuspiciousCharacterDistribution(charDistribution)) {
    results.suspiciousChars = true;
    results.threats.push({
      type: 'suspicious_pattern',
      severity: 'low',
      pattern: 'character_distribution',
      description: 'Unusual character distribution detected'
    });
    results.threatScore += 10;
  }

  // 4. URL extraction and count
  const urls = extractUrls(combinedContent);
  results.urlCount = urls.length;

  if (urls.length > 5) {
    // Too many URLs - possible spam
    results.threats.push({
      type: 'suspicious_pattern',
      severity: 'low',
      pattern: 'excessive_urls',
      description: `Excessive URLs detected (${urls.length})`
    });
    results.threatScore += 10;
  }

  // 5. Duplicate content detection (compare with recent submissions)
  const recentContent = recentContentCache.get(agentId) || [];

  for (const entry of recentContent) {
    const similarity = calculateSimilarity(combinedContent, entry.content);

    if (similarity > 0.85) {
      // Very similar to recent content - possible spam
      results.similarContent = true;
      results.threats.push({
        type: 'suspicious_pattern',
        severity: 'low',
        pattern: 'duplicate_content',
        description: `Similar to recent content (${(similarity * 100).toFixed(0)}% match)`
      });
      results.threatScore += 20;
      break;
    }
  }

  // Update recent content cache
  if (combinedContent.length > 0) {
    recentContent.push({
      content: combinedContent,
      timestamp: Date.now()
    });

    // Keep only last N entries
    if (recentContent.length > CACHE_SIZE_PER_AGENT) {
      recentContent.shift();
    }

    recentContentCache.set(agentId, recentContent);
  }

  return results;
}

/**
 * Get cache statistics (for monitoring)
 * @returns {object} Cache statistics
 */
function getCacheStats() {
  let totalEntries = 0;

  for (const entries of recentContentCache.values()) {
    totalEntries += entries.length;
  }

  return {
    agents: recentContentCache.size,
    totalEntries
  };
}

/**
 * Clear cache (for testing)
 */
function clearCache() {
  recentContentCache.clear();
}

module.exports = contentSecurityAnalyzer;
module.exports.getCacheStats = getCacheStats;
module.exports.clearCache = clearCache;
