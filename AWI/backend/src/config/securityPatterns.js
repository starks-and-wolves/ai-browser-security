/**
 * Security Pattern Definitions
 *
 * Defines regex patterns for detecting various injection attacks
 * and malicious content patterns
 */

/**
 * XSS (Cross-Site Scripting) patterns
 */
const XSS_PATTERNS = [
  {
    name: 'script_tag',
    regex: /<\s*script[^>]*>.*?<\s*\/\s*script\s*>/gis,
    severity: 'high',
    category: 'xss',
    description: 'Script tag detected'
  },
  {
    name: 'event_handler',
    regex: /\bon\w+\s*=\s*["'][^"']*["']/gi,
    severity: 'high',
    category: 'xss',
    description: 'Event handler attribute detected'
  },
  {
    name: 'javascript_protocol',
    regex: /javascript\s*:/gi,
    severity: 'high',
    category: 'xss',
    description: 'JavaScript protocol detected'
  },
  {
    name: 'data_uri',
    regex: /data:text\/html[,;]/gi,
    severity: 'medium',
    category: 'xss',
    description: 'Data URI with HTML detected'
  },
  {
    name: 'iframe_tag',
    regex: /<\s*iframe[^>]*>/gi,
    severity: 'high',
    category: 'xss',
    description: 'Iframe tag detected'
  },
  {
    name: 'object_embed',
    regex: /<\s*(object|embed)[^>]*>/gi,
    severity: 'high',
    category: 'xss',
    description: 'Object or embed tag detected'
  }
];

/**
 * MongoDB injection patterns
 */
const NOSQL_INJECTION_PATTERNS = [
  {
    name: 'dollar_operator',
    regex: /\$where|\$ne|\$gt|\$lt|\$gte|\$lte|\$in|\$nin|\$regex|\$expr/gi,
    severity: 'high',
    category: 'nosql_injection',
    description: 'MongoDB operator detected'
  },
  {
    name: 'function_operator',
    regex: /\$function|\$accumulator/gi,
    severity: 'critical',
    category: 'nosql_injection',
    description: 'MongoDB function operator detected'
  }
];

/**
 * Prompt injection patterns (for AI agents)
 */
const PROMPT_INJECTION_PATTERNS = [
  {
    name: 'ignore_instructions',
    regex: /ignore\s+(previous|all|above|prior)\s+(instructions?|prompts?|commands?)/gi,
    severity: 'high',
    category: 'prompt_injection',
    description: 'Ignore instructions pattern detected'
  },
  {
    name: 'system_prompt',
    regex: /(system\s*prompt|system\s*message|system\s*role)/gi,
    severity: 'high',
    category: 'prompt_injection',
    description: 'System prompt manipulation detected'
  },
  {
    name: 'role_change',
    regex: /(you\s+are\s+now|new\s+instructions?:|forget\s+everything)/gi,
    severity: 'high',
    category: 'prompt_injection',
    description: 'Role change instruction detected'
  },
  {
    name: 'disregard',
    regex: /disregard\s+(previous|all|above|prior)/gi,
    severity: 'medium',
    category: 'prompt_injection',
    description: 'Disregard instruction detected'
  },
  {
    name: 'jailbreak_attempt',
    regex: /(do\s+anything\s+now|DAN\s+mode|developer\s+mode|god\s+mode)/gi,
    severity: 'high',
    category: 'prompt_injection',
    description: 'Jailbreak attempt detected'
  }
];

/**
 * Path traversal patterns
 */
const PATH_TRAVERSAL_PATTERNS = [
  {
    name: 'directory_traversal',
    regex: /\.\.[\/\\]/g,
    severity: 'high',
    category: 'path_traversal',
    description: 'Directory traversal pattern detected'
  },
  {
    name: 'absolute_path',
    regex: /^(\/|[a-zA-Z]:\\)/,
    severity: 'medium',
    category: 'path_traversal',
    description: 'Absolute path detected'
  }
];

/**
 * Command injection patterns
 */
const COMMAND_INJECTION_PATTERNS = [
  {
    name: 'shell_metacharacters',
    regex: /[;&|`$()]/g,
    severity: 'high',
    category: 'command_injection',
    description: 'Shell metacharacters detected'
  },
  {
    name: 'command_chaining',
    regex: /(&&|\|\||;)/g,
    severity: 'high',
    category: 'command_injection',
    description: 'Command chaining detected'
  }
];

/**
 * All patterns combined
 */
const ALL_PATTERNS = [
  ...XSS_PATTERNS,
  ...NOSQL_INJECTION_PATTERNS,
  ...PROMPT_INJECTION_PATTERNS,
  ...PATH_TRAVERSAL_PATTERNS,
  ...COMMAND_INJECTION_PATTERNS
];

/**
 * Severity scores for threat calculation
 */
const SEVERITY_SCORES = {
  low: 10,
  medium: 30,
  high: 50,
  critical: 100
};

/**
 * Threat score thresholds
 */
const THREAT_THRESHOLDS = {
  block: parseInt(process.env.THREAT_SCORE_BLOCK_THRESHOLD, 10) || 80,   // Block immediately
  flag: parseInt(process.env.THREAT_SCORE_FLAG_THRESHOLD, 10) || 50,    // Allow but flag for review
  clean: 0  // No threats detected
};

/**
 * Check content against all patterns
 * @param {string} content - Content to check
 * @returns {Array} Array of detected threats
 */
function detectThreats(content) {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const threats = [];

  for (const pattern of ALL_PATTERNS) {
    const matches = content.match(pattern.regex);

    if (matches && matches.length > 0) {
      threats.push({
        type: pattern.category,
        severity: pattern.severity,
        pattern: pattern.name,
        matches: matches.length,
        description: pattern.description
      });
    }
  }

  return threats;
}

/**
 * Calculate total threat score
 * @param {Array} threats - Array of detected threats
 * @returns {number} Total threat score
 */
function calculateThreatScore(threats) {
  return threats.reduce((total, threat) => {
    return total + (SEVERITY_SCORES[threat.severity] || 0);
  }, 0);
}

/**
 * Determine action based on threat score
 * @param {number} threatScore - Total threat score
 * @returns {string} Action to take: 'block', 'flag', or 'allow'
 */
function determineAction(threatScore) {
  if (threatScore >= THREAT_THRESHOLDS.block) {
    return 'block';
  } else if (threatScore >= THREAT_THRESHOLDS.flag) {
    return 'flag';
  } else {
    return 'allow';
  }
}

module.exports = {
  XSS_PATTERNS,
  NOSQL_INJECTION_PATTERNS,
  PROMPT_INJECTION_PATTERNS,
  PATH_TRAVERSAL_PATTERNS,
  COMMAND_INJECTION_PATTERNS,
  ALL_PATTERNS,
  SEVERITY_SCORES,
  THREAT_THRESHOLDS,
  detectThreats,
  calculateThreatScore,
  determineAction
};
