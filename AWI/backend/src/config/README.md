# Rate Limiting Configuration Guide

## Overview

All rate limiting settings for the Blog AWI platform are centralized in `rateLimits.js`. This file is the **single source of truth** for all rate limit values used throughout the application.

## Configuration File

**Location:** `src/config/rateLimits.js`

This file contains all rate limiting configurations that are automatically applied to:
- Express middleware rate limiters
- AWI agent rate limiters
- API documentation (`.well-known/llm-text`)
- Swagger/OpenAPI specs

## How to Modify Rate Limits

### 1. Edit the Configuration File

Open `src/config/rateLimits.js` and modify the values:

```javascript
const SIMPLE_RATE_LIMITS = {
  post: {
    windowMs: 10 * 1000,  // 10 seconds
    max: 5,               // 5 requests
    // ... message
  }
};
```

### 2. Restart the Server

The changes will be applied automatically when the server restarts:
- **Development:** nodemon will auto-restart
- **Production:** Manually restart the server

### 3. Verify Changes

Check the updated limits:
```bash
curl http://localhost:5000/.well-known/llm-text | jq '.rate_limits'
```

## Configuration Sections

### SIMPLE_RATE_LIMITS

Used by the basic Express rate limiter (`src/middleware/rateLimiter.js`).

**Properties:**
- `windowMs` - Time window in milliseconds
- `max` - Maximum requests in the window
- `message` - Error message when limit exceeded

**Example:**
```javascript
post: {
  windowMs: 10 * 1000,  // 10 seconds
  max: 5,               // Allow 5 posts
  message: { ... }
}
```

### OPERATION_RATE_LIMITS

Advanced rate limits with burst protection for AWI agents.

**Properties:**
- `hourly` - Maximum requests per hour
- `minute` - Maximum requests per minute
- `burst` - Maximum requests in quick succession (10 seconds)
- `cooldown` - Minimum seconds between requests (optional)
- `description` - Human-readable description

**Example:**
```javascript
create_post: {
  hourly: 150,
  minute: 15,
  burst: 5,
  cooldown: 2,
  description: 'Create new post'
}
```

### REPUTATION_MULTIPLIERS

Adjusts rate limits based on agent reputation.

**Values:**
- `trusted: 2.0` - 2x the normal limits
- `normal: 1.0` - Standard limits
- `suspicious: 0.5` - Half the limits
- `restricted: 0.1` - 10% of limits

### RATE_LIMIT_DESCRIPTIONS

Human-readable descriptions used in API documentation and manifests.

These are **automatically generated** from the configuration values, but you can customize the format here if needed for documentation purposes.

## Common Scenarios

### Increase All Limits by 10x

Multiply all `max`, `hourly`, `minute`, and `burst` values by 10:

```javascript
// Before
post: {
  windowMs: 10 * 1000,
  max: 5,
  // ...
}

// After
post: {
  windowMs: 10 * 1000,
  max: 50,  // 5 * 10
  // ...
}
```

### Disable Rate Limiting

Set environment variable:
```bash
RATE_LIMIT_ENABLED=false
```

Or modify `RATE_LIMIT_SETTINGS` in `rateLimits.js`:
```javascript
const RATE_LIMIT_SETTINGS = {
  enabled: false,  // Disable all rate limiting
  // ...
};
```

### Change Time Windows

Modify `windowMs` values:
```javascript
// 5 posts per 30 seconds (instead of 10 seconds)
post: {
  windowMs: 30 * 1000,  // 30 seconds
  max: 5,
  // ...
}
```

### Adjust Cooldown Periods

Modify `cooldown` values in `OPERATION_RATE_LIMITS`:
```javascript
create_post: {
  // ...
  cooldown: 1,  // 1 second (instead of 2)
}
```

## Files Updated Automatically

When you modify `rateLimits.js`, the following are automatically updated:

1. **Express Middleware** (`src/middleware/rateLimiter.js`)
   - General API limiter
   - Post creation limiter
   - Comment limiter
   - Upload limiter

2. **AWI Agent Rate Limiter** (`src/middleware/agentRateLimiter.js`)
   - Per-operation limits
   - Burst protection
   - Cooldown enforcement

3. **Rate Limit Config** (`src/config/rateLimitConfig.js`)
   - Operation limits
   - Reputation multipliers
   - Settings

4. **AWI Manifest** (`/.well-known/llm-text`)
   - Dynamically generated from configuration
   - No manual updates needed

5. **API Documentation**
   - Swagger/OpenAPI specs
   - Agent capability endpoints

## Testing Rate Limits

### Test Post Creation Limit (5 per 10 seconds)

```bash
# Create 6 posts in quick succession
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/posts \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"Test $i\",\"content\":\"Content\"}"
  echo ""
done
```

The 6th request should be rate limited.

### Test with API Key

```bash
# Register agent
RESPONSE=$(curl -X POST http://localhost:5000/api/agent/register \
  -H "Content-Type: application/json" \
  -d '{"name":"TestAgent","permissions":["write"]}')

API_KEY=$(echo $RESPONSE | jq -r '.agent.apiKey')

# Test with agent key
curl -X POST http://localhost:5000/api/agent/posts \
  -H "X-Agent-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"Content"}'
```

## Environment Variables

Configure rate limiting via environment variables:

```bash
# Disable rate limiting
RATE_LIMIT_ENABLED=false

# Cleanup interval (milliseconds)
RATE_LIMIT_CLEANUP_INTERVAL=60000
```

## Troubleshooting

### Changes Not Applied

1. Ensure server restarted after config changes
2. Clear any Redis cache: `redis-cli FLUSHDB`
3. Check server logs for errors

### Rate Limits Too Strict

Temporarily disable for testing:
```bash
RATE_LIMIT_ENABLED=false npm run dev
```

### Rate Limits Not Enforced

1. Check `RATE_LIMIT_SETTINGS.enabled` is `true`
2. Verify middleware is loaded in `server.js`
3. Check for errors in server logs

## Best Practices

1. **Test Changes:** Always test rate limit changes in development first
2. **Monitor Logs:** Watch for rate limit violations in production
3. **Gradual Changes:** Adjust limits incrementally, not drastically
4. **Document Reasons:** Comment why specific limits were chosen
5. **Reputation System:** Use reputation multipliers instead of global changes

## Security Considerations

- **Too Lenient:** Risk of abuse, DoS attacks, resource exhaustion
- **Too Strict:** Legitimate users blocked, poor user experience
- **Balance:** Start conservative, relax based on monitoring

Recommended approach:
- Start with strict limits
- Monitor for false positives
- Adjust based on actual usage patterns
- Use reputation system for trusted agents

## Support

For questions about rate limiting configuration:
1. Check this README
2. Review `src/config/rateLimits.js` comments
3. See `docs/AWI_DISCOVERY.md` for AWI-specific info
