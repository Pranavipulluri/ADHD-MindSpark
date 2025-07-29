const { USER_LEVELS, POINTS, MOOD_TYPES } = require('./constants');

// Date and time utilities
const dateHelpers = {
  /**
   * Format date to a readable string
   * @param {Date|string} date - Date to format
   * @param {string} format - Format type ('short', 'long', 'time', 'datetime')
   * @returns {string} Formatted date string
   */
  formatDate(date, format = 'short') {
    const d = new Date(date);
    
    const options = {
      short: { year: 'numeric', month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
      time: { hour: '2-digit', minute: '2-digit' },
      datetime: { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      }
    };
    
    return d.toLocaleDateString('en-US', options[format] || options.short);
  },

  /**
   * Get date range for common periods
   * @param {string} period - Period type ('today', 'week', 'month', 'year')
   * @returns {Object} Object with start and end dates
   */
  getDateRange(period) {
    const now = new Date();
    const ranges = {
      today: {
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      },
      week: {
        start: new Date(now.setDate(now.getDate() - now.getDay())),
        end: new Date(now.setDate(now.getDate() - now.getDay() + 6))
      },
      month: {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0)
      },
      year: {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31)
      }
    };
    
    return ranges[period] || ranges.today;
  },

  /**
   * Calculate days between two dates
   * @param {Date|string} date1 
   * @param {Date|string} date2 
   * @returns {number} Number of days
   */
  daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  /**
   * Check if date is today
   * @param {Date|string} date 
   * @returns {boolean}
   */
  isToday(date) {
    const d = new Date(date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  },

  /**
   * Get relative time string (e.g., "2 hours ago")
   * @param {Date|string} date 
   * @returns {string}
   */
  getRelativeTime(date) {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now - d;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return this.formatDate(date, 'short');
  }
};

// Points and level utilities
const pointsHelpers = {
  /**
   * Calculate user level based on points
   * @param {number} points - Total points
   * @returns {Object} Level information
   */
  calculateLevel(points) {
    let currentLevel = 1;
    let currentLevelInfo = USER_LEVELS[1];
    
    for (const [level, info] of Object.entries(USER_LEVELS)) {
      if (points >= info.min_points && points <= info.max_points) {
        currentLevel = parseInt(level);
        currentLevelInfo = info;
        break;
      }
    }
    
    const nextLevelInfo = USER_LEVELS[currentLevel + 1];
    const progressToNext = nextLevelInfo ? 
      ((points - currentLevelInfo.min_points) / (nextLevelInfo.min_points - currentLevelInfo.min_points)) * 100 : 100;
    
    return {
      current_level: currentLevel,
      level_title: currentLevelInfo.title,
      current_points: points,
      level_min_points: currentLevelInfo.min_points,
      level_max_points: currentLevelInfo.max_points,
      next_level: nextLevelInfo ? currentLevel + 1 : null,
      next_level_title: nextLevelInfo?.title || null,
      points_to_next: nextLevelInfo ? nextLevelInfo.min_points - points : 0,
      progress_percentage: Math.round(progressToNext)
    };
  },

  /**
   * Calculate points for different activities
   * @param {string} activityType - Type of activity
   * @param {Object} options - Additional options for point calculation
   * @returns {number} Points earned
   */
  calculateActivityPoints(activityType, options = {}) {
    const { priority, difficulty, streak, bonus } = options;
    let basePoints = POINTS[activityType.toUpperCase()] || 0;
    
    // Priority multiplier
    if (priority === 'high') basePoints = Math.round(basePoints * 1.5);
    else if (priority === 'low') basePoints = Math.round(basePoints * 0.8);
    
    // Difficulty multiplier
    if (difficulty === 'hard') basePoints = Math.round(basePoints * 1.3);
    else if (difficulty === 'easy') basePoints = Math.round(basePoints * 0.9);
    
    // Streak bonus
    if (streak && streak >= 3) basePoints = Math.round(basePoints * (1 + (streak * 0.1)));
    
    // Additional bonus
    if (bonus) basePoints = Math.round(basePoints * (1 + bonus));
    
    return Math.max(1, basePoints);
  },

  /**
   * Format points with appropriate suffix
   * @param {number} points 
   * @returns {string}
   */
  formatPoints(points) {
    if (points >= 1000000) return `${(points / 1000000).toFixed(1)}M`;
    if (points >= 1000) return `${(points / 1000).toFixed(1)}K`;
    return points.toString();
  }
};

// String utilities
const stringHelpers = {
  /**
   * Capitalize first letter of each word
   * @param {string} str 
   * @returns {string}
   */
  titleCase(str) {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  },

  /**
   * Convert string to slug format
   * @param {string} str 
   * @returns {string}
   */
  slugify(str) {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  /**
   * Truncate string with ellipsis
   * @param {string} str 
   * @param {number} maxLength 
   * @returns {string}
   */
  truncate(str, maxLength = 100) {
    if (str.length <= maxLength) return str;
    return str.substr(0, maxLength).trim() + '...';
  },

  /**
   * Extract initials from name
   * @param {string} name 
   * @returns {string}
   */
  getInitials(name) {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substr(0, 2);
  },

  /**
   * Generate random string
   * @param {number} length 
   * @param {string} charset 
   * @returns {string}
   */
  randomString(length = 8, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }
};

// Array utilities
const arrayHelpers = {
  /**
   * Remove duplicates from array
   * @param {Array} arr 
   * @param {string} key - Key to check for objects
   * @returns {Array}
   */
  unique(arr, key = null) {
    if (key) {
      const seen = new Set();
      return arr.filter(item => {
        const keyValue = item[key];
        if (seen.has(keyValue)) return false;
        seen.add(keyValue);
        return true;
      });
    }
    return [...new Set(arr)];
  },

  /**
   * Group array by key
   * @param {Array} arr 
   * @param {string} key 
   * @returns {Object}
   */
  groupBy(arr, key) {
    return arr.reduce((groups, item) => {
      const group = item[key];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  },

  /**
   * Sort array by multiple keys
   * @param {Array} arr 
   * @param {Array} keys - Array of sort keys with direction
   * @returns {Array}
   */
  sortBy(arr, keys) {
    return arr.sort((a, b) => {
      for (const key of keys) {
        const { field, direction = 'asc' } = typeof key === 'string' ? { field: key } : key;
        const aVal = a[field];
        const bVal = b[field];
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  },

  /**
   * Paginate array
   * @param {Array} arr 
   * @param {number} page 
   * @param {number} limit 
   * @returns {Object}
   */
  paginate(arr, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const paginatedItems = arr.slice(offset, offset + limit);
    
    return {
      items: paginatedItems,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(arr.length / limit),
        total_items: arr.length,
        items_per_page: limit,
        has_next: page < Math.ceil(arr.length / limit),
        has_prev: page > 1
      }
    };
  }
};

// Validation utilities
const validationHelpers = {
  /**
   * Validate email format
   * @param {string} email 
   * @returns {boolean}
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate password strength
   * @param {string} password 
   * @returns {Object}
   */
  validatePassword(password) {
    const result = {
      isValid: false,
      score: 0,
      issues: []
    };
    
    if (password.length < 6) result.issues.push('Password must be at least 6 characters');
    else result.score += 1;
    
    if (!/[a-z]/.test(password)) result.issues.push('Password must contain lowercase letters');
    else result.score += 1;
    
    if (!/[A-Z]/.test(password)) result.issues.push('Password must contain uppercase letters');
    else result.score += 1;
    
    if (!/\d/.test(password)) result.issues.push('Password must contain numbers');
    else result.score += 1;
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) result.issues.push('Password should contain special characters');
    else result.score += 1;
    
    result.isValid = result.issues.length === 0;
    return result;
  },

  /**
   * Sanitize HTML content
   * @param {string} html 
   * @returns {string}
   */
  sanitizeHtml(html) {
    return html
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  /**
   * Validate UUID format
   * @param {string} uuid 
   * @returns {boolean}
   */
  isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
};

// File utilities
const fileHelpers = {
  /**
   * Get file extension
   * @param {string} filename 
   * @returns {string}
   */
  getExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  },

  /**
   * Format file size
   * @param {number} bytes 
   * @returns {string}
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Check if file type is allowed
   * @param {string} filename 
   * @param {Array} allowedTypes 
   * @returns {boolean}
   */
  isAllowedFileType(filename, allowedTypes) {
    const extension = this.getExtension(filename);
    return allowedTypes.includes(extension);
  },

  /**
   * Generate unique filename
   * @param {string} originalName 
   * @returns {string}
   */
  generateUniqueFilename(originalName) {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1E9);
    const extension = this.getExtension(originalName);
    const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
    
    return `${stringHelpers.slugify(baseName)}-${timestamp}-${random}.${extension}`;
  }
};

// Mood utilities
const moodHelpers = {
  /**
   * Get mood information by type
   * @param {string} moodType 
   * @returns {Object}
   */
  getMoodInfo(moodType) {
    return MOOD_TYPES[moodType.toUpperCase()] || MOOD_TYPES.HAPPY;
  },

  /**
   * Calculate mood trend
   * @param {Array} moodEntries - Array of mood entries
   * @returns {Object}
   */
  calculateMoodTrend(moodEntries) {
    if (moodEntries.length < 2) {
      return { trend: 'stable', change: 0, message: 'Not enough data' };
    }
    
    const recent = moodEntries.slice(-7); // Last 7 entries
    const earlier = moodEntries.slice(-14, -7); // 7 entries before that
    
    const moodValues = {
      angry: 1, worried: 2, calm: 3, happy: 4, excited: 5
    };
    
    const recentAvg = recent.reduce((sum, entry) => 
      sum + (moodValues[entry.mood_type] || 3), 0) / recent.length;
    const earlierAvg = earlier.length > 0 ? 
      earlier.reduce((sum, entry) => sum + (moodValues[entry.mood_type] || 3), 0) / earlier.length : recentAvg;
    
    const change = recentAvg - earlierAvg;
    
    let trend = 'stable';
    let message = 'Your mood has been stable';
    
    if (change > 0.5) {
      trend = 'improving';
      message = 'Your mood has been improving! 😊';
    } else if (change < -0.5) {
      trend = 'declining';
      message = 'Your mood seems to be declining. Consider talking to someone. 💙';
    }
    
    return { trend, change: Math.round(change * 100) / 100, message };
  }
};

// Error handling utilities
const errorHelpers = {
  /**
   * Create standardized error response
   * @param {string} message 
   * @param {number} statusCode 
   * @param {string} code 
   * @param {Array} details 
   * @returns {Object}
   */
  createErrorResponse(message, statusCode = 500, code = 'INTERNAL_ERROR', details = []) {
    return {
      success: false,
      error: message,
      code,
      status_code: statusCode,
      details,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Log error with context
   * @param {Error} error 
   * @param {Object} context 
   */
  logError(error, context = {}) {
    console.error('Error occurred:', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }
};

// Analytics utilities
const analyticsHelpers = {
  /**
   * Calculate percentage change
   * @param {number} currentValue 
   * @param {number} previousValue 
   * @returns {number}
   */
  calculatePercentageChange(currentValue, previousValue) {
    if (previousValue === 0) return currentValue > 0 ? 100 : 0;
    return ((currentValue - previousValue) / previousValue) * 100;
  },

  /**
   * Calculate moving average
   * @param {Array} values 
   * @param {number} period 
   * @returns {Array}
   */
  calculateMovingAverage(values, period = 7) {
    const result = [];
    for (let i = period - 1; i < values.length; i++) {
      const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
    return result;
  },

  /**
   * Generate insights from data
   * @param {Object} data 
   * @returns {Array}
   */
  generateInsights(data) {
    const insights = [];
    
    // Add specific insight generation logic based on your needs
    if (data.trend === 'improving') {
      insights.push({
        type: 'positive',
        message: 'Great progress! Keep up the good work! 🌟',
        icon: '📈'
      });
    }
    
    return insights;
  }
};

module.exports = {
  dateHelpers,
  pointsHelpers,
  stringHelpers,
  arrayHelpers,
  validationHelpers,
  fileHelpers,
  moodHelpers,
  errorHelpers,
  analyticsHelpers
};