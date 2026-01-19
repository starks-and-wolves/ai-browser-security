const rateLimit = require('express-rate-limit');
const { SIMPLE_RATE_LIMITS } = require('../config/rateLimits');

// General API rate limiter
const apiLimiter = rateLimit({
  ...SIMPLE_RATE_LIMITS.api,
  standardHeaders: true,
  legacyHeaders: false,
});

// Post creation rate limiter
const postLimiter = rateLimit({
  ...SIMPLE_RATE_LIMITS.post,
  skipSuccessfulRequests: false,
});

// Comment creation rate limiter
const commentLimiter = rateLimit({
  ...SIMPLE_RATE_LIMITS.comment,
});

// File upload rate limiter
const uploadLimiter = rateLimit({
  ...SIMPLE_RATE_LIMITS.upload,
});

module.exports = {
  apiLimiter,
  postLimiter,
  commentLimiter,
  uploadLimiter
};
