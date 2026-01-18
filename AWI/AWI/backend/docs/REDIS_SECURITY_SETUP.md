# Redis Security Setup - Password Authentication

## Overview

By default, Redis runs without authentication. For production environments (and even development with sensitive data), you should enable password authentication.

---

## Method 1: Configure via redis.conf (Persistent)

### Step 1: Find Redis Configuration File

```bash
# Find redis.conf location
redis-cli INFO server | grep config_file

# Or check common locations:
# macOS (Homebrew): /opt/homebrew/etc/redis.conf
# Linux: /etc/redis/redis.conf
# Docker: /usr/local/etc/redis/redis.conf
```

### Step 2: Edit redis.conf

```bash
# Open redis.conf
nano /opt/homebrew/etc/redis.conf

# Or with sudo on Linux
sudo nano /etc/redis/redis.conf
```

### Step 3: Set Password

Find the line:
```
# requirepass foobared
```

Uncomment and change to your password:
```
requirepass your-strong-password-here
```

**Generate a strong password:**
```bash
# Generate random password
openssl rand -base64 32
# Example output: Kj8vX9mQ2pL5nR7tY4wU6eH3cF1aZ0bV
```

### Step 4: Restart Redis

```bash
# macOS (Homebrew)
brew services restart redis

# Linux (systemd)
sudo systemctl restart redis

# Docker
docker restart redis-container
```

### Step 5: Verify

```bash
# Test without password (should fail)
redis-cli ping
# Output: (error) NOAUTH Authentication required.

# Test with password (should succeed)
redis-cli -a your-strong-password-here ping
# Output: PONG
```

---

## Method 2: Set Password Runtime (Temporary)

This works until Redis restarts:

```bash
# Connect to Redis
redis-cli

# Set password
CONFIG SET requirepass "your-strong-password-here"

# Test
AUTH your-strong-password-here
PING
# Output: PONG
```

---

## Method 3: Using ACL (Redis 6+)

Redis 6+ has advanced ACL (Access Control Lists):

### Step 1: Create ACL User

```bash
redis-cli

# Create user with password
ACL SETUSER awi_user on >your-password ~* +@all

# View users
ACL LIST

# Test authentication
AUTH awi_user your-password
```

### Step 2: Save ACL Configuration

```bash
# Save to redis.conf
ACL SAVE

# Or add to redis.conf:
# user awi_user on >your-password ~* +@all
```

---

## Update Your Application to Use Password

### Option 1: Environment Variable (Recommended)

Update `.env`:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-strong-password-here
REDIS_DB=0
```

Your existing code already supports this! Look at `src/config/redis.js`:

```javascript
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,  // ← Already there!
  // ...
};
```

### Option 2: Connection String

```env
REDIS_URL=redis://:your-password@localhost:6379/0
```

Then update `redis.js`:

```javascript
const redis = new Redis(process.env.REDIS_URL || {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
});
```

---

## Quick Setup Guide (macOS with Homebrew)

```bash
# 1. Find redis.conf location
redis-cli INFO server | grep config_file

# 2. Edit redis.conf
nano /opt/homebrew/etc/redis.conf

# 3. Add this line (or uncomment and change):
requirepass MySecurePassword123!

# 4. Restart Redis
brew services restart redis

# 5. Update .env
echo "REDIS_PASSWORD=your-generated-password-here" >> .env

# 6. Test connection
redis-cli -a your-generated-password-here ping
# Output: PONG

# 7. Test from Node.js
node -e "const {redis} = require('./src/config/redis'); redis.ping().then(r => console.log('✅ Connected:', r));"
```

---

## Security Best Practices

### 1. Use Strong Passwords

```bash
# Generate strong password (32 characters)
openssl rand -base64 32

# Or use a password manager
# Recommended: At least 20 characters with mixed case, numbers, symbols
```

### 2. Bind to Localhost Only (Development)

In `redis.conf`:

```
bind 127.0.0.1 ::1
```

This prevents external connections.

### 3. Enable Protected Mode

In `redis.conf`:

```
protected-mode yes
```

### 4. Disable Dangerous Commands

In `redis.conf`:

```
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""
rename-command SHUTDOWN ""
```

### 5. Use TLS/SSL (Production)

For production with remote Redis:

```env
REDIS_TLS=true
REDIS_HOST=redis.example.com
REDIS_PORT=6380
REDIS_PASSWORD=your-password
```

Update `redis.js`:

```javascript
const redisConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  // ...
};
```

---

## Common Redis Configuration File Locations

| System | Location |
|--------|----------|
| **macOS (Homebrew)** | `/opt/homebrew/etc/redis.conf` |
| **Linux (apt)** | `/etc/redis/redis.conf` |
| **Linux (yum)** | `/etc/redis.conf` |
| **Docker** | `/usr/local/etc/redis/redis.conf` |
| **Windows (WSL)** | `/etc/redis/redis.conf` |

---

## Testing Password Authentication

### From Command Line:

```bash
# Without password (should fail)
redis-cli ping
# (error) NOAUTH Authentication required.

# With password (should work)
redis-cli -a your-password ping
# PONG

# With AUTH command
redis-cli
127.0.0.1:6379> AUTH your-password
OK
127.0.0.1:6379> PING
PONG
```

### From Node.js:

```javascript
// test_redis_auth.js
require('dotenv').config();
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
});

redis.ping().then(result => {
  console.log('✅ PING response:', result);
  redis.quit();
}).catch(err => {
  console.error('❌ PING failed:', err.message);
  process.exit(1);
});
```

Run:
```bash
node test_redis_auth.js
```

---

## Docker Compose Example

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD}

  backend:
    build: .
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    depends_on:
      - redis

volumes:
  redis-data:
```

---

## Troubleshooting

### Error: NOAUTH Authentication required

**Cause**: Redis requires password but you didn't provide one

**Fix**:
```bash
# Add password to .env
echo "REDIS_PASSWORD=your-password" >> .env

# Or use redis-cli with -a flag
redis-cli -a your-password
```

### Error: WRONGPASS invalid username-password pair

**Cause**: Incorrect password

**Fix**:
```bash
# Check redis.conf for correct password
grep requirepass /opt/homebrew/etc/redis.conf

# Or check via CONFIG GET (if you have access)
redis-cli CONFIG GET requirepass
```

### Error: Connection refused

**Cause**: Redis not running

**Fix**:
```bash
# Start Redis
brew services start redis

# Or manually
redis-server /opt/homebrew/etc/redis.conf
```

---

## Production Recommendations

### AWS ElastiCache Redis

```env
REDIS_HOST=your-elasticache-endpoint.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=your-auth-token
REDIS_TLS=true
```

### Redis Cloud

```env
REDIS_HOST=redis-12345.c123.us-east-1-1.ec2.cloud.redislabs.com
REDIS_PORT=12345
REDIS_PASSWORD=your-password
REDIS_TLS=true
```

### Heroku Redis

```env
REDIS_URL=redis://:password@hostname:port/0
```

---

## Summary

**Quick Setup (Development):**

```bash
# 1. Edit redis.conf
nano /opt/homebrew/etc/redis.conf

# 2. Add password
requirepass YourPassword123

# 3. Restart Redis
brew services restart redis

# 4. Update .env
echo "REDIS_PASSWORD=your-generated-password-here" >> backend/.env

# 5. Test
redis-cli -a your-generated-password-here ping
```

**Your application already supports password auth!** Just set the `REDIS_PASSWORD` environment variable.

✅ **Password authentication is now enabled and secure!**
