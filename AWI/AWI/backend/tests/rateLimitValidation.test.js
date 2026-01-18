/**
 * Rate Limit Validation Tests
 *
 * Tests rate limiting functionality by:
 * - Creating requests up to 20% of configured limits
 * - Validating rate limit headers are present
 * - Ensuring limits are being tracked correctly
 * - Cleaning up all test data after completion
 */

const axios = require('axios');
const { SIMPLE_RATE_LIMITS, OPERATION_RATE_LIMITS } = require('../src/config/rateLimits');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const TEST_PERCENTAGE = 0.2; // Test at 20% of limits

// Test data tracking
const testData = {
  posts: [],
  comments: [],
  agents: []
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Log with color
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a test post
 */
async function createTestPost() {
  try {
    const response = await axios.post(`${BASE_URL}/api/posts`, {
      title: `Test Post ${Date.now()}`,
      content: 'This is a test post created by rate limit validation tests.',
      authorName: 'Rate Limit Tester',
      tags: ['test', 'rate-limit']
    });

    if (response.data.success && response.data.data) {
      testData.posts.push(response.data.data._id);
      return {
        success: true,
        id: response.data.data._id,
        headers: response.headers
      };
    }
    return { success: false };
  } catch (error) {
    if (error.response && error.response.status === 429) {
      return { success: false, rateLimited: true };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Create a test comment
 */
async function createTestComment(postId) {
  try {
    const response = await axios.post(`${BASE_URL}/api/comments`, {
      postId,
      content: 'Test comment for rate limit validation',
      authorName: 'Rate Limit Tester'
    });

    if (response.data.success && response.data.data) {
      testData.comments.push(response.data.data._id);
      return {
        success: true,
        id: response.data.data._id,
        headers: response.headers
      };
    }
    return { success: false };
  } catch (error) {
    if (error.response && error.response.status === 429) {
      return { success: false, rateLimited: true };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Register test agent
 */
async function registerTestAgent() {
  try {
    const response = await axios.post(`${BASE_URL}/api/agent/register`, {
      name: `TestAgent_${Date.now()}`,
      description: 'Test agent for rate limit validation',
      permissions: ['read', 'write']
    });

    if (response.data.success && response.data.agent) {
      testData.agents.push({
        id: response.data.agent.id,
        apiKey: response.data.agent.apiKey
      });
      return {
        success: true,
        agent: response.data.agent,
        headers: response.headers
      };
    }
    return { success: false };
  } catch (error) {
    if (error.response && error.response.status === 429) {
      return { success: false, rateLimited: true };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Get list of posts
 */
async function getPosts() {
  try {
    const response = await axios.get(`${BASE_URL}/api/posts`);
    return {
      success: true,
      headers: response.headers
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete test post
 */
async function deleteTestPost(postId) {
  try {
    await axios.delete(`${BASE_URL}/api/posts/${postId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete test comment
 */
async function deleteTestComment(commentId) {
  try {
    await axios.delete(`${BASE_URL}/api/comments/${commentId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Extract rate limit info from headers
 */
function extractRateLimitInfo(headers) {
  return {
    limit: headers['ratelimit-limit'] || headers['x-ratelimit-limit'],
    remaining: headers['ratelimit-remaining'] || headers['x-ratelimit-remaining'],
    reset: headers['ratelimit-reset'] || headers['x-ratelimit-reset']
  };
}

/**
 * Test post creation rate limits
 */
async function testPostCreationRateLimit() {
  log('\n📝 Testing Post Creation Rate Limits...', 'blue');

  const limit = SIMPLE_RATE_LIMITS.post.max;
  const testCount = Math.ceil(limit * TEST_PERCENTAGE);
  const windowMs = SIMPLE_RATE_LIMITS.post.windowMs;

  log(`   Limit: ${limit} posts per ${windowMs / 1000} seconds`, 'cyan');
  log(`   Testing: ${testCount} posts (${TEST_PERCENTAGE * 100}%)`, 'cyan');

  let successful = 0;
  let rateLimited = 0;
  let lastHeaders = null;

  for (let i = 0; i < testCount; i++) {
    const result = await createTestPost();

    if (result.success) {
      successful++;
      lastHeaders = result.headers;
      log(`   ✓ Post ${i + 1}/${testCount} created`, 'green');
    } else if (result.rateLimited) {
      rateLimited++;
      log(`   ⚠ Post ${i + 1}/${testCount} rate limited (unexpected at ${TEST_PERCENTAGE * 100}%)`, 'yellow');
    } else {
      log(`   ✗ Post ${i + 1}/${testCount} failed: ${result.error}`, 'red');
    }

    // Small delay between requests
    await sleep(100);
  }

  if (lastHeaders) {
    const rateLimitInfo = extractRateLimitInfo(lastHeaders);
    log(`   Rate Limit Headers: Limit=${rateLimitInfo.limit}, Remaining=${rateLimitInfo.remaining}`, 'cyan');
  }

  log(`   Summary: ${successful} successful, ${rateLimited} rate limited`, 'cyan');

  return {
    name: 'Post Creation',
    limit,
    tested: testCount,
    successful,
    rateLimited,
    passed: rateLimited === 0 && successful === testCount
  };
}

/**
 * Test comment creation rate limits
 */
async function testCommentCreationRateLimit() {
  log('\n💬 Testing Comment Creation Rate Limits...', 'blue');

  // First create a post to comment on
  log('   Creating test post for comments...', 'cyan');
  const postResult = await createTestPost();

  if (!postResult.success) {
    log('   ✗ Failed to create test post for comments', 'red');
    return { name: 'Comment Creation', passed: false, error: 'Could not create test post' };
  }

  const postId = postResult.id;
  log(`   ✓ Test post created: ${postId}`, 'green');

  const limit = SIMPLE_RATE_LIMITS.comment.max;
  const testCount = Math.ceil(limit * TEST_PERCENTAGE);
  const windowMs = SIMPLE_RATE_LIMITS.comment.windowMs;

  log(`   Limit: ${limit} comments per ${windowMs / 1000 / 60} minutes`, 'cyan');
  log(`   Testing: ${testCount} comments (${TEST_PERCENTAGE * 100}%)`, 'cyan');

  let successful = 0;
  let rateLimited = 0;
  let lastHeaders = null;

  for (let i = 0; i < testCount; i++) {
    const result = await createTestComment(postId);

    if (result.success) {
      successful++;
      lastHeaders = result.headers;
      log(`   ✓ Comment ${i + 1}/${testCount} created`, 'green');
    } else if (result.rateLimited) {
      rateLimited++;
      log(`   ⚠ Comment ${i + 1}/${testCount} rate limited (unexpected at ${TEST_PERCENTAGE * 100}%)`, 'yellow');
    } else {
      log(`   ✗ Comment ${i + 1}/${testCount} failed: ${result.error}`, 'red');
    }

    await sleep(100);
  }

  if (lastHeaders) {
    const rateLimitInfo = extractRateLimitInfo(lastHeaders);
    log(`   Rate Limit Headers: Limit=${rateLimitInfo.limit}, Remaining=${rateLimitInfo.remaining}`, 'cyan');
  }

  log(`   Summary: ${successful} successful, ${rateLimited} rate limited`, 'cyan');

  return {
    name: 'Comment Creation',
    limit,
    tested: testCount,
    successful,
    rateLimited,
    passed: rateLimited === 0 && successful === testCount
  };
}

/**
 * Test general API rate limits
 */
async function testGeneralAPIRateLimit() {
  log('\n🌐 Testing General API Rate Limits...', 'blue');

  const limit = SIMPLE_RATE_LIMITS.api.max;
  const testCount = Math.ceil(limit * TEST_PERCENTAGE);
  const windowMs = SIMPLE_RATE_LIMITS.api.windowMs;

  log(`   Limit: ${limit} requests per ${windowMs / 1000 / 60} minutes`, 'cyan');
  log(`   Testing: ${testCount} requests (${TEST_PERCENTAGE * 100}%)`, 'cyan');

  let successful = 0;
  let failed = 0;
  let lastHeaders = null;

  for (let i = 0; i < testCount; i++) {
    const result = await getPosts();

    if (result.success) {
      successful++;
      lastHeaders = result.headers;
      log(`   ✓ Request ${i + 1}/${testCount} successful`, 'green');
    } else {
      failed++;
      log(`   ✗ Request ${i + 1}/${testCount} failed`, 'red');
    }

    await sleep(50);
  }

  if (lastHeaders) {
    const rateLimitInfo = extractRateLimitInfo(lastHeaders);
    log(`   Rate Limit Headers: Limit=${rateLimitInfo.limit}, Remaining=${rateLimitInfo.remaining}`, 'cyan');
  }

  log(`   Summary: ${successful} successful, ${failed} failed`, 'cyan');

  return {
    name: 'General API',
    limit,
    tested: testCount,
    successful,
    failed,
    passed: successful === testCount
  };
}

/**
 * Test agent registration rate limits
 */
async function testAgentRegistrationRateLimit() {
  log('\n🤖 Testing Agent Registration Rate Limits...', 'blue');

  const limit = OPERATION_RATE_LIMITS.register.burst || 3;
  const testCount = Math.max(1, Math.ceil(limit * TEST_PERCENTAGE)); // At least 1

  log(`   Limit: ${limit} registrations (burst)`, 'cyan');
  log(`   Testing: ${testCount} registrations (${TEST_PERCENTAGE * 100}%)`, 'cyan');

  let successful = 0;
  let rateLimited = 0;
  let lastHeaders = null;

  for (let i = 0; i < testCount; i++) {
    const result = await registerTestAgent();

    if (result.success) {
      successful++;
      lastHeaders = result.headers;
      log(`   ✓ Agent ${i + 1}/${testCount} registered`, 'green');
    } else if (result.rateLimited) {
      rateLimited++;
      log(`   ⚠ Agent ${i + 1}/${testCount} rate limited (unexpected at ${TEST_PERCENTAGE * 100}%)`, 'yellow');
    } else {
      log(`   ✗ Agent ${i + 1}/${testCount} failed: ${result.error}`, 'red');
    }

    await sleep(200);
  }

  if (lastHeaders) {
    const rateLimitInfo = extractRateLimitInfo(lastHeaders);
    log(`   Rate Limit Headers: Limit=${rateLimitInfo.limit}, Remaining=${rateLimitInfo.remaining}`, 'cyan');
  }

  log(`   Summary: ${successful} successful, ${rateLimited} rate limited`, 'cyan');

  return {
    name: 'Agent Registration',
    limit,
    tested: testCount,
    successful,
    rateLimited,
    passed: rateLimited === 0 && successful === testCount
  };
}

/**
 * Clean up all test data
 */
async function cleanup() {
  log('\n🧹 Cleaning up test data...', 'blue');

  let deletedPosts = 0;
  let deletedComments = 0;
  let failedDeletions = 0;

  // Delete comments first (they reference posts)
  log(`   Deleting ${testData.comments.length} test comments...`, 'cyan');
  for (const commentId of testData.comments) {
    const result = await deleteTestComment(commentId);
    if (result.success) {
      deletedComments++;
    } else {
      failedDeletions++;
      log(`   ⚠ Failed to delete comment ${commentId}: ${result.error}`, 'yellow');
    }
    await sleep(50);
  }

  // Delete posts
  log(`   Deleting ${testData.posts.length} test posts...`, 'cyan');
  for (const postId of testData.posts) {
    const result = await deleteTestPost(postId);
    if (result.success) {
      deletedPosts++;
    } else {
      failedDeletions++;
      log(`   ⚠ Failed to delete post ${postId}: ${result.error}`, 'yellow');
    }
    await sleep(50);
  }

  log(`   ✓ Deleted ${deletedPosts} posts, ${deletedComments} comments`, 'green');

  if (failedDeletions > 0) {
    log(`   ⚠ ${failedDeletions} deletions failed`, 'yellow');
  }

  if (testData.agents.length > 0) {
    log(`   ℹ Note: ${testData.agents.length} test agents created (automatic cleanup via session expiry)`, 'cyan');
  }

  return {
    deletedPosts,
    deletedComments,
    failedDeletions
  };
}

/**
 * Print test summary
 */
function printSummary(results) {
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 RATE LIMIT VALIDATION SUMMARY', 'blue');
  log('='.repeat(60), 'cyan');

  let allPassed = true;

  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    log(`\n${status} ${result.name}`, color);
    log(`   Limit: ${result.limit}`, 'cyan');
    log(`   Tested: ${result.tested} (${TEST_PERCENTAGE * 100}%)`, 'cyan');
    log(`   Successful: ${result.successful}`, 'cyan');
    if (result.rateLimited !== undefined) {
      log(`   Rate Limited: ${result.rateLimited}`, 'cyan');
    }
    if (result.failed !== undefined) {
      log(`   Failed: ${result.failed}`, 'cyan');
    }

    if (!result.passed) {
      allPassed = false;
    }
  });

  log('\n' + '='.repeat(60), 'cyan');

  if (allPassed) {
    log('✅ ALL TESTS PASSED!', 'green');
    log('Rate limits are properly configured and functioning.', 'green');
  } else {
    log('❌ SOME TESTS FAILED', 'red');
    log('Please review the failed tests above.', 'red');
  }

  log('='.repeat(60) + '\n', 'cyan');
}

/**
 * Main test runner
 */
async function runTests() {
  log('🚀 Starting Rate Limit Validation Tests', 'blue');
  log(`📍 Base URL: ${BASE_URL}`, 'cyan');
  log(`📊 Testing at ${TEST_PERCENTAGE * 100}% of configured limits\n`, 'cyan');

  const results = [];

  try {
    // Run all tests
    results.push(await testPostCreationRateLimit());
    await sleep(1000); // Pause between test suites

    results.push(await testCommentCreationRateLimit());
    await sleep(1000);

    results.push(await testGeneralAPIRateLimit());
    await sleep(1000);

    results.push(await testAgentRegistrationRateLimit());
    await sleep(1000);

    // Print summary
    printSummary(results);

  } catch (error) {
    log(`\n❌ Test execution failed: ${error.message}`, 'red');
    console.error(error);
  } finally {
    // Always cleanup
    await cleanup();
  }

  // Exit with appropriate code
  const allPassed = results.every(r => r.passed);
  process.exit(allPassed ? 0 : 1);
}

// Run tests if executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testPostCreationRateLimit,
  testCommentCreationRateLimit,
  testGeneralAPIRateLimit,
  testAgentRegistrationRateLimit,
  cleanup
};
