// middleware/security.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Allow WebSocket connections
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// General API rate limiting
const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes',
      timestamp: new Date().toISOString()
    });
  }
});

// Stricter rate limiting for auth endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts',
    message: 'Too many failed login attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful requests
});

// Rate limiting for file uploads
const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 uploads per minute
  message: {
    success: false,
    error: 'Upload rate limit exceeded',
    message: 'Too many file uploads, please slow down.',
    retryAfter: '1 minute'
  }
});

// Rate limiting for chat messages
const chatRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 messages per minute
  message: {
    success: false,
    error: 'Chat rate limit exceeded',
    message: 'Too many messages sent, please slow down.',
    retryAfter: '1 minute'
  }
});

// Rate limiting for password reset requests
const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    error: 'Password reset rate limit exceeded',
    message: 'Too many password reset requests, please try again later.',
    retryAfter: '1 hour'
  }
});

// Request sanitization middleware
const sanitizeRequest = (req, res, next) => {
  // Remove null bytes from strings
  const sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
      return obj.replace(/\0/g, '');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// IP whitelist middleware (for admin endpoints)
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.length === 0 || allowedIPs.includes(clientIP)) {
      return next();
    }
    
    res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'Your IP address is not authorized to access this resource.'
    });
  };
};

// Request timeout middleware
const requestTimeout = (timeoutMs = 30000) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: 'Request timeout',
          message: 'The request took too long to process.'
        });
      }
    }, timeoutMs);

    res.on('finish', () => {
      clearTimeout(timeout);
    });

    res.on('close', () => {
      clearTimeout(timeout);
    });

    next();
  };
};

// Prevent HTTP parameter pollution
const preventParameterPollution = (req, res, next) => {
  // Convert arrays to single values for specific fields
  const singleValueFields = ['sort', 'limit', 'offset', 'page'];
  
  for (const field of singleValueFields) {
    if (req.query[field] && Array.isArray(req.query[field])) {
      req.query[field] = req.query[field][req.query[field].length - 1];
    }
  }
  
  next();
};

module.exports = {
  securityHeaders,
  apiRateLimit,
  authRateLimit,
  uploadRateLimit,
  chatRateLimit,
  passwordResetRateLimit,
  sanitizeRequest,
  ipWhitelist,
  requestTimeout,
  preventParameterPollution
};
