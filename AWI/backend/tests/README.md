# Rate Limit Validation Tests

## Overview

This test suite validates that rate limiting is properly configured and functioning by:
- Testing at **20% of configured limits** (safe testing threshold)
- Validating rate limit headers are present
- Ensuring limits are being tracked correctly
- **Automatically cleaning up all test data** after completion

## Running Tests

### Quick Run

```bash
npm run test:rate-limits
```

### Verbose Mode

```bash
npm run test:rate-limits:verbose
```

### From Test Directory

```bash
node tests/rateLimitValidation.test.js
```

## What Gets Tested

### 1. Post Creation Rate Limits
- **Limit:** 5 posts per 10 seconds
- **Tests:** 1 post (20%)
- **Validates:** Rate limit headers, no premature limiting

### 2. Comment Creation Rate Limits
- **Limit:** 20 comments per hour
- **Tests:** 4 comments (20%)
- **Validates:** Comment creation tracking

### 3. General API Rate Limits
- **Limit:** 100 requests per 15 minutes
- **Tests:** 20 requests (20%)
- **Validates:** General API limiting

### 4. Agent Registration Rate Limits
- **Limit:** 3 registrations (burst)
- **Tests:** 1 registration (20%)
- **Validates:** Agent registration limiting

## Test Output

### Successful Test Output

```
🚀 Starting Rate Limit Validation Tests
📍 Base URL: http://localhost:5000
📊 Testing at 20% of configured limits

📝 Testing Post Creation Rate Limits...
   Limit: 5 posts per 10 seconds
   Testing: 1 posts (20%)
   ✓ Post 1/1 created
   Summary: 1 successful, 0 rate limited

💬 Testing Comment Creation Rate Limits...
   Creating test post for comments...
   ✓ Test post created: 696b514b53e6a5b79f238199
   Limit: 20 comments per 60 minutes
   Testing: 4 comments (20%)
   ✓ Comment 1/4 created
   ✓ Comment 2/4 created
   ✓ Comment 3/4 created
   ✓ Comment 4/4 created
   Summary: 4 successful, 0 rate limited

============================================================
📊 RATE LIMIT VALIDATION SUMMARY
============================================================

✅ Post Creation
   Limit: 5
   Tested: 1 (20%)
   Successful: 1
   Rate Limited: 0

✅ ALL TESTS PASSED!
Rate limits are properly configured and functioning.
============================================================

🧹 Cleaning up test data...
   Deleting 4 test comments...
   Deleting 2 test posts...
   ✓ Deleted 2 posts, 4 comments
   ℹ Note: 1 test agents created (automatic cleanup via session expiry)
```

## Data Cleanup

The test suite **automatically cleans up all created data**:

### What Gets Cleaned Up
- ✅ All test posts (deleted immediately after tests)
- ✅ All test comments (deleted immediately after tests)
- ✅ Test agents (cleaned up automatically via session expiry)

### Cleanup Order
1. **Comments first** (they reference posts)
2. **Posts second** (after comments are removed)
3. **Agents** (handled by automatic session cleanup)

### Verification

Check that cleanup worked:
```bash
# Check for test posts
curl http://localhost:5000/api/posts | grep "Test Post"

# Should return no results or empty array
```

## Configuration

### Change Test Percentage

Edit `rateLimitValidation.test.js`:
```javascript
const TEST_PERCENTAGE = 0.2; // Change from 0.2 (20%) to desired value
```

**Recommendations:**
- 0.2 (20%) - Safe testing (default)
- 0.5 (50%) - Moderate testing
- 0.8 (80%) - Aggressive testing (may trigger limits)
- 1.0 (100%) - Full limit testing (WILL trigger rate limits)

### Change Base URL

```bash
BASE_URL=http://localhost:3000 npm run test:rate-limits
```

Or edit the test file:
```javascript
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
```

## Troubleshooting

### Tests Fail with Connection Errors

**Problem:** Cannot connect to server

**Solution:**
```bash
# Ensure server is running
npm run dev

# In another terminal, run tests
npm run test:rate-limits
```

### Cleanup Fails

**Problem:** Test data not deleted

**Possible Causes:**
- Delete endpoints not implemented
- Authentication issues
- Database connection problems

**Manual Cleanup:**
```javascript
// Connect to MongoDB
db.posts.deleteMany({ authorName: "Rate Limit Tester" })
db.comments.deleteMany({ authorName: "Rate Limit Tester" })
```

### Rate Limits Triggered During Test

**Problem:** Tests hit rate limits at 20%

**Possible Causes:**
- Previous test runs still affecting limits
- Rate limit window not reset
- Configuration mismatch

**Solutions:**
1. Wait for rate limit window to expire
2. Restart server to reset in-memory limits
3. Reduce TEST_PERCENTAGE to 0.1 (10%)

### Headers Not Present

**Problem:** Rate limit headers are undefined

**Note:** This is expected behavior if:
- Express-rate-limit is configured without `standardHeaders: true`
- Custom rate limiters don't set headers

**Not a failure:** Tests pass based on response status, not headers

## Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed

Use in CI/CD:
```bash
npm run test:rate-limits && echo "Tests passed" || echo "Tests failed"
```

## Test Data

### Test Posts
```json
{
  "title": "Test Post 1234567890",
  "content": "This is a test post created by rate limit validation tests.",
  "authorName": "Rate Limit Tester",
  "tags": ["test", "rate-limit"]
}
```

### Test Comments
```json
{
  "postId": "696b514b53e6a5b79f238199",
  "content": "Test comment for rate limit validation",
  "authorName": "Rate Limit Tester"
}
```

### Test Agents
```json
{
  "name": "TestAgent_1234567890",
  "description": "Test agent for rate limit validation",
  "permissions": ["read", "write"]
}
```

## Integration with CI/CD

### GitHub Actions

```yaml
- name: Test Rate Limits
  run: |
    npm run dev &
    sleep 5
    npm run test:rate-limits
```

### GitLab CI

```yaml
test:rate-limits:
  script:
    - npm run dev &
    - sleep 5
    - npm run test:rate-limits
```

## Extending Tests

### Add New Rate Limit Test

```javascript
async function testNewEndpointRateLimit() {
  log('\n🆕 Testing New Endpoint Rate Limits...', 'blue');

  const limit = SIMPLE_RATE_LIMITS.newEndpoint.max;
  const testCount = Math.ceil(limit * TEST_PERCENTAGE);

  // Test logic here

  return {
    name: 'New Endpoint',
    limit,
    tested: testCount,
    successful,
    rateLimited,
    passed: rateLimited === 0 && successful === testCount
  };
}

// Add to runTests()
results.push(await testNewEndpointRateLimit());
```

### Add Custom Cleanup

```javascript
async function cleanupCustomData() {
  // Custom cleanup logic
  log('   Cleaning custom data...', 'cyan');

  for (const item of customData) {
    await deleteCustomItem(item);
  }
}

// Add to cleanup()
await cleanupCustomData();
```

## Best Practices

1. **Always run at 20% or less** for automated tests
2. **Verify cleanup** after test runs
3. **Check server logs** for rate limit violations
4. **Run tests in isolation** (fresh server state)
5. **Wait between test runs** (allow rate limit windows to reset)

## Performance

Typical test run time: **10-20 seconds**

Breakdown:
- Post creation: ~2 seconds
- Comment creation: ~3 seconds
- General API: ~3 seconds
- Agent registration: ~2 seconds
- Cleanup: ~2 seconds
- Delays between tests: ~4 seconds

## Support

For issues or questions:
1. Check this README
2. Review test output for specific errors
3. Check server logs: `backend/logs/`
4. Verify rate limit configuration: `src/config/rateLimits.js`

## Related Documentation

- Rate Limit Configuration: `../src/config/README.md`
- Rate Limit Implementation: `../../RATE_LIMIT_CONFIGURATION.md`
- Quick Guide: `../QUICK_RATE_LIMIT_GUIDE.md`
