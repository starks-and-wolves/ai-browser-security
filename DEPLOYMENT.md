# Deployment Guide for Render

This guide explains how to deploy the AI Browser Security project on Render using the included `render.yaml` configuration.

## Prerequisites

Before deploying, you need to set up external services that Render doesn't provide natively.

### 1. MongoDB Atlas Setup (Required)

MongoDB is not available as a native Render service, so you'll use MongoDB Atlas (free tier available).

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account and cluster
3. Create a database user with password
4. Whitelist all IPs: `0.0.0.0/0` (for Render access)
5. Get your connection string (format: `mongodb+srv://username:password@cluster.mongodb.net/blog-awi`)
6. Keep this connection string - you'll need it in step 2

## Deployment Steps

### Step 1: Push to GitHub

Ensure your code is pushed to a GitHub repository:

```bash
git add .
git commit -m "Add Render deployment configuration"
git push origin main
```

### Step 2: Deploy on Render

#### Option A: Deploy via Dashboard (Recommended for first-time)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub repository
4. Select your repository and branch (`main`)
5. Render will detect the `render.yaml` file automatically
6. Click **"Apply"**

#### Option B: Deploy via CLI

```bash
# Install Render CLI
npm install -g @render-dev/cli

# Login
render login

# Deploy
render blueprint deploy
```

### Step 3: Configure Environment Variables

After deployment, you need to add the MongoDB connection string:

1. Go to your **backend service** in Render dashboard
2. Navigate to **Environment** tab
3. Add the following variable:
   - **Key**: `MONGODB_URI`
   - **Value**: Your MongoDB Atlas connection string from prerequisites

4. Click **"Save Changes"** (this will trigger a redeploy)

### Step 4: Verify Deployment

1. **Backend Health Check**:
   - Go to your backend URL: `https://your-backend-name.onrender.com/api/health`
   - Should return: `{"success": true, "services": {"mongodb": "connected", "redis": "connected"}}`

2. **Frontend**:
   - Visit your frontend URL: `https://your-frontend-name.onrender.com`
   - Should load the React application

3. **API Documentation**:
   - Visit: `https://your-backend-name.onrender.com/api/agent/docs/ui`
   - Should show Swagger API documentation

## Service Overview

The `render.yaml` automatically creates these services:

### 1. Backend (Node.js Web Service)
- **Name**: `ai-browser-security-backend`
- **Type**: Web Service (Node.js)
- **Directory**: `AWI/AWI/backend`
- **Health Check**: `/api/health`
- **Features**:
  - Express.js API
  - MongoDB integration
  - Redis caching
  - AWI (Agent Web Interface) support

### 2. Frontend (Static Site)
- **Name**: `ai-browser-security-frontend`
- **Type**: Static Site
- **Directory**: `AWI/AWI/frontend`
- **Build**: Vite
- **Features**:
  - React application
  - Automatic API URL configuration
  - SPA routing support

### 3. Redis Cache
- **Name**: `ai-browser-security-redis`
- **Type**: Redis
- **Plan**: Starter (Free - 25MB)
- **Policy**: `allkeys-lru` (auto-eviction when full)
- **Features**:
  - Session state management
  - AWI action caching
  - List caching

## Important Notes

### Free Tier Limitations

- **Backend & Frontend**: Free tier spins down after inactivity (~15 min). First request after inactivity takes 30-60 seconds.
- **Redis**: 25MB limit on free tier. Upgrade to Standard ($10/month) for production.
- **File Uploads**: Render uses ephemeral filesystem - uploaded files are lost on redeploy/restart.

### File Upload Solution

For persistent file uploads, you need cloud storage:

#### Option 1: Cloudinary (Recommended - Free tier available)
```bash
npm install cloudinary multer-storage-cloudinary
```

Add to backend environment variables:
```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

#### Option 2: AWS S3
```bash
npm install @aws-sdk/client-s3 multer-s3
```

#### Option 3: Render Disks (Paid)
Add to `render.yaml` under backend service:
```yaml
disk:
  name: uploads
  mountPath: /opt/render/project/src/AWI/AWI/backend/uploads
  sizeGB: 10
```

### Upgrading Redis Plan

To upgrade from free to paid Redis:

1. Go to Redis service in dashboard
2. Click **"Settings"**
3. Change plan from **"Starter"** to **"Standard"**
4. Confirm upgrade ($7/month for 256MB)

### Custom Domain (Optional)

1. Go to service **"Settings"**
2. Click **"Add Custom Domain"**
3. Add your domain (e.g., `api.yourdomain.com` for backend)
4. Update DNS records as instructed
5. Update `CORS_ORIGIN` environment variable with custom domain

## Monitoring & Logs

### View Logs
```bash
# Via dashboard: Service → Logs tab
# Via CLI:
render services logs -s <service-name> -f
```

### Monitor Services
- Dashboard shows CPU, memory, bandwidth usage
- Health checks run automatically
- Set up notifications in **"Settings"** → **"Notifications"**

## Troubleshooting

### Backend won't start
- Check logs for errors
- Verify `MONGODB_URI` is set correctly
- Ensure MongoDB Atlas allows connections from all IPs

### Redis connection fails
- Redis service takes ~2-3 minutes to provision
- Wait for Redis to show "Available" status
- Backend will auto-reconnect once Redis is ready

### Frontend shows API errors
- Verify `VITE_API_URL` points to correct backend URL
- Check CORS settings in backend
- Check browser console for specific errors

### Build fails
```bash
# Test build locally first:
cd AWI/AWI/backend && npm install && npm start
cd AWI/AWI/frontend && npm install && npm run build
```

## Cost Estimation

### Free Tier
- Backend: Free (with sleep on inactivity)
- Frontend: Free
- Redis: Free (25MB)
- **Total**: $0/month

### Production (Recommended)
- Backend: $7/month (Standard instance, always on)
- Frontend: Free
- Redis: $7/month (256MB)
- Disk (if needed): $0.25/GB/month
- **Total**: ~$14-20/month

## Next Steps

After successful deployment:

1. **Set up monitoring**: Configure uptime monitoring (e.g., UptimeRobot)
2. **Configure backups**: Set up MongoDB Atlas automated backups
3. **Add custom domain**: Point your domain to Render services
4. **Set up CI/CD**: Render auto-deploys on git push to main branch
5. **Implement file storage**: Set up Cloudinary or S3 for uploads
6. **Security hardening**:
   - Add authentication to admin routes
   - Review and update `JWT_SECRET`
   - Configure rate limiting
   - Set up SSL/TLS (automatic with Render)

## Support

- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com/)
- [MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/)

## Rollback

To rollback to a previous version:
1. Go to service → **"Events"** tab
2. Find the previous successful deploy
3. Click **"Rollback to this version"**
