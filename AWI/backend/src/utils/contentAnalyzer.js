/**
 * Content Analysis Utilities
 *
 * Provides utility functions for analyzing content for security threats
 */

/**
 * Calculate Shannon entropy of a string
 * High entropy may indicate encoded payloads or obfuscated code
 * @param {string} str - String to analyze
 * @returns {number} Entropy value (0-8 for ASCII)
 */
function calculateEntropy(str) {
  if (!str || str.length === 0) {
    return 0;
  }

  // Count frequency of each character
  const freq = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }

  // Calculate entropy using Shannon formula
  let entropy = 0;
  const len = str.length;

  for (const count of Object.values(freq)) {
    const probability = count / len;
    entropy -= probability * Math.log2(probability);
  }

  return entropy;
}

/**
 * Calculate Jaccard similarity between two strings
 * Used for detecting duplicate or similar content
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity (0-1, where 1 is identical)
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) {
    return 0;
  }

  // Convert to sets of words
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));

  // Calculate intersection and union
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  // Jaccard similarity = |intersection| / |union|
  return intersection.size / union.size;
}

/**
 * Extract URLs from content
 * @param {string} content - Content to analyze
 * @returns {Array} Array of URLs found
 */
function extractUrls(content) {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
  const matches = content.match(urlRegex);

  return matches || [];
}

/**
 * Calculate Levenshtein distance between two strings
 * More precise similarity measurement than Jaccard
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance
 */
function levenshteinDistance(str1, str2) {
  if (!str1 || !str2) {
    return Math.max(str1?.length || 0, str2?.length || 0);
  }

  const len1 = str1.length;
  const len2 = str2.length;

  // Create 2D array for dynamic programming
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // Deletion
        matrix[i][j - 1] + 1,      // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity using Levenshtein distance
 * Normalized to 0-1 range
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity (0-1, where 1 is identical)
 */
function calculateExactSimilarity(str1, str2) {
  if (!str1 || !str2) {
    return 0;
  }

  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);

  return 1 - (distance / maxLength);
}

/**
 * Analyze character distribution
 * Detects unusual character patterns that may indicate encoding
 * @param {string} content - Content to analyze
 * @returns {object} Distribution analysis
 */
function analyzeCharacterDistribution(content) {
  if (!content || typeof content !== 'string') {
    return {
      alphanumeric: 0,
      special: 0,
      whitespace: 0,
      control: 0
    };
  }

  let alphanumeric = 0;
  let special = 0;
  let whitespace = 0;
  let control = 0;

  for (const char of content) {
    const code = char.charCodeAt(0);

    if (/[a-zA-Z0-9]/.test(char)) {
      alphanumeric++;
    } else if (/\s/.test(char)) {
      whitespace++;
    } else if (code < 32 || code === 127) {
      control++;
    } else {
      special++;
    }
  }

  const total = content.length;

  return {
    alphanumeric,
    special,
    whitespace,
    control,
    ratios: {
      alphanumeric: alphanumeric / total,
      special: special / total,
      whitespace: whitespace / total,
      control: control / total
    }
  };
}

/**
 * Check for suspicious character patterns
 * @param {object} distribution - Character distribution from analyzeCharacterDistribution
 * @returns {boolean} True if suspicious
 */
function isSuspiciousCharacterDistribution(distribution) {
  const { ratios } = distribution;

  // Too many special characters (more than 30%)
  if (ratios.special > 0.3) {
    return true;
  }

  // Contains control characters
  if (ratios.control > 0) {
    return true;
  }

  // Almost all whitespace (more than 50%)
  if (ratios.whitespace > 0.5) {
    return true;
  }

  return false;
}

/**
 * Count occurrences of a pattern in content
 * @param {string} content - Content to search
 * @param {RegExp} pattern - Pattern to count
 * @returns {number} Number of matches
 */
function countPatternOccurrences(content, pattern) {
  if (!content || typeof content !== 'string') {
    return 0;
  }

  const matches = content.match(pattern);
  return matches ? matches.length : 0;
}

module.exports = {
  calculateEntropy,
  calculateSimilarity,
  extractUrls,
  levenshteinDistance,
  calculateExactSimilarity,
  analyzeCharacterDistribution,
  isSuspiciousCharacterDistribution,
  countPatternOccurrences
};
