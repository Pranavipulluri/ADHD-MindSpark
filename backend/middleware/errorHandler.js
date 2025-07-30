// middleware/errorHandler.js
const logger = require('../utils/logger');

// Not found handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Resource not found',
    message: `The requested resource ${req.originalUrl} was not found on this server.`,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  });
};

// Global error handler
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Default error response
  let error = {
    success: false,
    error: 'Internal server error',
    message: 'An unexpected error occurred. Please try again later.',
    timestamp: new Date().toISOString()
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error.error = 'Validation error';
    error.message = err.message;
    error.details = err.details;
    return res.status(400).json(error);
  }

  if (err.name === 'JsonWebTokenError') {
    error.error = 'Authentication error';
    error.message = 'Invalid or expired token';
    return res.status(401).json(error);
  }

  if (err.name === 'TokenExpiredError') {
    error.error = 'Authentication error';
    error.message = 'Token has expired';
    return res.status(401).json(error);
  }

  if (err.code === '23505') { // PostgreSQL unique constraint violation
    error.error = 'Duplicate entry';
    error.message = 'A record with this information already exists';
    return res.status(409).json(error);
  }

  // SQLite constraint violations
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.errno === 19) {
    error.error = 'Duplicate entry';
    error.message = 'A record with this information already exists';
    return res.status(409).json(error);
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    error.error = 'Reference error';
    error.message = 'Referenced record does not exist';
    return res.status(400).json(error);
  }

  // SQLite foreign key violations
  if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    error.error = 'Reference error';
    error.message = 'Referenced record does not exist';
    return res.status(400).json(error);
  }

  if (err.code === '23502') { // PostgreSQL not null violation
    error.error = 'Missing required field';
    error.message = 'A required field is missing';
    return res.status(400).json(error);
  }

  // SQLite not null violations
  if (err.code === 'SQLITE_CONSTRAINT_NOTNULL') {
    error.error = 'Missing required field';
    error.message = 'A required field is missing';
    return res.status(400).json(error);
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    error.error = 'File too large';
    error.message = 'The uploaded file exceeds the size limit';
    return res.status(413).json(error);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error.error = 'Invalid file';
    error.message = 'Unexpected file field or too many files';
    return res.status(400).json(error);
  }

  if (err.code === 'ECONNREFUSED') {
    logger.error('Database connection refused', {
      error: err.message,
      address: err.address,
      port: err.port,
      syscall: err.syscall
    });
    error.error = 'Service unavailable';
    error.message = 'Database service is currently unavailable. Please try again later.';
    return res.status(503).json(error);
  }

  // Handle development vs production error responses
  if (process.env.NODE_ENV === 'development') {
    error.message = err.message;
    error.stack = err.stack;
  }

  // Default 500 error
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json(error);
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Custom error class
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }
}

// Validation error class
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400);
    this.name = 'ValidationError';
    this.details = details;
  }
}

// Authentication error class
class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

// Authorization error class
class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

// Not found error class
class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError
};
