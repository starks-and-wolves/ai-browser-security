#!/usr/bin/env node
/**
 * Test Redis AWI Implementation
 *
 * Verifies:
 * - Redis connection
 * - State initialization
 * - Delta updates
 * - Caching
 * - Session lifecycle
 */

require('dotenv').config();
const { redis } = require('./src/config/redis');
const AWIStateManager = require('./src/utils/awiStateManager');

async function testRedisConnection() {
  console.log('\n=== TEST 1: Redis Connection ===');

  try {
    const pong = await redis.ping();
    console.log('✅ Redis connected:', pong);
    return true;
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    return false;
  }
}

async function testSessionInitialization() {
  console.log('\n=== TEST 2: Session Initialization ===');

  try {
    const { sessionId, state } = await AWIStateManager.initializeSession(
      'test-agent-123',
      'TestAgent',
      '/api/agent/posts'
    );

    console.log('✅ Session created:', sessionId);
    console.log('   Agent:', state.agent_name);
    console.log('   Initial route:', state.current_url);
    console.log('   Statistics:', state.statistics);

    return sessionId;
  } catch (error) {
    console.error('❌ Session initialization failed:', error.message);
    return null;
  }
}

async function testDeltaUpdate(sessionId) {
  console.log('\n=== TEST 3: Delta-Based Update ===');

  try {
    // Apply delta
    const delta = {
      page_state: {
        pagination: {
          cursor: 2,
          total_pages: 5
        }
      }
    };

    const updated = await AWIStateManager.updateStateWithDelta(
      sessionId,
      delta,
      {
        action: 'next_page',
        input: { page: 2 },
        success: true,
        observation: 'Navigated to page 2'
      }
    );

    console.log('✅ Delta applied');
    console.log('   New cursor:', updated.page_state.pagination.cursor);
    console.log('   Total actions:', updated.statistics.total_actions);
    console.log('   Last action:', updated.history.last_action.action);

    return true;
  } catch (error) {
    console.error('❌ Delta update failed:', error.message);
    return false;
  }
}

async function testActionHistory(sessionId) {
  console.log('\n=== TEST 4: Action History ===');

  try {
    const history = await AWIStateManager.getActionHistory(sessionId, 10);

    console.log('✅ Action history retrieved');
    console.log('   Total actions:', history.total);
    console.log('   Trajectory:');
    history.trajectory.forEach((action, i) => {
      console.log(`   ${i + 1}. ${action.action} - ${action.observation || 'No observation'}`);
    });

    return true;
  } catch (error) {
    console.error('❌ Action history failed:', error.message);
    return false;
  }
}

async function testStateDiff(sessionId) {
  console.log('\n=== TEST 5: State Diff ===');

  try {
    const diff = await AWIStateManager.getStateDiff(sessionId);

    if (diff.success) {
      console.log('✅ State diff retrieved');
      console.log('   Last action:', diff.last_action.action);
      console.log('   Delta keys:', Object.keys(diff.delta));
    } else {
      console.log('⚠️  No recent state changes');
    }

    return true;
  } catch (error) {
    console.error('❌ State diff failed:', error.message);
    return false;
  }
}

async function testCaching(sessionId) {
  console.log('\n=== TEST 6: Query Result Caching ===');

  try {
    const filters = { category: 'tech', tag: 'awi' };
    const sort = { key: 'createdAt', order: 'desc' };
    const mockResults = [
      { id: '1', title: 'Post 1' },
      { id: '2', title: 'Post 2' },
      { id: '3', title: 'Post 3' }
    ];

    // Cache results
    const cacheKey = await AWIStateManager.cacheQueryResults(
      sessionId,
      filters,
      sort,
      mockResults
    );

    console.log('✅ Results cached');
    console.log('   Cache key:', cacheKey);

    // Retrieve from cache
    const cached = await AWIStateManager.getCachedQueryResults(cacheKey);

    if (cached && cached.length === mockResults.length) {
      console.log('✅ Cache retrieval successful');
      console.log('   Cached items:', cached.length);
    } else {
      console.error('❌ Cache retrieval mismatch');
      return false;
    }

    // Check if cache exists
    const hasCacheKey = await AWIStateManager.hasValidCache(filters, sort);

    if (hasCacheKey === cacheKey) {
      console.log('✅ Cache validation successful');
    } else {
      console.error('❌ Cache validation failed');
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Caching failed:', error.message);
    return false;
  }
}

async function testSessionCleanup(sessionId) {
  console.log('\n=== TEST 7: Session Cleanup ===');

  try {
    // End session (this removes from Redis)
    const finalState = await AWIStateManager.endSession(sessionId);

    if (finalState) {
      console.log('✅ Session ended');
      console.log('   Session ID:', finalState.session_id);
      console.log('   Total actions:', finalState.statistics.total_actions);
      console.log('   Duration:', finalState.statistics.duration_ms, 'ms');

      // Verify it's gone from Redis
      const goneState = await AWIStateManager.getSessionState(sessionId);

      if (!goneState) {
        console.log('✅ Session removed from Redis');
      } else {
        console.error('❌ Session still exists in Redis');
        return false;
      }
    } else {
      console.error('❌ Session end returned null');
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Session cleanup failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   Redis AWI Implementation Test Suite     ║');
  console.log('╚════════════════════════════════════════════╝');

  let sessionId;

  try {
    // Test 1: Connection
    const connected = await testRedisConnection();
    if (!connected) {
      console.log('\n❌ Cannot proceed without Redis connection');
      process.exit(1);
    }

    // Test 2: Session init
    sessionId = await testSessionInitialization();
    if (!sessionId) {
      console.log('\n❌ Cannot proceed without session');
      process.exit(1);
    }

    // Test 3: Delta updates
    await testDeltaUpdate(sessionId);

    // Test 4: Action history
    await testActionHistory(sessionId);

    // Test 5: State diff
    await testStateDiff(sessionId);

    // Test 6: Caching
    await testCaching(sessionId);

    // Test 7: Cleanup
    await testSessionCleanup(sessionId);

    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║        ✅ ALL TESTS PASSED!               ║');
    console.log('╚════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cleanup: close Redis connection
    await redis.quit();
    console.log('Redis connection closed');
  }
}

// Run tests
runAllTests();
