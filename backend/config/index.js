require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = [
  'JWT_SECRET',
  'DATABASE_URL'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

const config = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT) || 3001,
    environment: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    corsOrigins: (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173').split(',')
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'mindspark_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.NODE_ENV === 'production'
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    algorithm: 'HS256'
  },

  // File Upload Configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,gif,pdf,doc,docx,txt').split(','),
    tempPath: process.env.TEMP_PATH || './temp'
  },

  // Email Configuration
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASS,
    from: process.env.FROM_EMAIL || process.env.SMTP_USER
  },

  // External APIs
  apis: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
    },
    zoom: {
      apiKey: process.env.ZOOM_API_KEY,
      apiSecret: process.env.ZOOM_API_SECRET
    }
  },

  // Security Configuration
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    sessionSecret: process.env.SESSION_SECRET || process.env.JWT_SECRET
  },

  // WebSocket Configuration
  websocket: {
    port: parseInt(process.env.WS_PORT) || 3002,
    origins: (process.env.WS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173').split(','),
    pingInterval: 30000, // 30 seconds
    pingTimeout: 60000   // 60 seconds
  },

  // Redis Configuration (optional)
  redis: {
    url: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    db: parseInt(process.env.REDIS_DB) || 0
  },

  // Storage Configuration
  storage: {
    type: process.env.STORAGE_TYPE || 'local', // 'local', 'aws', 'gcp'
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
      bucketName: process.env.AWS_BUCKET_NAME,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  },

  // Monitoring and Analytics
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID,
    logLevel: process.env.LOG_LEVEL || 'info'
  },

  // Feature Flags
  features: {
    enableChat: process.env.ENABLE_CHAT === 'true',
    enableVideoCalls: process.env.ENABLE_VIDEO_CALLS === 'true',
    enableAiRecommendations: process.env.ENABLE_AI_RECOMMENDATIONS === 'true',
    enableGamification: process.env.ENABLE_GAMIFICATION !== 'false', // Default true
    enableEmailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'false',
    enableAnalytics: process.env.ENABLE_ANALYTICS !== 'false'
  },

  // Application Configuration
  app: {
    name: 'MindSpark',
    version: process.env.npm_package_version || '1.0.0',
    description: 'ADHD Support Platform for Children',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@mindspark.com',
    defaultTimezone: process.env.DEFAULT_TIMEZONE || 'UTC'
  },

  // Pagination defaults
  pagination: {
    defaultLimit: 20,
    maxLimit: 100
  },

  // Game configuration
  games: {
    defaultPointsPerCompletion: 10,
    bonusMultiplier: 1.5,
    maxScoreHistory: 100
  },

  // Task configuration
  tasks: {
    defaultPointsPerCompletion: 5,
    priorityMultipliers: {
      low: 1,
      medium: 1.2,
      high: 1.5
    }
  },

  // Mood tracking configuration
  mood: {
    pointsPerEntry: 2,
    reminderHours: [9, 14, 19], // 9 AM, 2 PM, 7 PM
    streakBonusMultiplier: 1.3
  },

  // Focus session configuration
  focus: {
    defaultDuration: 25, // minutes
    shortBreak: 5,
    longBreak: 15,
    pointsPerMinute: 1
  }
};

// Validate configuration
const validateConfig = () => {
  const errors = [];

  // Check email configuration if email features are enabled
  if (config.features.enableEmailNotifications) {
    if (!config.email.user || !config.email.password) {
      errors.push('Email notifications enabled but SMTP credentials missing');
    }
  }

  // Check storage configuration
  if (config.storage.type === 'aws') {
    if (!config.storage.aws.accessKeyId || !config.storage.aws.secretAccessKey) {
      errors.push('AWS storage configured but credentials missing');
    }
  }

  // Check WebSocket configuration
  if (config.features.enableChat && !config.websocket.port) {
    errors.push('Chat enabled but WebSocket port not configured');
  }

  return errors;
};

// Validate configuration on startup
const configErrors = validateConfig();
if (configErrors.length > 0) {
  console.warn('⚠️ Configuration warnings:');
  configErrors.forEach(error => console.warn(`  - ${error}`));
}

// Helper functions
const isDevelopment = () => config.server.environment === 'development';
const isProduction = () => config.server.environment === 'production';
const isTest = () => config.server.environment === 'test';

// Get configuration for specific environment
const getEnvConfig = (env = config.server.environment) => {
  const envConfigs = {
    development: {
      logging: true,
      debug: true,
      minifyResponses: false,
      cacheTimeout: 0
    },
    production: {
      logging: false,
      debug: false,
      minifyResponses: true,
      cacheTimeout: 3600
    },
    test: {
      logging: false,
      debug: false,
      minifyResponses: false,
      cacheTimeout: 0
    }
  };

  return envConfigs[env] || envConfigs.development;
};

// Export configuration
module.exports = {
  ...config,
  isDevelopment,
  isProduction,
  isTest,
  getEnvConfig,
  validateConfig
};