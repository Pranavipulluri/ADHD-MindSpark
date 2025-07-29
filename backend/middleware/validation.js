const Joi = require('joi');

// User registration validation
const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).max(100).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'string.max': 'Password cannot exceed 100 characters',
    'any.required': 'Password is required'
  }),
  username: Joi.string().alphanum().min(3).max(30).required().messages({
    'string.alphanum': 'Username must contain only letters and numbers',
    'string.min': 'Username must be at least 3 characters long',
    'string.max': 'Username cannot exceed 30 characters',
    'any.required': 'Username is required'
  }),
  dateOfBirth: Joi.date().max('now').optional().messages({
    'date.max': 'Birth date cannot be in the future'
  }),
  parentEmail: Joi.string().email().optional().messages({
    'string.email': 'Please provide a valid parent email address'
  })
});

// User login validation
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

// Mood entry validation
const moodSchema = Joi.object({
  mood_type: Joi.string().valid('happy', 'excited', 'calm', 'worried', 'angry').required().messages({
    'any.only': 'Mood type must be one of: happy, excited, calm, worried, angry',
    'any.required': 'Mood type is required'
  }),
  mood_intensity: Joi.number().integer().min(1).max(5).optional().messages({
    'number.min': 'Mood intensity must be between 1 and 5',
    'number.max': 'Mood intensity must be between 1 and 5'
  }),
  notes: Joi.string().max(500).optional().messages({
    'string.max': 'Notes cannot exceed 500 characters'
  })
});

// Task validation
const taskSchema = Joi.object({
  title: Joi.string().min(1).max(200).required().messages({
    'string.min': 'Task title cannot be empty',
    'string.max': 'Task title cannot exceed 200 characters',
    'any.required': 'Task title is required'
  }),
  description: Joi.string().max(1000).optional().allow('').messages({
    'string.max': 'Task description cannot exceed 1000 characters'
  }),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium').messages({
    'any.only': 'Priority must be one of: low, medium, high'
  }),
  status: Joi.string().valid('must-do', 'can-wait', 'done').default('must-do').messages({
    'any.only': 'Status must be one of: must-do, can-wait, done'
  }),
  due_date: Joi.date().greater('now').optional().messages({
    'date.greater': 'Due date must be in the future'
  })
});

// Game score validation
const gameScoreSchema = Joi.object({
  score: Joi.number().integer().min(0).required().messages({
    'number.min': 'Score cannot be negative',
    'any.required': 'Score is required'
  }),
  completion_time: Joi.string().optional(), // PostgreSQL interval format
  accuracy_percentage: Joi.number().min(0).max(100).optional().messages({
    'number.min': 'Accuracy percentage cannot be negative',
    'number.max': 'Accuracy percentage cannot exceed 100'
  }),
  level_reached: Joi.number().integer().min(1).optional().messages({
    'number.min': 'Level reached must be at least 1'
  })
});

// Document validation
const documentSchema = Joi.object({
  title: Joi.string().min(1).max(200).required().messages({
    'string.min': 'Document title cannot be empty',
    'string.max': 'Document title cannot exceed 200 characters',
    'any.required': 'Document title is required'
  }),
  category_id: Joi.string().uuid().optional().messages({
    'string.uuid': 'Category ID must be a valid UUID'
  }),
  content: Joi.string().max(50000).optional().allow('').messages({
    'string.max': 'Document content cannot exceed 50,000 characters'
  }),
  tags: Joi.string().optional().messages({
    'string.base': 'Tags must be a comma-separated string'
  })
});

// Chat message validation
const chatMessageSchema = Joi.object({
  content: Joi.string().min(1).max(1000).required().messages({
    'string.min': 'Message cannot be empty',
    'string.max': 'Message cannot exceed 1000 characters',
    'any.required': 'Message content is required'
  }),
  message_type: Joi.string().valid('text', 'image', 'file').default('text').messages({
    'any.only': 'Message type must be one of: text, image, file'
  }),
  reply_to: Joi.string().uuid().optional().messages({
    'string.uuid': 'Reply to must be a valid message UUID'
  })
});

// Appointment validation
const appointmentSchema = Joi.object({
  specialist_id: Joi.string().uuid().required().messages({
    'string.uuid': 'Specialist ID must be a valid UUID',
    'any.required': 'Specialist ID is required'
  }),
  appointment_date: Joi.date().greater('now').required().messages({
    'date.greater': 'Appointment date must be in the future',
    'any.required': 'Appointment date is required'
  }),
  duration_minutes: Joi.number().integer().min(15).max(180).default(60).messages({
    'number.min': 'Appointment duration must be at least 15 minutes',
    'number.max': 'Appointment duration cannot exceed 180 minutes'
  }),
  session_type: Joi.string().valid('video', 'phone', 'in-person').default('video').messages({
    'any.only': 'Session type must be one of: video, phone, in-person'
  }),
  notes: Joi.string().max(500).optional().allow('').messages({
    'string.max': 'Notes cannot exceed 500 characters'
  })
});

// Focus session validation
const focusSessionSchema = Joi.object({
  session_type: Joi.string().valid('focus_timer', 'breathing', 'meditation').required().messages({
    'any.only': 'Session type must be one of: focus_timer, breathing, meditation',
    'any.required': 'Session type is required'
  }),
  duration_minutes: Joi.number().integer().min(1).max(120).required().messages({
    'number.min': 'Session duration must be at least 1 minute',
    'number.max': 'Session duration cannot exceed 120 minutes',
    'any.required': 'Session duration is required'
  })
});

// Focus session completion validation
const focusSessionCompleteSchema = Joi.object({
  interruptions: Joi.number().integer().min(0).default(0).messages({
    'number.min': 'Interruptions cannot be negative'
  }),
  notes: Joi.string().max(500).optional().allow('').messages({
    'string.max': 'Notes cannot exceed 500 characters'
  })
});

// Profile update validation
const profileUpdateSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).optional().messages({
    'string.alphanum': 'Username must contain only letters and numbers',
    'string.min': 'Username must be at least 3 characters long',
    'string.max': 'Username cannot exceed 30 characters'
  }),
  avatar_url: Joi.string().uri().optional().messages({
    'string.uri': 'Avatar URL must be a valid URL'
  }),
  date_of_birth: Joi.date().max('now').optional().messages({
    'date.max': 'Birth date cannot be in the future'
  }),
  parent_email: Joi.string().email().optional().messages({
    'string.email': 'Please provide a valid parent email address'
  }),
  preferences: Joi.object().optional()
});

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    req.validatedData = value;
    next();
  };
};

// UUID validation middleware
const validateUUID = (paramName) => {
  return (req, res, next) => {
    const uuid = req.params[paramName];
    const uuidSchema = Joi.string().uuid().required();
    
    const { error } = uuidSchema.validate(uuid);
    if (error) {
      return res.status(400).json({
        error: `Invalid ${paramName} format`,
        message: 'Must be a valid UUID'
      });
    }
    
    next();
  };
};

// Query parameter validation
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: false
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Query validation failed',
        details: errors
      });
    }

    req.validatedQuery = value;
    next();
  };
};

// Common query schemas
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0)
});

const dateRangeSchema = Joi.object({
  start_date: Joi.date().optional(),
  end_date: Joi.date().min(Joi.ref('start_date')).optional(),
  days: Joi.number().integer().min(1).max(365).default(30)
});

module.exports = {
  // Schemas
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
  
  // Middleware functions
  validate,
  validateUUID,
  validateQuery
};