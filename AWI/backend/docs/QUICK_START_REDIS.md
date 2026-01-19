# Quick Start: Redis Password Setup

## Option 1: Automated Setup (Recommended)

Run the setup script:

```bash
cd /Users/hritish.jain/ai_security/AWI/backend
./setup_redis_password.sh
```

This will:
- ✅ Generate a strong 24-character password
- ✅ Backup your redis.conf
- ✅ Configure Redis with the password
- ✅ Add password to your .env file
- ✅ Restart Redis
- ✅ Test the connection

---

## Option 2: Manual Setup

### Step 1: Generate Password

```bash
openssl rand -base64 24
```

Example output: `abc123XYZ456def789GHI012jkl345`

### Step 2: Edit redis.conf

```bash
nano /opt/homebrew/etc/redis.conf
```

Find and uncomment/change (use your own generated password):
```
requirepass your-generated-password-here
```

### Step 3: Update .env

```bash
echo "REDIS_PASSWORD=your-generated-password-here" >> .env
```

### Step 4: Restart Redis

```bash
brew services restart redis
```

### Step 5: Test

```bash
redis-cli -a Kj8vX9mQ2pL5nR7tY4wU6eH3cF1a ping
```

Should return: `PONG`

---

## Verify Setup

### Test from command line:

```bash
# Without password (should fail)
redis-cli ping
# Expected: (error) NOAUTH Authentication required.

# With password (should work)
redis-cli -a "your-password" ping
# Expected: PONG
```

### Test from Node.js:

```bash
node test_redis_awi.js
```

Should show: `✅ Redis connected: PONG`

---

## Common Commands

### View current password (if you have access):

```bash
redis-cli CONFIG GET requirepass
```

### Connect to Redis CLI:

```bash
redis-cli -a "your-password"
```

### View all sessions:

```bash
redis-cli -a "your-password" KEYS "AWI:SESSION:*"
```

### Get session state:

```bash
redis-cli -a "your-password" GET "AWI:SESSION:sess_abc123"
```

---

## Troubleshooting

### Can't find redis.conf

```bash
redis-cli INFO server | grep config_file
```

### Forgot password

1. Stop Redis: `brew services stop redis`
2. Edit redis.conf: `nano /opt/homebrew/etc/redis.conf`
3. Comment out: `# requirepass ...`
4. Start Redis: `brew services start redis`
5. Run setup script again

### Connection refused

```bash
# Check if Redis is running
redis-cli ping

# Start Redis
brew services start redis

# Check status
brew services list | grep redis
```

---

## Security Notes

- ⚠️ **Never commit .env to git** (already in .gitignore)
- ✅ Use strong passwords (at least 20 characters)
- ✅ Use different passwords for dev/staging/production
- ✅ Rotate passwords regularly in production
- ✅ Use environment variables, never hardcode

---

## Production Setup

For production, use:
- **Managed Redis** (AWS ElastiCache, Redis Cloud, etc.)
- **TLS/SSL encryption**
- **ACL users** with limited permissions
- **Network isolation** (VPC, private subnets)
- **Monitoring** (CloudWatch, Datadog, etc.)

---

**Ready to go!** Your Redis is now secured with password authentication.
