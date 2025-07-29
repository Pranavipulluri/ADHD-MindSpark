// tests/setup.js
const { Pool } = require('pg');

// Test database setup
const testPool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/mindspark_test_db',
  ssl: false
});

// Global test setup
beforeAll(async () => {
  // Create test database tables
  console.log('Setting up test database...');
  
  // Run migrations for test database
  await testPool.query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- Create all necessary tables for testing
    CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_url TEXT,
      date_of_birth DATE,
      parent_email TEXT,
      points INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      streak_days INTEGER DEFAULT 0,
      last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      preferences JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS games (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      difficulty_level INTEGER DEFAULT 1,
      points_per_completion INTEGER DEFAULT 10,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
      status TEXT CHECK (status IN ('must-do', 'can-wait', 'done')) DEFAULT 'must-do',
      due_date TIMESTAMP WITH TIME ZONE,
      completed_at TIMESTAMP WITH TIME ZONE,
      points_earned INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS mood_entries (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
      mood_type TEXT NOT NULL CHECK (mood_type IN ('happy', 'excited', 'calm', 'worried', 'angry')),
      mood_intensity INTEGER CHECK (mood_intensity BETWEEN 1 AND 5),
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
});

// Clean up after all tests
afterAll(async () => {
  console.log('Cleaning up test database...');
  await testPool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await testPool.end();
});

// Clean up after each test
afterEach(async () => {
  // Clear all data but keep schema
  await testPool.query(`
    DELETE FROM mood_entries;
    DELETE FROM tasks;
    DELETE FROM profiles;
    DELETE FROM games;
  `);
});

module.exports = { testPool };

// tests/helpers/testHelpers.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { testPool } = require('../setup');

class TestHelpers {
  static async createTestUser(userData = {}) {
    const defaultUser = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
      points: 0,
      level: 1
    };
    
    const user = { ...defaultUser, ...userData };
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const userId = uuidv4();
    
    const result = await testPool.query(`
      INSERT INTO profiles (id, email, username, password_hash, points, level)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, username, points, level, created_at
    `, [userId, user.email, user.username, hashedPassword, user.points, user.level]);
    
    return {
      ...result.rows[0],
      password: user.password // Return original password for testing
    };
  }
  
  static generateAuthToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );
  }
  
  static async createTestTask(userId, taskData = {}) {
    const defaultTask = {
      title: 'Test Task',
      description: 'Test task description',
      priority: 'medium',
      status: 'must-do'
    };
    
    const task = { ...defaultTask, ...taskData };
    
    const result = await testPool.query(`
      INSERT INTO tasks (user_id, title, description, priority, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [userId, task.title, task.description, task.priority, task.status]);
    
    return result.rows[0];
  }
  
  static async createTestGame(gameData = {}) {
    const defaultGame = {
      name: 'Test Game',
      description: 'Test game description',
      category: 'test',
      difficulty_level: 1,
      points_per_completion: 10
    };
    
    const game = { ...defaultGame, ...gameData };
    
    const result = await testPool.query(`
      INSERT INTO games (name, description, category, difficulty_level, points_per_completion)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [game.name, game.description, game.category, game.difficulty_level, game.points_per_completion]);
    
    return result.rows[0];
  }
  
  static async createTestMoodEntry(userId, moodData = {}) {
    const defaultMood = {
      mood_type: 'happy',
      mood_intensity: 4,
      notes: 'Test mood entry'
    };
    
    const mood = { ...defaultMood, ...moodData };
    
    const result = await testPool.query(`
      INSERT INTO mood_entries (user_id, mood_type, mood_intensity, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [userId, mood.mood_type, mood.mood_intensity, mood.notes]);
    
    return result.rows[0];
  }
  
  static async clearDatabase() {
    await testPool.query('DELETE FROM mood_entries');
    await testPool.query('DELETE FROM tasks');
    await testPool.query('DELETE FROM profiles');
    await testPool.query('DELETE FROM games');
  }
  
  static generateRandomEmail() {
    return `test${Math.random().toString(36).substring(7)}@example.com`;
  }
  
  static generateRandomUsername() {
    return `testuser${Math.random().toString(36).substring(7)}`;
  }
}

module.exports = TestHelpers;

// tests/auth.test.js
const request = require('supertest');
const app = require('../server'); // Assuming your main app is exported from server.js
const TestHelpers = require('./helpers/testHelpers');

describe('Authentication Endpoints', () => {
  beforeEach(async () => {
    await TestHelpers.clearDatabase();
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        email: TestHelpers.generateRandomEmail(),
        username: TestHelpers.generateRandomUsername(),
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User created successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.username).toBe(userData.username);
    });

    test('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('should reject duplicate email registration', async () => {
      const userData = {
        email: 'duplicate@example.com',
        username: 'user1',
        password: 'password123'
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Attempt duplicate registration
      const duplicateUser = {
        ...userData,
        username: 'user2'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateUser)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    test('should login with valid credentials', async () => {
      const user = await TestHelpers.createTestUser();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: user.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
    });

    test('should reject login with invalid credentials', async () => {
      const user = await TestHelpers.createTestUser();

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });
  });

  describe('GET /api/auth/profile', () => {
    test('should get user profile with valid token', async () => {
      const user = await TestHelpers.createTestUser();
      const token = TestHelpers.generateAuthToken(user);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.id).toBe(user.id);
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });
  });
});

// tests/tasks.test.js
const request = require('supertest');
const app = require('../server');
const TestHelpers = require('./helpers/testHelpers');

describe('Task Management Endpoints', () => {
  let user;
  let authToken;

  beforeEach(async () => {
    await TestHelpers.clearDatabase();
    user = await TestHelpers.createTestUser();
    authToken = TestHelpers.generateAuthToken(user);
  });

  describe('POST /api/tasks', () => {
    test('should create a new task', async () => {
      const taskData = {
        title: 'Complete homework',
        description: 'Math exercises 1-10',
        priority: 'high'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(201);

      expect(response.body).toHaveProperty('task');
      expect(response.body.task.title).toBe(taskData.title);
      expect(response.body.task.status).toBe('must-do');
    });

    test('should reject task creation without title', async () => {
      const taskData = {
        description: 'Task without title'
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send(taskData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/tasks', () => {
    test('should get user tasks', async () => {
      await TestHelpers.createTestTask(user.id, { title: 'Task 1' });
      await TestHelpers.createTestTask(user.id, { title: 'Task 2' });

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('tasks');
      expect(response.body.tasks).toHaveLength(2);
    });

    test('should filter tasks by status', async () => {
      await TestHelpers.createTestTask(user.id, { title: 'Todo Task', status: 'must-do' });
      await TestHelpers.createTestTask(user.id, { title: 'Done Task', status: 'done' });

      const response = await request(app)
        .get('/api/tasks?status=done')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.tasks).toHaveLength(1);
      expect(response.body.tasks[0].status).toBe('done');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    test('should update task status', async () => {
      const task = await TestHelpers.createTestTask(user.id);

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'done' })
        .expect(200);

      expect(response.body.task.status).toBe('done');
      expect(response.body.task.completed_at).toBeTruthy();
    });

    test('should not update task from different user', async () => {
      const otherUser = await TestHelpers.createTestUser({ 
        email: 'other@example.com', 
        username: 'otheruser' 
      });
      const task = await TestHelpers.createTestTask(otherUser.id);

      const response = await request(app)
        .put(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'done' })
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Task not found');
    });
  });
});

// tests/games.test.js
const request = require('supertest');
const app = require('../server');
const TestHelpers = require('./helpers/testHelpers');

describe('Game Endpoints', () => {
  let user;
  let authToken;
  let game;

  beforeEach(async () => {
    await TestHelpers.clearDatabase();
    user = await TestHelpers.createTestUser();
    authToken = TestHelpers.generateAuthToken(user);
    game = await TestHelpers.createTestGame();
  });

  describe('GET /api/games', () => {
    test('should get available games', async () => {
      const response = await request(app)
        .get('/api/games')
        .expect(200);

      expect(response.body).toHaveProperty('games');
      expect(response.body.games).toHaveLength(1);
      expect(response.body.games[0].name).toBe(game.name);
    });
  });

  describe('POST /api/games/:gameId/scores', () => {
    test('should submit game score', async () => {
      const scoreData = {
        score: 1000,
        completion_time: '00:02:30',
        accuracy_percentage: 95.5,
        level_reached: 3
      };

      const response = await request(app)
        .post(`/api/games/${game.id}/scores`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(scoreData)
        .expect(201);

      expect(response.body).toHaveProperty('game_score');
      expect(response.body).toHaveProperty('points_earned');
      expect(response.body.game_score.score).toBe(scoreData.score);
    });

    test('should reject score submission without authentication', async () => {
      const scoreData = {
        score: 1000
      };

      const response = await request(app)
        .post(`/api/games/${game.id}/scores`)
        .send(scoreData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/games/scores', () => {
    test('should get user game scores', async () => {
      // First submit a score
      await request(app)
        .post(`/api/games/${game.id}/scores`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ score: 1000 });

      const response = await request(app)
        .get('/api/games/scores')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('scores');
      expect(response.body.scores).toHaveLength(1);
    });
  });
});

// tests/mood.test.js
const request = require('supertest');
const app = require('../server');
const TestHelpers = require('./helpers/testHelpers');

describe('Mood Tracking Endpoints', () => {
  let user;
  let authToken;

  beforeEach(async () => {
    await TestHelpers.clearDatabase();
    user = await TestHelpers.createTestUser();
    authToken = TestHelpers.generateAuthToken(user);
  });

  describe('POST /api/mood', () => {
    test('should create mood entry', async () => {
      const moodData = {
        mood_type: 'happy',
        mood_intensity: 4,
        notes: 'Had a great day!'
      };

      const response = await request(app)
        .post('/api/mood')
        .set('Authorization', `Bearer ${authToken}`)
        .send(moodData)
        .expect(201);

      expect(response.body).toHaveProperty('mood_entry');
      expect(response.body).toHaveProperty('points_earned');
      expect(response.body.mood_entry.mood_type).toBe(moodData.mood_type);
    });

    test('should reject invalid mood type', async () => {
      const moodData = {
        mood_type: 'invalid_mood',
        mood_intensity: 4
      };

      const response = await request(app)
        .post('/api/mood')
        .set('Authorization', `Bearer ${authToken}`)
        .send(moodData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/mood', () => {
    test('should get mood history', async () => {
      await TestHelpers.createTestMoodEntry(user.id, { mood_type: 'happy' });
      await TestHelpers.createTestMoodEntry(user.id, { mood_type: 'calm' });

      const response = await request(app)
        .get('/api/mood')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('mood_history');
      expect(response.body.mood_history).toHaveLength(2);
    });
  });
});

// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  collectCoverageFrom: [
    'server.js',
    'middleware/**/*.js',
    'routes/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 10000
};

// package.json test scripts addition
/*
"scripts": {
  "test": "NODE_ENV=test jest",
  "test:watch": "NODE_ENV=test jest --watch",
  "test:coverage": "NODE_ENV=test jest --coverage",
  "test:ci": "NODE_ENV=test jest --ci --coverage --watchAll=false"
}
*/