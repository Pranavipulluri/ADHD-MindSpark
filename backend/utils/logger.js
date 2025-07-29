const fs = require('fs');
const path = require('path');
const config = require('../config');

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor() {
    this.logLevel = this.getLogLevel();
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDirectory();
  }

  getLogLevel() {
    const level = process.env.LOG_LEVEL || (config.isDevelopment ? 'DEBUG' : 'INFO');
    return LOG_LEVELS[level.toUpperCase()] || LOG_LEVELS.INFO;
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const pid = process.pid;
    
    const logEntry = {
      timestamp,
      level,
      pid,
      message,
      ...meta
    };

    return JSON.stringify(logEntry);
  }

  shouldLog(level) {
    return LOG_LEVELS[level] <= this.logLevel;
  }

  writeToFile(level, formattedMessage) {
    if (!config.isProduction) return; // Only write to files in production
    
    const date = new Date().toISOString().split('T')[0];
    const filename = `${level.toLowerCase()}-${date}.log`;
    const filepath = path.join(this.logDir, filename);
    
    try {
      fs.appendFileSync(filepath, formattedMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, meta);
    
    // Console output with colors
    const colors = {
      ERROR: '\x1b[31m', // Red
      WARN: '\x1b[33m',  // Yellow
      INFO: '\x1b[36m',  // Cyan
      DEBUG: '\x1b[37m'  // White
    };
    
    const resetColor = '\x1b[0m';
    const colorCode = colors[level] || colors.INFO;
    
    console.log(`${colorCode}[${level}]${resetColor} ${message}`, meta);
    
    // Write to file in production
    this.writeToFile(level, formattedMessage);
  }

  error(message, meta = {}) {
    // If meta is an Error object, extract useful information
    if (meta instanceof Error) {
      meta = {
        error_message: meta.message,
        error_stack: meta.stack,
        error_name: meta.name
      };
    }
    
    this.log('ERROR', message, meta);
  }

  warn(message, meta = {}) {
    this.log('WARN', message, meta);
  }

  info(message, meta = {}) {
    this.log('INFO', message, meta);
  }

  debug(message, meta = {}) {
    this.log('DEBUG', message, meta);
  }

  // HTTP request logger middleware
  requestLogger() {
    return (req, res, next) => {
      const start = Date.now();
      const { method, url, ip } = req;
      const userAgent = req.get('User-Agent') || '';
      
      // Log request
      this.info('HTTP Request', {
        method,
        url,
        ip,
        user_agent: userAgent,
        user_id: req.user?.id || null
      });

      // Capture response
      const originalSend = res.send;
      res.send = function(data) {
        const duration = Date.now() - start;
        const { statusCode } = res;
        
        // Log response
        logger.info('HTTP Response', {
          method,
          url,
          status_code: statusCode,
          duration_ms: duration,
          user_id: req.user?.id || null
        });

        return originalSend.call(this, data);
      };

      next();
    };
  }

  // Database query logger
  queryLogger(query, params = [], duration = 0) {
    if (config.isDevelopment) {
      this.debug('Database Query', {
        query: query.replace(/\s+/g, ' ').trim(),
        params,
        duration_ms: duration
      });
    }
  }

  // Authentication events logger
  authLogger(event, userId, details = {}) {
    this.info('Auth Event', {
      event,
      user_id: userId,
      ...details
    });
  }

  // Error aggregation for monitoring
  errorAggregator(error, context = {}) {
    const errorKey = `${error.name}:${error.message}`;
    
    this.error('Application Error', {
      error_key: errorKey,
      error_message: error.message,
      error_stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });

    // In production, you might want to send this to an external service
    if (config.isProduction && config.monitoring.sentryDsn) {
      // Send to Sentry or similar service
      this.sendToMonitoring(error, context);
    }
  }

  sendToMonitoring(error, context) {
    // Placeholder for external monitoring service integration
    // This would typically send errors to services like Sentry, DataDog, etc.
    try {
      // Example: Sentry.captureException(error, { extra: context });
    } catch (monitoringError) {
      this.error('Failed to send error to monitoring service', {
        original_error: error.message,
        monitoring_error: monitoringError.message
      });
    }
  }

  // Performance monitoring
  performanceLogger(operation, duration, metadata = {}) {
    const level = duration > 1000 ? 'WARN' : 'INFO';
    this.log(level, `Performance: ${operation}`, {
      operation,
      duration_ms: duration,
      ...metadata
    });
  }

  // Security events logger
  securityLogger(event, details = {}) {
    this.warn('Security Event', {
      event,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  // Business events logger (for analytics)
  businessLogger(event, userId, data = {}) {
    this.info('Business Event', {
      event,
      user_id: userId,
      data,
      timestamp: new Date().toISOString()
    });
  }

  // Log cleanup - remove old log files
  cleanup(daysToKeep = 30) {
    if (!fs.existsSync(this.logDir)) return;

    const files = fs.readdirSync(this.logDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    files.forEach(file => {
      const filePath = path.join(this.logDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < cutoffDate) {
        try {
          fs.unlinkSync(filePath);
          this.info(`Cleaned up old log file: ${file}`);
        } catch (error) {
          this.error(`Failed to cleanup log file: ${file}`, error);
        }
      }
    });
  }

  // Get log stats
  getStats() {
    try {
      const files = fs.readdirSync(this.logDir);
      const stats = {
        total_files: files.length,
        total_size: 0,
        files_by_level: {}
      };

      files.forEach(file => {
        const filePath = path.join(this.logDir, file);
        const fileStats = fs.statSync(filePath);
        stats.total_size += fileStats.size;

        const level = file.split('-')[0].toUpperCase();
        stats.files_by_level[level] = (stats.files_by_level[level] || 0) + 1;
      });

      return stats;
    } catch (error) {
      this.error('Failed to get log stats', error);
      return null;
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Setup cleanup interval (daily cleanup)
if (config.isProduction) {
  setInterval(() => {
    logger.cleanup();
  }, 24 * 60 * 60 * 1000); // 24 hours
}

// Express middleware for request logging
const requestLogger = logger.requestLogger();

// Helper functions for common logging patterns
const loggers = {
  // HTTP request/response logging
  http: {
    request: (req) => logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      user_id: req.user?.id
    }),
    response: (req, res, duration) => logger.info('HTTP Response', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration_ms: duration
    })
  },

  // Database operations
  db: {
    query: (query, duration) => logger.queryLogger(query, [], duration),
    error: (error, query) => logger.error('Database Error', { error, query }),
    connection: (event) => logger.info('Database Connection', { event })
  },

  // Authentication events
  auth: {
    login: (userId, ip) => logger.authLogger('LOGIN', userId, { ip }),
    logout: (userId) => logger.authLogger('LOGOUT', userId),
    register: (userId, email) => logger.authLogger('REGISTER', userId, { email }),
    failed_login: (email, ip) => logger.securityLogger('FAILED_LOGIN', { email, ip })
  },

  // Business events
  business: {
    taskCompleted: (userId, taskId) => logger.businessLogger('TASK_COMPLETED', userId, { task_id: taskId }),
    gameScoreSubmitted: (userId, gameId, score) => logger.businessLogger('GAME_SCORE', userId, { game_id: gameId, score }),
    appointmentBooked: (userId, specialistId) => logger.businessLogger('APPOINTMENT_BOOKED', userId, { specialist_id: specialistId })
  },

  // Security events
  security: {
    rateLimitHit: (ip, endpoint) => logger.securityLogger('RATE_LIMIT_HIT', { ip, endpoint }),
    suspiciousActivity: (userId, activity) => logger.securityLogger('SUSPICIOUS_ACTIVITY', { user_id: userId, activity }),
    unauthorizedAccess: (ip, endpoint) => logger.securityLogger('UNAUTHORIZED_ACCESS', { ip, endpoint })
  }
};

module.exports = {
  logger,
  requestLogger,
  loggers,
  LOG_LEVELS
};