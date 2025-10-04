#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mindspark_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  bright: '\x1b[1m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`)
};

// Sample data
const sampleUsers = [
  {
    id: uuidv4(),
    username: 'alex_kid',
    email: 'alex@example.com',
    password: 'password123',
    date_of_birth: '2015-05-15',
    parent_email: 'parent.alex@example.com',
    points: 150,
    level: 2,
    streak_days: 5
  },
  {
    id: uuidv4(),
    username: 'emma_star',
    email: 'emma@example.com',
    password: 'password123',
    date_of_birth: '2014-08-22',
    parent_email: 'parent.emma@example.com',
    points: 85,
    level: 1,
    streak_days: 3
  },
  {
    id: uuidv4(),
    username: 'lucas_hero',
    email: 'lucas@example.com',
    password: 'password123',
    date_of_birth: '2016-02-10',
    parent_email: 'parent.lucas@example.com',
    points: 200,
    level: 3,
    streak_days: 7
  }
];

const sampleGames = [
  {
    id: uuidv4(),
    name: 'Memory Match',
    description: 'Match pairs of cards to improve memory and concentration',
    category: 'memory',
    difficulty_level: 1,
    points_per_completion: 10
  },
  {
    id: uuidv4(),
    name: 'Focus Flow',
    description: 'Follow moving objects to enhance visual attention',
    category: 'attention',
    difficulty_level: 2,
    points_per_completion: 15
  },
  {
    id: uuidv4(),
    name: 'Pattern Puzzle',
    description: 'Complete sequences to boost cognitive flexibility',
    category: 'cognitive',
    difficulty_level: 3,
    points_per_completion: 20
  },
  {
    id: uuidv4(),
    name: 'Quick Sort',
    description: 'Sort items by categories to improve processing speed',
    category: 'processing',
    difficulty_level: 1,
    points_per_completion: 12
  },
  {
    id: uuidv4(),
    name: 'Mind Maze',
    description: 'Navigate through mazes to enhance planning skills',
    category: 'planning',
    difficulty_level: 2,
    points_per_completion: 18
  }
];

const sampleTasks = [
  {
    id: uuidv4(),
    title: 'Morning Routine',
    description: 'Complete your morning checklist',
    category: 'daily',
    priority: 'high',
    points_reward: 25,
    estimated_duration: 30
  },
  {
    id: uuidv4(),
    title: 'Homework Time',
    description: 'Spend 45 minutes on homework',
    category: 'academic',
    priority: 'high',
    points_reward: 35,
    estimated_duration: 45
  },
  {
    id: uuidv4(),
    title: 'Clean Room',
    description: 'Organize and tidy up your bedroom',
    category: 'chores',
    priority: 'medium',
    points_reward: 20,
    estimated_duration: 20
  },
  {
    id: uuidv4(),
    title: 'Reading Time',
    description: 'Read for 20 minutes',
    category: 'academic',
    priority: 'medium',
    points_reward: 15,
    estimated_duration: 20
  },
  {
    id: uuidv4(),
    title: 'Exercise Break',
    description: 'Do 10 minutes of physical activity',
    category: 'health',
    priority: 'medium',
    points_reward: 15,
    estimated_duration: 10
  }
];

const specialists = [
  {
    id: uuidv4(),
    user_id: sampleUsers[0].id, // Link to first user as specialist
    first_name: 'Sarah',
    last_name: 'Johnson',
    title: 'Dr.',
    specialization: 'Child Psychologist',
    bio: 'Specialized in ADHD diagnosis and treatment for children and adolescents with over 10 years of experience.',
    hourly_rate: 120.00
  },
  {
    id: uuidv4(),
    user_id: sampleUsers[1].id, // Link to second user as specialist
    first_name: 'Michael',
    last_name: 'Chen',
    title: 'Dr.',
    specialization: 'Educational Therapist',
    bio: 'Expert in learning disabilities and educational interventions for ADHD students.',
    hourly_rate: 100.00
  }
];

// Clear existing data
async function clearData() {
  log.info('Clearing existing data...');
  
  const tables = [
    'appointments',
    'chat_messages',
    'chat_participants',
    'chat_rooms',
    'documents',
    'document_categories',
    'focus_sessions',
    'user_achievements',
    'progress_records',
    'game_scores',
    'mood_entries',
    'specialists',
    'tasks',
    'games',
    'profiles'
  ];
  
  try {
    await pool.query('BEGIN');
    
    for (const table of tables) {
      await pool.query(`DELETE FROM ${table}`);
      log.info(`Cleared ${table} table`);
    }
    
    await pool.query('COMMIT');
    log.success('Data cleared successfully');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

// Seed users
async function seedUsers() {
  log.info('Seeding users...');
  
  try {
    for (const user of sampleUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      await pool.query(`
        INSERT INTO profiles (id, username, email, password_hash, date_of_birth, parent_email, points, level, streak_days)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        user.id,
        user.username,
        user.email,
        hashedPassword,
        user.date_of_birth,
        user.parent_email,
        user.points,
        user.level,
        user.streak_days
      ]);
    }
    
    log.success(`Seeded ${sampleUsers.length} users`);
  } catch (error) {
    log.error('Failed to seed users:', error.message);
    throw error;
  }
}

// Seed games
async function seedGames() {
  log.info('Seeding games...');
  
  try {
    for (const game of sampleGames) {
      await pool.query(`
        INSERT INTO games (id, name, description, category, difficulty_level, points_per_completion)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        game.id,
        game.name,
        game.description,
        game.category,
        game.difficulty_level,
        game.points_per_completion
      ]);
    }
    
    log.success(`Seeded ${sampleGames.length} games`);
  } catch (error) {
    log.error('Failed to seed games:', error.message);
    throw error;
  }
}

// Seed tasks (assign to users directly)
async function seedTasks() {
  log.info('Seeding tasks...');
  
  try {
    let count = 0;
    
    for (const user of sampleUsers) {
      // Create 2-3 tasks for each user
      const numTasks = Math.floor(Math.random() * 2) + 2;
      
      for (let i = 0; i < numTasks; i++) {
        const task = sampleTasks[i % sampleTasks.length];
        const status = Math.random() > 0.5 ? 'must-do' : 'done';
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 7));
        
        await pool.query(`
          INSERT INTO tasks (id, user_id, title, description, priority, status, due_date, estimated_duration)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          uuidv4(),
          user.id,
          task.title,
          task.description,
          task.priority,
          status,
          dueDate,
          task.estimated_duration
        ]);
        
        count++;
      }
    }
    
    log.success(`Seeded ${count} tasks`);
  } catch (error) {
    log.error('Failed to seed tasks:', error.message);
    throw error;
  }
}

// Seed specialists
async function seedSpecialists() {
  log.info('Seeding specialists...');
  
  try {
    for (const specialist of specialists) {
      await pool.query(`
        INSERT INTO specialists (id, user_id, first_name, last_name, title, specialization, bio, hourly_rate)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        specialist.id,
        specialist.user_id,
        specialist.first_name,
        specialist.last_name,
        specialist.title,
        specialist.specialization,
        specialist.bio,
        specialist.hourly_rate
      ]);
    }
    
    log.success(`Seeded ${specialists.length} specialists`);
  } catch (error) {
    log.error('Failed to seed specialists:', error.message);
    throw error;
  }
}

// Seed document categories
async function seedDocumentCategories() {
  log.info('Seeding document categories...');
  
  const categories = [
    { id: uuidv4(), name: 'Reports', color: '#3b82f6' },
    { id: uuidv4(), name: 'Assignments', color: '#10b981' },
    { id: uuidv4(), name: 'Medical', color: '#f59e0b' },
    { id: uuidv4(), name: 'Other', color: '#6b7280' }
  ];
  
  try {
    for (const category of categories) {
      await pool.query(`
        INSERT INTO document_categories (id, name, color)
        VALUES ($1, $2, $3)
      `, [category.id, category.name, category.color]);
    }
    
    log.success(`Seeded ${categories.length} document categories`);
  } catch (error) {
    log.error('Failed to seed document categories:', error.message);
    throw error;
  }
}

// Seed mood entries
async function seedMoodEntries() {
  log.info('Seeding mood entries...');
  
  try {
    const moodTypes = ['happy', 'excited', 'calm', 'worried', 'angry'];
    let count = 0;
    
    for (const user of sampleUsers) {
      // Create 5-10 mood entries for each user over the past week
      const numEntries = Math.floor(Math.random() * 6) + 5;
      
      for (let i = 0; i < numEntries; i++) {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 7));
        
        const moodType = moodTypes[Math.floor(Math.random() * moodTypes.length)];
        const intensity = Math.floor(Math.random() * 5) + 1;
        
        await pool.query(`
          INSERT INTO mood_entries (id, user_id, mood_type, mood_intensity, created_at)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          uuidv4(),
          user.id,
          moodType,
          intensity,
          date
        ]);
        
        count++;
      }
    }
    
    log.success(`Seeded ${count} mood entries`);
  } catch (error) {
    log.error('Failed to seed mood entries:', error.message);
    throw error;
  }
}

// Seed game scores
async function seedGameScores() {
  log.info('Seeding game scores...');
  
  try {
    let count = 0;
    
    for (const user of sampleUsers) {
      // Create scores for 3-5 games for each user
      const numGames = Math.floor(Math.random() * 3) + 3;
      const shuffledGames = [...sampleGames].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < numGames; i++) {
        const game = shuffledGames[i];
        const score = Math.floor(Math.random() * 1000) + 100;
        const accuracy = Math.floor(Math.random() * 40) + 60; // 60-100%
        const level = Math.floor(Math.random() * 5) + 1;
        
        await pool.query(`
          INSERT INTO game_scores (id, user_id, game_id, score, accuracy_percentage, level_reached, points_earned, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - INTERVAL '${Math.floor(Math.random() * 168)} hours')
        `, [
          uuidv4(),
          user.id,
          game.id,
          score,
          accuracy,
          level,
          game.points_per_completion
        ]);
        
        count++;
      }
    }
    
    log.success(`Seeded ${count} game scores`);
  } catch (error) {
    log.error('Failed to seed game scores:', error.message);
    throw error;
  }
}

// Main seeding function
async function seedDatabase() {
  try {
    log.info('Starting database seeding...');
    
    await clearData();
    await seedUsers();
    await seedGames();
    await seedTasks();
    await seedSpecialists();
    await seedDocumentCategories();
    await seedMoodEntries();
    await seedGameScores();
    
    log.success('Database seeding completed successfully!');
    
  } catch (error) {
    log.error('Seeding failed:');
    console.error('Error details:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Handle unhandled errors
process.on('unhandledRejection', (error) => {
  log.error('Unhandled rejection:', error.message);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  seedDatabase().catch(error => {
    log.error('Seeding script failed:', error.message);
    process.exit(1);
  });
}

module.exports = { seedDatabase };
