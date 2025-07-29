const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const compression = require('compression');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Logging middleware
const requestLogger = morgan('combined', {
  skip: (req, res) => {
    // Skip logging for health checks and static files
    return req.url === '/health' || req.url.startsWith('/uploads');
  }
});

// Compression middleware
const compressionMiddleware = compression({
  threshold: 1024, // Only compress if response is larger than 1KB
  filter: (req, res) => {
    // Don't compress if user agent doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression filter function
    return compression.filter(req, res);
  }
});

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid authentication token'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user still exists and is active
    const userResult = await pool.query(
      'SELECT id, email, username, points, level, last_activity FROM profiles WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        message: 'The user associated with this token no longer exists'
      });
    }

    // Update last activity
    await pool.query(
      'UPDATE profiles SET last_activity = NOW() WHERE id = $1',
      [decoded.id]
    );

    req.user = {
      ...decoded,
      ...userResult.rows[0]
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        success: false,
        error: 'Invalid token',
        message: 'The provided token is invalid'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(403).json({
        success: false,
        error: 'Token expired',
        message: 'The provided token has expired. Please log in again'
      });
    } else {
      console.error('Authentication error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authentication failed',
        message: 'An error occurred during authentication'
      });
    }
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userResult = await pool.query(
        'SELECT id, email, username, points, level FROM profiles WHERE id = $1',
        [decoded.id]
      );

      if (userResult.rows.length > 0) {
        req.user = {
          ...decoded,
          ...userResult.rows[0]
        };
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

// Role-based authorization middleware
const requireRole = (roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
    }

    try {
      // Check if user has required role
      const roleResult = await pool.query(
        'SELECT role FROM user_roles WHERE user_id = $1',
        [req.user.id]
      );

      const userRoles = roleResult.rows.map(row => row.role);
      const hasRequiredRole = roles.some(role => userRoles.includes(role));

      if (!hasRequiredRole) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: `You need one of the following roles: ${roles.join(', ')}`
        });
      }

      req.userRoles = userRoles;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization failed',
        message: 'An error occurred while checking permissions'
      });
    }
  };
};

// Rate limiting configurations
const createRateLimit = (windowMs, max, message, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: 'Too many requests',
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.id || req.ip;
    }
  });
};

// Different rate limits for different endpoints
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts. Please try again in 15 minutes.',
  false
);

const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests
  'Too many API requests. Please try again in 15 minutes.',
  true // Skip counting successful requests
);

const uploadRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  10, // 10 uploads
  'Too many file uploads. Please try again in 1 hour.',
  false
);

const chatRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  20, // 20 messages
  'Too many chat messages. Please slow down.',
  false
);

// Request validation middleware
const validateRequest = (req, res, next) => {
  // Check content type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (!contentType || (!contentType.includes('application/json') && !contentType.includes('multipart/form-data'))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid content type',
        message: 'Content-Type must be application/json or multipart/form-data'
      });
    }
  }

  // Check for required headers
  if (!req.headers['user-agent']) {
    return res.status(400).json({
      success: false,
      error: 'Missing user agent',
      message: 'User-Agent header is required'
    });
  }

  next();
};

// CORS middleware (custom implementation)
const corsMiddleware = (req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://mindspark.vercel.app',
    'https://mindspark.netlify.app'
  ];

  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  next();
};

// Error handling middleware
const errorHandler = (error, req, res, next) => {
  console.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    user: req.user?.id,
    timestamp: new Date().toISOString()
  });

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: 'Please check your input data',
      details: errors
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: 'Please provide a valid authentication token'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
      message: 'Your session has expired. Please log in again'
    });
  }

  // Database errors
  if (error.code === '23505') { // Unique violation
    return res.status(409).json({
      success: false,
      error: 'Duplicate entry',
      message: 'A record with this information already exists'
    });
  }

  if (error.code === '23503') { // Foreign key violation
    return res.status(400).json({
      success: false,
      error: 'Invalid reference',
      message: 'Referenced record does not exist'
    });
  }

  // Multer errors (file upload)
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File too large',
      message: 'File size cannot exceed 10MB'
    });
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      error: 'Too many files',
      message: 'You can only upload one file at a time'
    });
  }

  // Default server error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Something went wrong on our end. Please try again later.',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

// 404 handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: {
      auth: '/api/auth/*',
      mood: '/api/mood',
      tasks: '/api/tasks',
      games: '/api/games',
      documents: '/api/documents',
      chat: '/api/chat/*',
      specialists: '/api/specialists',
      appointments: '/api/appointments',
      'focus-sessions': '/api/focus-sessions',
      progress: '/api/progress'
    }
  });
};

// Health check middleware
const healthCheck = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MindSpark API is running',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};

// Request sanitization middleware
const sanitizeRequest = (req, res, next) => {
  // Remove null bytes from strings to prevent injection
  const sanitizeObject = (obj) => {
    if (typeof obj === 'string') {
      return obj.replace(/\0/g, '');
    } else if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        obj[key] = sanitizeObject(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// User activity tracking middleware
const trackActivity = async (req, res, next) => {
  // Track user activity for analytics
  if (req.user && req.method !== 'GET') {
    try {
      await pool.query(
        'UPDATE profiles SET last_activity = NOW() WHERE id = $1',
        [req.user.id]
      );
    } catch (error) {
      // Don't fail the request if activity tracking fails
      console.warn('Failed to track user activity:', error.message);
    }
  }
  next();
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  authRateLimit,
  apiRateLimit,
  uploadRateLimit,
  chatRateLimit,
  validateRequest,
  corsMiddleware,
  errorHandler,
  notFoundHandler,
  healthCheck,
  securityHeaders,
  sanitizeRequest,
  trackActivity,
  requestLogger,
  compressionMiddleware
};