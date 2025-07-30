// utils/validation.js
const Joi = require('joi');

// Custom validation functions
const validateUUID = (value, helpers) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    return helpers.error('any.invalid');
  }
  return value;
};

const validatePassword = (value, helpers) => {
  // Password must be at least 8 characters with at least one letter and one number
  if (value.length < 8) {
    return helpers.error('password.minLength');
  }
  if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(value)) {
    return helpers.error('password.complexity');
  }
  return value;
};

const validateAge = (value, helpers) => {
  const today = new Date();
  const birthDate = new Date(value);
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  if (age < 5 || age > 18) {
    return helpers.error('age.range');
  }
  return value;
};

// Common validation schemas
const schemas = {
  // UUID validation
  uuid: Joi.string().custom(validateUUID, 'UUID validation').required(),
  optionalUuid: Joi.string().custom(validateUUID, 'UUID validation').optional(),

  // User registration schema
  register: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(20)
      .required()
      .messages({
        'string.alphanum': 'Username can only contain letters and numbers',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 20 characters'
      }),
    
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address'
      }),
    
    password: Joi.string()
      .custom(validatePassword, 'Password validation')
      .required()
      .messages({
        'password.minLength': 'Password must be at least 8 characters long',
        'password.complexity': 'Password must contain at least one letter and one number'
      }),
    
    dateOfBirth: Joi.date()
      .custom(validateAge, 'Age validation')
      .required()
      .messages({
        'age.range': 'User must be between 5 and 18 years old'
      }),
    
    parentEmail: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid parent email address'
      })
  }),

  // User login schema
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // Profile update schema
  profileUpdate: Joi.object({
    username: Joi.string().alphanum().min(3).max(20).optional(),
    email: Joi.string().email().optional(),
    dateOfBirth: Joi.date().custom(validateAge, 'Age validation').optional(),
    parentEmail: Joi.string().email().optional(),
    preferences: Joi.object().optional()
  }),

  // Task creation schema
  task: Joi.object({
    title: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(1000).optional(),
    category: Joi.string().valid('daily', 'academic', 'chores', 'health', 'social', 'creative').required(),
    priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
    dueDate: Joi.date().min('now').optional(),
    estimatedDuration: Joi.number().integer().min(1).max(480).optional(), // 1 minute to 8 hours
    pointsReward: Joi.number().integer().min(1).max(100).default(10)
  }),

  // Task update schema
  taskUpdate: Joi.object({
    title: Joi.string().min(1).max(200).optional(),
    description: Joi.string().max(1000).optional(),
    category: Joi.string().valid('daily', 'academic', 'chores', 'health', 'social', 'creative').optional(),
    priority: Joi.string().valid('low', 'medium', 'high').optional(),
    status: Joi.string().valid('pending', 'in_progress', 'completed', 'cancelled').optional(),
    dueDate: Joi.date().min('now').optional(),
    estimatedDuration: Joi.number().integer().min(1).max(480).optional(),
    pointsReward: Joi.number().integer().min(1).max(100).optional()
  }),

  // Mood entry schema
  mood: Joi.object({
    moodType: Joi.string().valid('happy', 'excited', 'calm', 'worried', 'angry', 'sad', 'frustrated').required(),
    moodIntensity: Joi.number().integer().min(1).max(5).required(),
    notes: Joi.string().max(500).optional(),
    triggers: Joi.array().items(Joi.string().max(50)).max(5).optional()
  }),

  // Game score schema
  gameScore: Joi.object({
    gameId: Joi.string().custom(validateUUID, 'UUID validation').required(),
    score: Joi.number().integer().min(0).required(),
    accuracy: Joi.number().min(0).max(100).optional(),
    levelReached: Joi.number().integer().min(1).optional(),
    completionTime: Joi.number().integer().min(1).optional(), // in seconds
    difficulty: Joi.string().valid('easy', 'medium', 'hard').optional()
  }),

  // Focus session schema
  focusSession: Joi.object({
    type: Joi.string().valid('breathing', 'meditation', 'concentration', 'mindfulness').required(),
    durationMinutes: Joi.number().integer().min(1).max(60).required(),
    background: Joi.string().valid('nature', 'ocean', 'rain', 'silence', 'music').default('silence'),
    qualityRating: Joi.number().integer().min(1).max(5).optional()
  }),

  // Appointment booking schema
  appointment: Joi.object({
    specialistId: Joi.string().custom(validateUUID, 'UUID validation').required(),
    scheduledAt: Joi.date().min('now').required(),
    type: Joi.string().valid('consultation', 'therapy', 'assessment', 'follow_up').required(),
    notes: Joi.string().max(500).optional()
  }),

  // Chat message schema
  chatMessage: Joi.object({
    content: Joi.string().min(1).max(1000).required(),
    type: Joi.string().valid('text', 'image', 'emoji').default('text'),
    roomId: Joi.string().optional()
  }),

  // Document upload schema
  document: Joi.object({
    title: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(1000).optional(),
    category: Joi.string().valid('report', 'assignment', 'medical', 'other').required(),
    tags: Joi.array().items(Joi.string().max(30)).max(10).optional()
  }),

  // Pagination schema
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),

  // Date range schema
  dateRange: Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().min(Joi.ref('startDate')).optional(),
    timeframe: Joi.string().valid('7d', '30d', '90d', '1y').optional()
  }),

  // Search schema
  search: Joi.object({
    query: Joi.string().min(1).max(100).required(),
    category: Joi.string().optional(),
    filters: Joi.object().optional()
  })
};

// Validation middleware factory
const createValidator = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Please check your input and try again',
        details: errors
      });
    }

    req[property] = value; // Use validated/sanitized value
    next();
  };
};

// Validate query parameters
const validateQuery = (schema) => createValidator(schema, 'query');

// Validate request parameters
const validateParams = (schema) => createValidator(schema, 'params');

// Sanitization functions
const sanitize = {
  // Remove HTML tags and potentially dangerous characters
  cleanString: (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
      .trim();
  },

  // Clean object recursively
  cleanObject: (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        cleaned[key] = sanitize.cleanString(value);
      } else if (typeof value === 'object') {
        cleaned[key] = sanitize.cleanObject(value);
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  },

  // Validate and sanitize file uploads
  validateFile: (file, allowedTypes = [], maxSize = 5 * 1024 * 1024) => {
    const errors = [];

    if (!file) {
      errors.push('No file provided');
      return { isValid: false, errors };
    }

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size exceeds limit of ${maxSize / (1024 * 1024)}MB`);
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed`);
    }

    // Check for potentially dangerous file names
    if (/[<>:"/\\|?*]/.test(file.originalname)) {
      errors.push('File name contains invalid characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedFilename: file.originalname.replace(/[<>:"/\\|?*]/g, '_')
    };
  }
};

module.exports = {
  schemas,
  createValidator,
  validateQuery,
  validateParams,
  sanitize,
  validateUUID,
  validatePassword,
  validateAge
};
