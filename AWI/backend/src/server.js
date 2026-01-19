require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const connectDB = require('./config/database');
const { redis, shutdown: shutdownRedis } = require('./config/redis');
const errorHandler = require('./middleware/errorHandler');
const { sanitizeRequestBody } = require('./middleware/sanitization/querySanitizer');
const AgentSession = require('./models/AgentSession');

// Initialize express app
const app = express();

// Connect to databases
connectDB();  // MongoDB
// Redis connection happens automatically in redis.js

// Middleware
// Configure Helmet with appropriate CSP for serving both frontend and API
const isDevelopment = process.env.NODE_ENV !== 'production';

if (isDevelopment) {
  // In development, disable CSP to avoid blocking dev servers, HMR, etc.
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
  console.log('⚠️  CSP disabled in development mode');
} else {
  // In production, use strict CSP
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for React
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
        imgSrc: ["'self'", "data:", "blob:", "https:"], // Allow images from various sources
        connectSrc: ["'self'"], // Allow API calls to same origin
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        formAction: ["'self'"], // Allow form submissions to same origin
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
}

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(compression()); // Compress responses
app.use(morgan('dev')); // Logging
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies
app.use(sanitizeRequestBody); // Global NoSQL injection protection

// AWI Discovery Headers - Help browser agents find the AWI layer
app.use((req, res, next) => {
  res.setHeader('X-AWI-Discovery', '/.well-known/llm-text');
  res.setHeader('X-Agent-API', '/api/agent/docs');
  res.setHeader('X-Agent-Capabilities', '/api/agent/capabilities');
  res.setHeader('X-Agent-Registration', '/api/agent/register');
  res.setHeader('Link', '</api/agent/docs>; rel="service-desc"; type="application/vnd.oai.openapi+json", </.well-known/llm-text>; rel="alternate"; type="application/json"');
  next();
});

// Serve static files (uploaded media)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// AWI Discovery - Dynamic manifest generation
const { getAWIManifest } = require('./controllers/awiManifestController');
app.get('/.well-known/llm-text', getAWIManifest);

// API Routes
app.get('/api/health', async (req, res) => {
  // Check MongoDB connection
  const mongoose = require('mongoose');
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  // Check Redis connection
  let redisStatus = 'disconnected';
  if (process.env.AWI_USE_REDIS === 'true') {
    try {
      await redis.ping();
      redisStatus = 'connected';
    } catch (err) {
      redisStatus = 'error';
    }
  } else {
    redisStatus = 'disabled';
  }

  res.json({
    success: true,
    message: 'Blog API is running',
    services: {
      mongodb: mongoStatus,
      redis: redisStatus
    },
    timestamp: new Date().toISOString()
  });
});

// Agent Web Interface (AWI) Routes
// Use Redis-based routes for AWI state management
const useRedisState = process.env.AWI_USE_REDIS === 'true';
if (useRedisState) {
  console.log('✅ Using Redis-based AWI state management');
  app.use('/api/agent', require('./routes/agentRoutesRedis'));
} else {
  console.log('⚠️  Using MongoDB-based AWI state management (legacy)');
  app.use('/api/agent', require('./routes/agentRoutes'));
  app.use('/api/agent/session', require('./routes/sessionRoutes'));
}

// Swagger/OpenAPI Documentation
app.use('/api/agent/docs/ui', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Blog AWI Documentation',
  customCss: '.swagger-ui .topbar { display: none }'
}));
app.get('/api/agent/docs', (req, res) => {
  res.json(swaggerSpec);
});

// Admin Monitoring Routes (Phase 2)
// TODO: Add admin authentication before production use
if (process.env.ADMIN_DASHBOARD_ENABLED !== 'false') {
  app.use('/api/admin', require('./routes/agentMonitoringRoutes'));
  console.log('✅ Agent monitoring dashboard enabled at /api/admin');
}

// Regular API Routes
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/comments', require('./routes/commentRoutes'));

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  const fs = require('fs');

  // Check if frontend build exists
  if (fs.existsSync(frontendPath)) {
    console.log(`✅ Serving frontend from: ${frontendPath}`);
    app.use(express.static(frontendPath));

    // Catch-all route to serve index.html for client-side routing
    app.get('*', (req, res) => {
      // Only serve index.html for non-API routes
      if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/.well-known')) {
        const indexPath = path.join(frontendPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(500).json({
            success: false,
            error: 'Frontend build incomplete - index.html not found'
          });
        }
      } else {
        res.status(404).json({
          success: false,
          error: 'Route not found'
        });
      }
    });
  } else {
    console.error(`❌ Frontend build not found at: ${frontendPath}`);
    console.error('⚠️  Make sure to run "npm run build" before starting the server');

    // Serve a helpful message instead of crashing
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
        res.status(503).send(`
          <html>
            <body>
              <h1>Frontend Not Built</h1>
              <p>The frontend build was not found at: <code>${frontendPath}</code></p>
              <p>Please run <code>npm run build</code> to build the frontend.</p>
              <p>API is still available at <a href="/api/health">/api/health</a></p>
            </body>
          </html>
        `);
      } else {
        res.status(404).json({
          success: false,
          error: 'Route not found'
        });
      }
    });
  }
} else {
  // 404 handler for development mode
  app.use((req, res, next) => {
    res.status(404).json({
      success: false,
      error: 'Route not found'
    });
  });
}

// Error handler (must be last)
app.use(errorHandler);

// Session cleanup job
function startSessionCleanup() {
  // Run cleanup immediately on startup
  cleanupExpiredSessions();

  // Then run every hour
  setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

  console.log('Session cleanup job started (runs every hour)');
}

async function cleanupExpiredSessions() {
  try {
    const cleaned = await AgentSession.cleanupExpiredSessions();
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired session(s)`);
    }
  } catch (error) {
    console.error('Session cleanup error:', error);
  }
}

// Start server
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to 0.0.0.0 for production (Render, Docker, etc.)

const server = app.listen(PORT, HOST, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on ${HOST}:${PORT}`);

  // Start session cleanup job (runs every hour)
  startSessionCleanup();
});

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`\n${signal} received, starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    console.log('HTTP server closed');

    try {
      // Close Redis connection
      await shutdownRedis();
      console.log('Redis connection closed');

      // Close MongoDB connection
      const mongoose = require('mongoose');
      await mongoose.connection.close();
      console.log('MongoDB connection closed');

      console.log('✅ Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = app;