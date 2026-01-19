# Quick Rate Limit Modification Guide

## 🎯 TL;DR

**To change rate limits:**
1. Edit `src/config/rateLimits.js`
2. Save file (server auto-restarts)
3. Done! All changes apply automatically

## 📝 Quick Examples

### Increase Post Creation by 10x

```javascript
// File: src/config/rateLimits.js

// Change from:
post: {
  windowMs: 10 * 1000,
  max: 5,
  // ...
}

// To:
post: {
  windowMs: 10 * 1000,
  max: 50,  // 5 * 10
  // ...
}
```

### Change Time Window

```javascript
// 5 posts per 30 seconds (instead of 10)
post: {
  windowMs: 30 * 1000,  // Change from 10 * 1000
  max: 5,
  // ...
}
```

### Increase ALL Advanced Limits by 10x

```javascript
// In OPERATION_RATE_LIMITS, multiply all values:
create_post: {
  hourly: 1500,   // 150 * 10
  minute: 150,    // 15 * 10
  burst: 50,      // 5 * 10
  cooldown: 2,    // Keep cooldown same
  description: 'Create new post'
}
```

## 🧪 Test Your Changes

```bash
# Check manifest reflects new limits
curl -s http://localhost:5000/.well-known/llm-text | jq '.rate_limits.active.create_post'

# Test rate limiting works
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/posts \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"Test $i\",\"content\":\"Content\"}"
done
```

## 🚫 Disable Rate Limiting (Testing Only)

```bash
RATE_LIMIT_ENABLED=false npm run dev
```

## 📊 Current Limits

```
Post Creation:   5 per 10 seconds
Comments:        20 per hour
File Uploads:    30 per hour
General API:     100 per 15 minutes
```

## 📚 Full Documentation

- **Configuration Details:** `src/config/README.md`
- **Implementation Guide:** `../RATE_LIMIT_CONFIGURATION.md`
- **Rate Limit Config:** `src/config/rateLimits.js`

## ✨ What's Automatic

When you edit `rateLimits.js`, these update automatically:
- ✅ Express middleware rate limiters
- ✅ AWI agent rate limiters
- ✅ API documentation (`.well-known/llm-text`)
- ✅ Swagger/OpenAPI specs
- ✅ Capabilities endpoint

**No other files need editing!**
