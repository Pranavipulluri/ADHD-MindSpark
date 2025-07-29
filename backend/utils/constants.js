// Application Constants

// User levels and points
const USER_LEVELS = {
  1: { min_points: 0, max_points: 99, title: 'Beginner' },
  2: { min_points: 100, max_points: 249, title: 'Explorer' },
  3: { min_points: 250, max_points: 499, title: 'Adventurer' },
  4: { min_points: 500, max_points: 999, title: 'Champion' },
  5: { min_points: 1000, max_points: 1999, title: 'Master' },
  6: { min_points: 2000, max_points: 4999, title: 'Legend' },
  7: { min_points: 5000, max_points: 9999, title: 'Hero' },
  8: { min_points: 10000, max_points: 19999, title: 'Superhero' },
  9: { min_points: 20000, max_points: 49999, title: 'Ultimate' },
  10: { min_points: 50000, max_points: Infinity, title: 'Legendary Master' }
};

// Points system
const POINTS = {
  MOOD_TRACKED: 2,
  MOOD_STREAK_BONUS: 1,
  TASK_COMPLETED_LOW: 5,
  TASK_COMPLETED_MEDIUM: 10,
  TASK_COMPLETED_HIGH: 15,
  TASK_QUICK_COMPLETION_BONUS: 0.2, // 20% bonus
  GAME_COMPLETED: 10,
  GAME_HIGH_ACCURACY_BONUS: 0.2, // 20% bonus for 90%+ accuracy
  GAME_HIGH_LEVEL_BONUS: 0.1, // 10% bonus for level 5+
  GAME_PERSONAL_BEST_BONUS: 0.5, // 50% bonus for personal best
  FOCUS_SESSION_COMPLETED: 15,
  BREATHING_SESSION_COMPLETED: 8,
  DOCUMENT_UPLOADED: 3,
  NOTE_CREATED: 2,
  CHAT_MESSAGE_SENT: 1,
  APPOINTMENT_ATTENDED: 25,
  PROFILE_COMPLETED: 10
};

// Mood types
const MOOD_TYPES = {
  HAPPY: { emoji: '😊', color: '#FFD700', label: 'Happy' },
  EXCITED: { emoji: '😍', color: '#FF9FF3', label: 'Excited' },
  CALM: { emoji: '😌', color: '#7BEDAF', label: 'Calm' },
  WORRIED: { emoji: '😟', color: '#7BD3F7', label: 'Worried' },
  ANGRY: { emoji: '😠', color: '#FF6B6B', label: 'Angry' }
};

// Task priorities and statuses
const TASK_PRIORITIES = {
  LOW: { color: '#4CAF50', label: 'Low Priority' },
  MEDIUM: { color: '#FFA000', label: 'Medium Priority' },
  HIGH: { color: '#F44336', label: 'High Priority' }
};

const TASK_STATUSES = {
  MUST_DO: { color: '#FFB84C', label: 'Must-Do' },
  CAN_WAIT: { color: '#4D96FF', label: 'Can-Wait' },
  DONE: { color: '#4CAF50', label: 'Done' }
};

// Game categories
const GAME_CATEGORIES = {
  STRATEGY: 'strategy',
  MEMORY: 'memory',
  ATTENTION: 'attention',
  COGNITIVE: 'cognitive',
  LANGUAGE: 'language',
  MATH: 'math',
  PUZZLE: 'puzzle',
  REFLEX: 'reflex'
};

// Document categories
const DOCUMENT_CATEGORIES = {
  HOMEWORK: { name: 'Homework', color: '#FF6B6B', description: 'School assignments and homework' },
  NOTES: { name: 'Notes', color: '#4ECDC4', description: 'Personal notes and study materials' },
  READING: { name: 'Reading', color: '#45B7D1', description: 'Reading materials and books' },
  RESOURCES: { name: 'Resources', color: '#96CEB4', description: 'Educational resources and references' },
  PROJECTS: { name: 'Projects', color: '#FFA07A', description: 'Long-term projects and assignments' },
  WORKSHEETS: { name: 'Worksheets', color: '#98D8C8', description: 'Practice worksheets and exercises' }
};

// Session types
const SESSION_TYPES = {
  FOCUS_TIMER: 'focus_timer',
  BREATHING: 'breathing',
  MEDITATION: 'meditation'
};

// Appointment statuses
const APPOINTMENT_STATUSES = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'no-show'
};

// Chat room types
const CHAT_ROOM_TYPES = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  GROUP: 'group'
};

// File upload limits
const FILE_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt'],
  MAX_FILES_PER_USER: 100
};

// Rate limiting
const RATE_LIMITS = {
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 5
  },
  API: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes  
    MAX_REQUESTS: 100
  },
  UPLOAD: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX_REQUESTS: 10
  },
  CHAT: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 20
  }
};

// Validation constants
const VALIDATION = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9_]+$/
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 100
  },
  TASK_TITLE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 200
  },
  TASK_DESCRIPTION: {
    MAX_LENGTH: 1000
  },
  MOOD_NOTES: {
    MAX_LENGTH: 500
  },
  CHAT_MESSAGE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 1000
  },
  DOCUMENT_TITLE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 200
  },
  DOCUMENT_CONTENT: {
    MAX_LENGTH: 50000
  }
};

// Time constants
const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};

// WebSocket event types
const WS_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  AUTH: 'auth',
  AUTH_SUCCESS: 'auth_success',
  AUTH_FAILED: 'auth_failed',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  CHAT_MESSAGE: 'chat_message',
  NEW_MESSAGE: 'new_message',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  USER_TYPING: 'user_typing',
  USER_JOINED_ROOM: 'user_joined_room',
  USER_LEFT_ROOM: 'user_left_room',
  FOCUS_SESSION_UPDATE: 'focus_session_update',
  GAME_CHALLENGE: 'game_challenge',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  ERROR: 'error'
};

// Achievement criteria types
const ACHIEVEMENT_CRITERIA = {
  TASK_COUNT: 'task_count',
  GAME_COUNT: 'game_count',
  MOOD_STREAK: 'mood_streak',
  FOCUS_SESSION_COUNT: 'focus_session_count',
  CHAT_MESSAGE_COUNT: 'chat_message_count',
  DOCUMENT_COUNT: 'document_count',
  HIGH_SCORE: 'high_score',
  TOTAL_POINTS: 'total_points',
  STREAK_DAYS: 'streak_days'
};

// Error codes
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED: 'AUTHORIZATION_FAILED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  WEBSOCKET_ERROR: 'WEBSOCKET_ERROR'
};

// Email templates
const EMAIL_TEMPLATES = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset',
  APPOINTMENT_CONFIRMATION: 'appointment_confirmation',
  APPOINTMENT_REMINDER: 'appointment_reminder',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  WEEKLY_PROGRESS: 'weekly_progress'
};

// API response messages
const MESSAGES = {
  SUCCESS: {
    USER_CREATED: 'User created successfully',
    LOGIN_SUCCESSFUL: 'Login successful',
    PROFILE_UPDATED: 'Profile updated successfully',
    PASSWORD_CHANGED: 'Password changed successfully',
    TASK_CREATED: 'Task created successfully',
    TASK_UPDATED: 'Task updated successfully',
    TASK_DELETED: 'Task deleted successfully',
    MOOD_RECORDED: 'Mood recorded successfully',
    DOCUMENT_UPLOADED: 'Document uploaded successfully',
    MESSAGE_SENT: 'Message sent successfully',
    APPOINTMENT_BOOKED: 'Appointment booked successfully'
  },
  ERROR: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    USER_NOT_FOUND: 'User not found',
    USERNAME_TAKEN: 'Username is already taken',
    EMAIL_TAKEN: 'Email is already registered',
    TASK_NOT_FOUND: 'Task not found',
    DOCUMENT_NOT_FOUND: 'Document not found',
    INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action',
    INTERNAL_SERVER_ERROR: 'An internal server error occurred',
    VALIDATION_FAILED: 'Please check your input data',
    RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later'
  }
};

module.exports = {
  USER_LEVELS,
  POINTS,
  MOOD_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  GAME_CATEGORIES,
  DOCUMENT_CATEGORIES,
  SESSION_TYPES,
  APPOINTMENT_STATUSES,
  CHAT_ROOM_TYPES,
  FILE_LIMITS,
  RATE_LIMITS,
  VALIDATION,
  TIME,
  PAGINATION,
  WS_EVENTS,
  ACHIEVEMENT_CRITERIA,
  ERROR_CODES,
  EMAIL_TEMPLATES,
  MESSAGES
};