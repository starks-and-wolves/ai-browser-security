# Blog AWI Installation Guide - Windows

Complete installation guide for setting up the Blog AWI platform on Windows 10/11.

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
5. **Windows Terminal** or **PowerShell** (Recommended)

---

## 📥 Installation Steps

### Step 1: Install Node.js

1. **Download Node.js:**
   - Visit https://nodejs.org/
   - Download **LTS version** (v20.x or higher)
   - Choose **Windows Installer (.msi)** for your system (64-bit recommended)

2. **Run Installer:**
   - Double-click the downloaded `.msi` file
   - Accept the license agreement
   - Keep default installation path: `C:\Program Files\nodejs\`
   - **Check:** "Automatically install necessary tools" (includes npm)
   - Click "Install"

3. **Verify Installation:**
   ```powershell
   # Open PowerShell or Command Prompt
   node --version
   # Output: v20.x.x or higher

   npm --version
   # Output: 10.x.x or higher
   ```

### Step 2: Install Redis

**Option 1: Using Memurai (Recommended for Windows)**

Memurai is a Redis-compatible server for Windows.

1. **Download Memurai:**
   - Visit https://www.memurai.com/get-memurai
   - Download **Memurai Developer** (free version)

2. **Install:**
   - Run the installer
   - Choose installation directory (default: `C:\Program Files\Memurai\`)
   - Select "Install as Windows Service"
   - Click "Install"

3. **Start Service:**
   ```powershell
   # Start Memurai service
   net start memurai

   # Verify it's running
   memurai-cli ping
   # Output: PONG
   ```

**Option 2: Using WSL2 (Windows Subsystem for Linux)**

1. **Enable WSL2:**
   ```powershell
   # Run as Administrator
   wsl --install
   ```

2. **Install Ubuntu from Microsoft Store**

3. **Install Redis in WSL:**
   ```bash
   sudo apt update
   sudo apt install redis-server
   sudo service redis-server start
   redis-cli ping
   # Output: PONG
   ```

**Option 3: Using Docker Desktop**

1. **Install Docker Desktop** from https://www.docker.com/products/docker-desktop

2. **Run Redis container:**
   ```powershell
   docker run -d --name redis -p 6379:6379 redis:latest

   # Test connection
   docker exec -it redis redis-cli ping
   # Output: PONG
   ```

### Step 3: Install Git (if not installed)

1. **Download Git:**
   - Visit https://git-scm.com/download/win
   - Download latest version

2. **Install:**
   - Run installer
   - Use recommended settings
   - Select "Git from the command line and also from 3rd-party software"

3. **Verify:**
   ```powershell
   git --version
   ```

### Step 4: Clone the Repository

```powershell
# Navigate to your projects directory
cd C:\Users\YourUsername\Projects

# Clone the repository (replace with actual repo URL)
git clone <repository-url> AWI
cd AWI
```

**Or** if you already have the files:
```powershell
cd C:\path\to\AWI
```

### Step 5: Install Backend Dependencies

```powershell
cd backend
npm install
```

**Expected output:**
```
added 200+ packages in 30s
```

**If you encounter errors:**
```powershell
# Clear npm cache
npm cache clean --force

# Try again
npm install
```

### Step 6: Install Frontend Dependencies

```powershell
cd ..\frontend
npm install
```

**Expected output:**
```
added 800+ packages in 45s
```

---

## ⚙️ Configuration

### Step 1: Configure Backend Environment

```powershell
cd backend

# Copy example .env file
copy .env.example .env

# Edit .env file
notepad .env
# Or use VS Code: code .env
```

### Step 2: Update Environment Variables

Edit `backend\.env`:

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

### Step 3: Configure Redis Password

**For Memurai:**

1. **Open Memurai configuration:**
   ```powershell
   notepad "C:\Program Files\Memurai\memurai.conf"
   ```

2. **Add password (replace with your own strong password):**
   ```
   requirepass your-secure-redis-password-here
   ```

3. **Restart Memurai:**
   ```powershell
   net stop memurai
   net start memurai
   ```

4. **Test with password:**
   ```powershell
   memurai-cli -a your-secure-redis-password-here ping
   # Output: PONG
   ```

**For Development (No Password):**
```bash
# In .env, set empty password
REDIS_PASSWORD=
```

### Step 4: Configure Frontend Environment

```powershell
cd ..\frontend

# Copy example .env
copy .env.example .env

# Edit .env
notepad .env
```

**Frontend .env:**
```bash
VITE_API_URL=http://localhost:5000
```

---

## 🚀 Running the Application

### Option 1: Run Both Servers Separately (Recommended)

**PowerShell Window 1 - Backend:**
```powershell
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

**PowerShell Window 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

**Expected output:**
```
VITE v5.4.11  ready in 793 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### Option 2: Run in Background (Using PowerShell)

**Backend:**
```powershell
cd backend
Start-Process npm -ArgumentList "run", "dev" -WindowStyle Hidden

# View running processes
Get-Process | Where-Object {$_.ProcessName -like "*node*"}
```

**Frontend:**
```powershell
cd frontend
Start-Process npm -ArgumentList "run", "dev" -WindowStyle Hidden
```

**Stop background processes:**
```powershell
# Stop all Node processes
Get-Process node | Stop-Process -Force

# Or stop specific process by ID
Stop-Process -Id <PID> -Force
```

### Option 3: Using Windows Terminal (Recommended)

1. **Install Windows Terminal** from Microsoft Store (if not installed)

2. **Create split panes:**
   - Open Windows Terminal
   - Split pane horizontally: `Alt + Shift + -`
   - Split pane vertically: `Alt + Shift + +`

3. **Run backend in one pane, frontend in another**

---

## ✅ Verification

### 1. Check Backend Health

```powershell
# Using curl (PowerShell 7+)
curl http://localhost:5000/api/health

# Using Invoke-WebRequest (All PowerShell versions)
Invoke-WebRequest -Uri http://localhost:5000/api/health | Select-Object -ExpandProperty Content
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

```powershell
# PowerShell 7+
curl http://localhost:5000/.well-known/llm-text | ConvertFrom-Json

# All PowerShell versions
Invoke-WebRequest -Uri http://localhost:5000/.well-known/llm-text | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

### 4. Check Redis Connection

**Memurai:**
```powershell
memurai-cli -a your-secure-redis-password-here ping
```

**Docker:**
```powershell
docker exec -it redis redis-cli ping
```

**Expected:** `PONG`

### 5. Run Rate Limit Tests

```powershell
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

1. **Start Memurai service:**
   ```powershell
   net start memurai
   ```

2. **Check Memurai status:**
   ```powershell
   Get-Service memurai
   ```

3. **Check if port is in use:**
   ```powershell
   netstat -ano | findstr :6379
   ```

4. **Restart Memurai:**
   ```powershell
   net stop memurai
   net start memurai
   ```

### Issue: MongoDB Connection Failed

**Error:**
```
MongoServerSelectionError: getaddrinfo ENOTFOUND
```

**Solutions:**

1. **Check internet connection** (using MongoDB Atlas)
2. **Verify MongoDB URI** in `.env`
3. **Check Windows Firewall:**
   - Windows Security → Firewall & network protection
   - Allow Node.js through firewall
4. **Disable VPN temporarily** (if using)

### Issue: Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solutions:**

1. **Find process using port:**
   ```powershell
   netstat -ano | findstr :5000
   ```

2. **Kill process:**
   ```powershell
   # Get PID from above command, then:
   taskkill /PID <PID> /F
   ```

3. **Change port** in `backend\.env`:
   ```bash
   PORT=5001
   ```

### Issue: npm install fails

**Error:**
```
npm ERR! code ENOENT
npm ERR! syscall rename
```

**Solutions:**

1. **Run as Administrator:**
   - Right-click PowerShell → "Run as Administrator"
   ```powershell
   npm install
   ```

2. **Clear npm cache:**
   ```powershell
   npm cache clean --force
   ```

3. **Delete and reinstall:**
   ```powershell
   Remove-Item -Recurse -Force node_modules
   Remove-Item package-lock.json
   npm install
   ```

4. **Disable antivirus temporarily** (can interfere with npm)

5. **Use long path support:**
   ```powershell
   # Run as Administrator
   New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
   ```

### Issue: Permission Denied

**Error:**
```
EPERM: operation not permitted
```

**Solutions:**

1. **Run PowerShell as Administrator**

2. **Change execution policy:**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **Check folder permissions:**
   - Right-click folder → Properties → Security
   - Ensure your user has "Full control"

### Issue: Frontend Shows Blank Page

**Solutions:**

1. **Check browser console** (F12) for errors
2. **Verify API URL** in `frontend\.env`:
   ```bash
   VITE_API_URL=http://localhost:5000
   ```
3. **Check backend is running:**
   ```powershell
   curl http://localhost:5000/api/health
   ```
4. **Clear browser cache** (Ctrl + Shift + Delete)
5. **Try different browser** (Chrome, Firefox, Edge)

### Issue: CORS Errors

**Error:**
```
Access to fetch blocked by CORS policy
```

**Solutions:**

1. **Check CORS_ORIGIN** in `backend\.env`:
   ```bash
   CORS_ORIGIN=http://localhost:5173
   ```

2. **Restart backend server**

3. **Check Windows Firewall** isn't blocking connections

### Issue: Scripts Disabled

**Error:**
```
cannot be loaded because running scripts is disabled on this system
```

**Solution:**
```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 🔍 Useful Commands

### Check Running Services

```powershell
# Check if backend is running
Invoke-WebRequest http://localhost:5000/api/health

# Check if frontend is running
Invoke-WebRequest http://localhost:5173

# Check Redis/Memurai
Get-Service memurai

# Check all Node processes
Get-Process | Where-Object {$_.ProcessName -like "*node*"}

# Check ports in use
netstat -ano | findstr :5000
netstat -ano | findstr :5173
netstat -ano | findstr :6379
```

### Logs and Debugging

```powershell
# Backend logs (appear in terminal when running npm run dev)

# Memurai logs
Get-Content "C:\ProgramData\Memurai\Logs\memurai.log" -Tail 50

# Check Redis keys (Memurai)
memurai-cli -a YOUR_PASSWORD keys "*"

# Monitor Redis commands
memurai-cli -a YOUR_PASSWORD monitor
```

### Clean Restart

```powershell
# Stop all Node processes
Get-Process node | Stop-Process -Force

# Stop Redis/Memurai
net stop memurai

# Start fresh
net start memurai

# Start backend (in one PowerShell window)
cd backend
npm run dev

# Start frontend (in another PowerShell window)
cd frontend
npm run dev
```

---

## 📚 Additional Resources

- **Node.js Documentation:** https://nodejs.org/docs/
- **Memurai Documentation:** https://docs.memurai.com/
- **MongoDB Atlas:** https://www.mongodb.com/docs/atlas/
- **Vite Documentation:** https://vitejs.dev/guide/
- **Windows Terminal:** https://aka.ms/terminal

## 🎓 Next Steps

1. **Read the documentation:**
   - `README.md` - Project overview
   - `RATE_LIMIT_CONFIGURATION.md` - Rate limit setup
   - `backend\QUICK_RATE_LIMIT_GUIDE.md` - Quick reference

2. **Run tests:**
   ```powershell
   npm run test:rate-limits
   ```

3. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000/api
   - API Docs: http://localhost:5000/api/agent/docs/ui
   - AWI Discovery: http://localhost:5000/.well-known/llm-text

4. **Create your first blog post** via the UI or API

---

## 💡 Windows-Specific Tips

### Use Windows Terminal

Download from Microsoft Store for better terminal experience:
- Multiple tabs
- Split panes
- Better copy/paste
- Unicode support

### Path Issues

Windows uses backslashes in paths:
```powershell
# Correct
cd C:\Users\YourName\Projects\AWI\backend

# Also works (PowerShell)
cd C:/Users/YourName/Projects/AWI/backend
```

### Environment Variables

Set temporary environment variables:
```powershell
$env:PORT=5001
npm run dev
```

### Visual Studio Code

Integrated terminal in VS Code is convenient:
- Open project: `code C:\path\to\AWI`
- Terminal: Ctrl + ` (backtick)
- Split terminal: Click "+" icon

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review server logs
3. Check Windows Event Viewer for system errors
4. Check GitHub issues
5. Contact the development team

---

## ⚠️ Important Notes

1. **Antivirus:** May interfere with npm install. Add exceptions for:
   - `C:\Users\YourName\AppData\Roaming\npm`
   - Project directory

2. **Windows Defender:** May slow down npm operations. Consider:
   - Adding exclusions for node_modules folders
   - Disabling real-time protection during installation

3. **Long Paths:** Windows has 260 character path limit. Enable long paths:
   ```powershell
   # Run as Administrator
   New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
   ```

4. **Line Endings:** Git may convert line endings. Configure:
   ```powershell
   git config --global core.autocrlf true
   ```

---

**Installation Guide Version:** 1.0.0
**Last Updated:** 2026-01-17
**Platform:** Windows 10/11 (Tested on Windows 11 23H2)
