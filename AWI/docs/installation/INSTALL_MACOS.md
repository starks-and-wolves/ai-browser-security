# Blog AWI Installation Guide - macOS

Complete installation guide for setting up the Blog AWI platform on macOS.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation Steps](#installation-steps)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### Required Software

1. **Node.js (v20 or higher)**
2. **MongoDB** (Optional - using cloud MongoDB Atlas)
3. **Redis** (Required for AWI state management)
4. **Git** (For cloning repository)
5. **Homebrew** (Package manager for macOS)

---

## 📥 Installation Steps

### Step 1: Install Homebrew (if not installed)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Step 2: Install Node.js

```bash
# Install Node.js using Homebrew
brew install node

# Verify installation
node --version  # Should be v20 or higher
npm --version
```

**Alternative:** Download from [nodejs.org](https://nodejs.org/)

### Step 3: Install Redis

```bash
# Install Redis
brew install redis

# Start Redis service
brew services start redis

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### Step 4: Clone the Repository

```bash
# Navigate to your projects directory
cd ~/Projects

# Clone the repository (replace with actual repo URL)
git clone <repository-url> AWI
cd AWI
```

**Or** if you already have the files:
```bash
cd /Users/your-username/ai_security/AWI
```

### Step 5: Install Backend Dependencies

```bash
cd backend
npm install
```

**Expected output:**
```
added 200+ packages
```

### Step 6: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

**Expected output:**
```
added 800+ packages
```

---

## ⚙️ Configuration

### Step 1: Configure Backend Environment

```bash
cd backend

# Create .env file (if not exists)
cp .env.example .env

# Edit .env file
nano .env
# Or use your preferred editor: code .env, vim .env, etc.
```

### Step 2: Update Environment Variables

Edit `backend/.env`:

```bash
# MongoDB Configuration
# Option 1: Use your own MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?appName=<app>

# Option 2: Use local MongoDB
# MONGODB_URI=mongodb://localhost:27017/blog-awi

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-redis-password-here
REDIS_DB=0

# Server Configuration
PORT=5000
NODE_ENV=development

# Session Configuration
SESSION_TTL_MINUTES=30
LIST_CACHE_TTL_MINUTES=5
MEDIA_CACHE_TTL_MINUTES=60

# AWI Configuration
AWI_USE_REDIS=false
AWI_MODE_ENABLED=true
AWI_MAX_ACTIONS_PER_SESSION=1000

# CORS
CORS_ORIGIN=http://localhost:5173

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800
```

### Step 3: Set Redis Password (Optional but Recommended)

```bash
# Create Redis configuration
sudo nano /usr/local/etc/redis.conf

# Add this line (replace with your own strong password):
requirepass your-secure-redis-password-here

# Restart Redis
brew services restart redis

# Test with password
redis-cli -a your-secure-redis-password-here ping
# Should return: PONG
```

**Skip Redis password** (for development):
```bash
# In .env, set empty password
REDIS_PASSWORD=
```

### Step 4: Configure Frontend Environment

```bash
cd ../frontend

# Create .env file (if not exists)
cp .env.example .env

# Edit .env
nano .env
```

**Frontend .env:**
```bash
VITE_API_URL=http://localhost:5000
```

---

## 🚀 Running the Application

### Option 1: Run Both Servers Separately (Recommended for Development)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Expected output:**
```
⚠️  Using MongoDB-based AWI state management (legacy)
✅ Agent monitoring dashboard enabled at /api/admin
Server running in development mode on port 5000
✅ Redis connected
✅ Redis ready
MongoDB Connected: ac-u9ophsf-shard-00-00.oazncyh.mongodb.net
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Expected output:**
```
VITE v5.4.11  ready in 793 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### Option 2: Run in Background

**Backend (background):**
```bash
cd backend
nohup npm run dev > server.log 2>&1 &

# View logs
tail -f server.log
```

**Frontend (background):**
```bash
cd frontend
nohup npm run dev > frontend.log 2>&1 &

# View logs
tail -f frontend.log
```

**Stop background processes:**
```bash
# Find process IDs
ps aux | grep node

# Kill processes
kill <PID>

# Or kill all node processes (careful!)
pkill -f "node"
```

---

## ✅ Verification

### 1. Check Backend Health

```bash
curl http://localhost:5000/api/health
```

**Expected response:**
```json
{
  "success": true,
  "message": "Blog API is running",
  "services": {
    "mongodb": "connected",
    "redis": "connected"
  },
  "timestamp": "2026-01-17T12:00:00.000Z"
}
```

### 2. Check Frontend

Open browser: **http://localhost:5173/**

You should see the blog homepage.

### 3. Check AWI Discovery

```bash
curl http://localhost:5000/.well-known/llm-text | jq .
```

**Expected:** AWI manifest with rate limits and capabilities.

### 4. Check Redis Connection

```bash
redis-cli -a your-secure-redis-password-here ping
# Or without password:
redis-cli ping
```

**Expected:** `PONG`

### 5. Run Rate Limit Tests

```bash
cd backend
npm run test:rate-limits
```

**Expected:** All tests passed ✅

---

## 🐛 Troubleshooting

### Issue: Redis Connection Failed

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solutions:**

1. **Start Redis:**
   ```bash
   brew services start redis
   ```

2. **Check Redis status:**
   ```bash
   brew services list | grep redis
   ```

3. **Check Redis is listening:**
   ```bash
   lsof -i :6379
   ```

4. **Restart Redis:**
   ```bash
   brew services restart redis
   ```

### Issue: MongoDB Connection Failed

**Error:**
```
MongoServerSelectionError: getaddrinfo ENOTFOUND
```

**Solutions:**

1. **Check internet connection** (using MongoDB Atlas)
2. **Verify MongoDB URI** in `.env`
3. **Check firewall settings**
4. **Try MongoDB connection:**
   ```bash
   # Install mongosh (MongoDB Shell)
   brew install mongosh

   # Test connection (replace with your actual connection string)
   mongosh "mongodb+srv://<username>:<password>@<cluster>.mongodb.net/"
   ```

### Issue: Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solutions:**

1. **Find process using port:**
   ```bash
   lsof -i :5000
   ```

2. **Kill process:**
   ```bash
   kill -9 <PID>
   ```

3. **Change port** in `backend/.env`:
   ```bash
   PORT=5001
   ```

### Issue: npm install fails

**Error:**
```
npm ERR! code ENOENT
```

**Solutions:**

1. **Clear npm cache:**
   ```bash
   npm cache clean --force
   ```

2. **Delete node_modules and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Update npm:**
   ```bash
   npm install -g npm@latest
   ```

### Issue: Permission Denied

**Error:**
```
EACCES: permission denied
```

**Solutions:**

1. **Fix npm permissions:**
   ```bash
   sudo chown -R $USER:$(id -gn $USER) ~/.npm
   sudo chown -R $USER:$(id -gn $USER) ~/.config
   ```

2. **Don't use sudo with npm** (security risk)

3. **Use nvm** (Node Version Manager):
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 20
   nvm use 20
   ```

### Issue: Frontend Shows Blank Page

**Solutions:**

1. **Check browser console** for errors
2. **Verify API URL** in `frontend/.env`:
   ```bash
   VITE_API_URL=http://localhost:5000
   ```
3. **Check backend is running:**
   ```bash
   curl http://localhost:5000/api/health
   ```
4. **Clear browser cache** (Cmd + Shift + R)

### Issue: CORS Errors

**Error:**
```
Access to fetch at 'http://localhost:5000/api/posts' from origin 'http://localhost:5173' has been blocked by CORS
```

**Solutions:**

1. **Check CORS_ORIGIN** in `backend/.env`:
   ```bash
   CORS_ORIGIN=http://localhost:5173
   ```
2. **Restart backend server**

---

## 🔍 Useful Commands

### Check Running Services

```bash
# Check if backend is running
curl http://localhost:5000/api/health

# Check if frontend is running
curl http://localhost:5173

# Check Redis
redis-cli ping

# Check all Node processes
ps aux | grep node

# Check ports in use
lsof -i :5000
lsof -i :5173
lsof -i :6379
```

### Logs and Debugging

```bash
# Backend logs (if running with npm run dev)
# Logs appear in terminal

# Redis logs
tail -f /usr/local/var/log/redis.log

# Check Redis keys
redis-cli -a YOUR_PASSWORD keys "*"

# Monitor Redis commands
redis-cli -a YOUR_PASSWORD monitor
```

### Clean Restart

```bash
# Stop all services
pkill -f "node"
brew services stop redis

# Start fresh
brew services start redis
cd backend && npm run dev &
cd frontend && npm run dev &
```

---

## 📚 Additional Resources

- **Node.js Documentation:** https://nodejs.org/docs/
- **Redis Documentation:** https://redis.io/documentation
- **MongoDB Atlas:** https://www.mongodb.com/docs/atlas/
- **Vite Documentation:** https://vitejs.dev/guide/

## 🎓 Next Steps

1. **Read the documentation:**
   - `README.md` - Project overview
   - `RATE_LIMIT_CONFIGURATION.md` - Rate limit setup
   - `backend/QUICK_RATE_LIMIT_GUIDE.md` - Quick reference

2. **Run tests:**
   ```bash
   npm run test:rate-limits
   ```

3. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000/api
   - API Docs: http://localhost:5000/api/agent/docs/ui
   - AWI Discovery: http://localhost:5000/.well-known/llm-text

4. **Create your first blog post** via the UI or API

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review server logs
3. Check GitHub issues
4. Contact the development team

---

**Installation Guide Version:** 1.0.0
**Last Updated:** 2026-01-17
**Platform:** macOS (Tested on macOS Sonoma 14.x)
