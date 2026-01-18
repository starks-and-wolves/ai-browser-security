# Blog AWI - Installation Guide

Welcome to the Blog AWI platform! This guide will help you get started with installation on your operating system.

## 🚀 Quick Start

Choose your operating system for detailed installation instructions:

### 📱 Platform-Specific Guides

| Platform | Installation Guide | Quick Link |
|----------|-------------------|------------|
| 🍎 **macOS** | Complete setup guide for Mac users | [INSTALL_MACOS.md](INSTALL_MACOS.md) |
| 🪟 **Windows** | Complete setup guide for Windows 10/11 | [INSTALL_WINDOWS.md](INSTALL_WINDOWS.md) |
| 🐧 **Linux** | Similar to macOS (use package manager) | See macOS guide |

---

## 📋 Prerequisites Overview

Before installing, ensure you have:

- ✅ **Node.js** v20 or higher
- ✅ **Redis** (for AWI state management)
- ✅ **Git** (for cloning repository)
- ✅ **Internet connection** (for MongoDB Atlas)

### MongoDB Note

This application uses **MongoDB Atlas** (cloud database), so you **don't need** to install MongoDB locally.

---

## ⚡ Installation Summary

### 1. Install Dependencies

**macOS:**
```bash
brew install node redis
```

**Windows:**
- Download Node.js from https://nodejs.org/
- Install Memurai from https://www.memurai.com/

### 2. Clone Repository

```bash
git clone <repository-url> AWI
cd AWI
```

### 3. Install Packages

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. Configure Environment

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your settings

# Frontend
cd ../frontend
cp .env.example .env
# Edit .env with API URL
```

### 5. Start Services

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

### 6. Access Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000/api
- **API Docs:** http://localhost:5000/api/agent/docs/ui

---

## 🔧 Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Backend** | Node.js + Express | v20+ |
| **Frontend** | React + Vite | Latest |
| **Database** | MongoDB Atlas | Cloud |
| **Cache** | Redis/Memurai | Latest |
| **State** | AWI (Agent Web Interface) | v1.0 |

---

## 📁 Project Structure

```
AWI/
├── backend/              # Node.js/Express API server
│   ├── src/
│   │   ├── config/      # Configuration files
│   │   ├── controllers/ # Route controllers
│   │   ├── middleware/  # Express middleware
│   │   ├── models/      # MongoDB models
│   │   ├── routes/      # API routes
│   │   └── server.js    # Main server file
│   ├── tests/           # Test files
│   ├── uploads/         # Uploaded files
│   └── package.json
│
├── frontend/            # React/Vite frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   └── App.jsx      # Main app component
│   └── package.json
│
├── INSTALL_MACOS.md     # macOS installation guide
├── INSTALL_WINDOWS.md   # Windows installation guide
└── README.md            # Project overview
```

---

## 🎯 What You'll Be Running

### Backend Server (Port 5000)

- **REST API** for blog operations
- **AWI endpoints** for AI agent integration
- **File upload** handling
- **Rate limiting** and security
- **MongoDB** connection
- **Redis** connection for state management

### Frontend Server (Port 5173)

- **React application** with Vite
- **Blog UI** for creating/viewing posts
- **Rich text editor** (TipTap)
- **File upload** interface
- **Responsive design**

---

## ✅ Verification Checklist

After installation, verify everything works:

- [ ] Backend health check returns success
- [ ] Frontend loads in browser
- [ ] Redis connection established
- [ ] MongoDB connection established
- [ ] Can create a test blog post
- [ ] Can view blog posts
- [ ] Can add comments
- [ ] Rate limit tests pass

### Quick Health Check

```bash
# Backend health
curl http://localhost:5000/api/health

# Expected response:
# {
#   "success": true,
#   "services": {
#     "mongodb": "connected",
#     "redis": "connected"
#   }
# }
```

---

## 🧪 Running Tests

After installation, run the rate limit validation tests:

```bash
cd backend
npm run test:rate-limits
```

**Expected output:**
```
✅ ALL TESTS PASSED!
Rate limits are properly configured and functioning.
```

---

## 🐛 Common Issues & Solutions

### Issue: Cannot connect to MongoDB

**Cause:** No internet connection or firewall blocking

**Solution:**
- Check internet connection
- Disable VPN temporarily
- Check firewall settings

### Issue: Redis connection failed

**Cause:** Redis/Memurai not running

**Solution:**
- **macOS:** `brew services start redis`
- **Windows:** `net start memurai`

### Issue: Port already in use

**Cause:** Another process using port 5000 or 5173

**Solution:**
- Kill existing process
- Or change port in `.env` file

### Issue: npm install fails

**Cause:** Permissions, network, or cache issues

**Solution:**
```bash
# Clear cache
npm cache clean --force

# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

For detailed troubleshooting, see platform-specific guides.

---

## 📚 Documentation

### Getting Started
- [macOS Installation](INSTALL_MACOS.md) - Complete macOS setup
- [Windows Installation](INSTALL_WINDOWS.md) - Complete Windows setup
- [Main README](README.md) - Project overview

### Configuration
- [Rate Limit Configuration](RATE_LIMIT_CONFIGURATION.md) - Rate limiting setup
- [Quick Rate Limit Guide](backend/QUICK_RATE_LIMIT_GUIDE.md) - Quick reference
- [Configuration README](backend/src/config/README.md) - Config details

### Testing
- [Test README](backend/tests/README.md) - Running tests
- [Test Summary](RATE_LIMIT_TEST_SUMMARY.md) - Test results

### API Documentation
- **Swagger UI:** http://localhost:5000/api/agent/docs/ui
- **AWI Discovery:** http://localhost:5000/.well-known/llm-text

---

## 🔒 Security Notes

### Default Credentials

The `.env` file contains credentials for:
- MongoDB Atlas (cloud database)
- Redis password

**For Production:**
1. Change all passwords
2. Use environment-specific `.env` files
3. Never commit `.env` to version control
4. Use secrets management (AWS Secrets Manager, etc.)

### Rate Limiting

Rate limits are configured in `backend/src/config/rateLimits.js`:
- Post creation: 5 per 10 seconds
- Comments: 20 per hour
- General API: 100 per 15 minutes

See [Rate Limit Configuration](RATE_LIMIT_CONFIGURATION.md) for details.

---

## 🚀 Next Steps After Installation

1. **Explore the UI**
   - Visit http://localhost:5173
   - Create your first blog post
   - Add comments
   - Upload images/videos

2. **Try the API**
   - View API docs: http://localhost:5000/api/agent/docs/ui
   - Test endpoints with Postman or curl
   - Register an AI agent

3. **Run Tests**
   ```bash
   npm run test:rate-limits
   ```

4. **Read Documentation**
   - AWI Discovery: [docs/AWI_DISCOVERY.md](backend/docs/AWI_DISCOVERY.md)
   - State Management: [docs/STATE_MANAGEMENT.md](backend/docs/STATE_MANAGEMENT.md)

5. **Customize**
   - Modify rate limits in `backend/src/config/rateLimits.js`
   - Customize UI components
   - Add new features

---

## 💡 Tips for Success

### Development

- **Use separate terminals** for backend and frontend
- **Enable auto-restart** (nodemon for backend, Vite for frontend)
- **Check logs** regularly for errors
- **Use browser DevTools** (F12) for debugging

### Performance

- **Redis** caches session state for faster responses
- **Rate limiting** prevents abuse
- **MongoDB Atlas** handles database scaling
- **Vite** provides fast frontend builds

### Debugging

- **Backend logs:** Check terminal running `npm run dev`
- **Frontend errors:** Check browser console (F12)
- **Network errors:** Check Network tab in DevTools
- **Redis issues:** Check Redis logs

---

## 📞 Getting Help

If you encounter issues:

1. **Check platform-specific guide** for detailed troubleshooting
2. **Review logs** for error messages
3. **Search documentation** for solutions
4. **Check GitHub issues** for similar problems
5. **Contact support** or development team

### Useful Links

- **Node.js Docs:** https://nodejs.org/docs/
- **React Docs:** https://react.dev/
- **Vite Docs:** https://vitejs.dev/
- **MongoDB Atlas:** https://www.mongodb.com/docs/atlas/
- **Redis Docs:** https://redis.io/documentation

---

## 🎉 Ready to Go!

Once installation is complete:

✅ Backend running on http://localhost:5000
✅ Frontend running on http://localhost:5173
✅ Redis connected and ready
✅ MongoDB Atlas connected
✅ All tests passing

**Happy coding!** 🚀

---

**Installation Guide Version:** 1.0.0
**Last Updated:** 2026-01-17
**Supported Platforms:** macOS, Windows 10/11, Linux
