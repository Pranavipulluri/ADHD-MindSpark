module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'tests/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'routes/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Test timeout
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,

  // Handle ES6 modules
  transform: {},

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/helpers/globalSetup.js',
  globalTeardown: '<rootDir>/tests/helpers/globalTeardown.js',

  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@middleware/(.*)$': '<rootDir>/middleware/$1',
    '^@models/(.*)$': '<rootDir>/models/$1',
    '^@routes/(.*)$': '<rootDir>/routes/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1'
  },

  // Test result processor
  testResultsProcessor: 'jest-sonar-reporter',

  // Force exit after tests complete
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Maximum number of concurrent workers
  maxWorkers: '50%'
};
