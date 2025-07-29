// Central middleware exports
const authMiddleware = require('./auth');
const validationMiddleware = require('./validation');

// Export all auth middleware
const {
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
} = authMiddleware;

// Export all validation middleware
const {
  registerSchema,
  loginSchema,
  moodSchema,
  taskSchema,
  gameScoreSchema,
  documentSchema,
  chatMessageSchema,
  appointmentSchema,
  focusSessionSchema,
  focusSessionCompleteSchema,
  profileUpdateSchema,
  paginationSchema,
  dateRangeSchema,
  validate,
  validateUUID,
  validateQuery
} = validationMiddleware;

// Common middleware stack for API routes
const apiMiddlewareStack = [
  securityHeaders,
  corsMiddleware,
  compressionMiddleware,
  requestLogger,
  sanitizeRequest,
  validateRequest,
  apiRateLimit
];

// Auth-specific middleware stack
const authMiddlewareStack = [
  securityHeaders,
  corsMiddleware,
  sanitizeRequest,
  validateRequest,
  authRateLimit
];

// Protected route middleware stack
const protectedRouteStack = [
  authenticateToken,
  trackActivity
];

// Upload route middleware stack
const uploadMiddlewareStack = [
  authenticateToken,
  uploadRateLimit,
  trackActivity
];

// Chat route middleware stack
const chatMiddlewareStack = [
  authenticateToken,
  chatRateLimit,
  trackActivity
];

module.exports = {
  // Auth middleware
  authenticateToken,
  optionalAuth,
  requireRole,
  
  // Rate limiting
  authRateLimit,
  apiRateLimit,
  uploadRateLimit,
  chatRateLimit,
  
  // Validation
  validate,
  validateUUID,
  validateQuery,
  
  // Security & utilities
  corsMiddleware,
  securityHeaders,
  sanitizeRequest,
  validateRequest,
  trackActivity,
  requestLogger,
  compressionMiddleware,
  
  // Error handling
  errorHandler,
  notFoundHandler,
  healthCheck,
  
  // Validation schemas
  registerSchema,
  loginSchema,
  moodSchema,
  taskSchema,
  gameScoreSchema,
  documentSchema,
  chatMessageSchema,
  appointmentSchema,
  focusSessionSchema,
  focusSessionCompleteSchema,
  profileUpdateSchema,
  paginationSchema,
  dateRangeSchema,
  
  // Middleware stacks
  apiMiddlewareStack,
  authMiddlewareStack,
  protectedRouteStack,
  uploadMiddlewareStack,
  chatMiddlewareStack
};