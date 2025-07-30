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
    name: 'Dr. Sarah Johnson',
    specialization: 'Child Psychologist',
    email: 'sarah.johnson@clinic.com',
    phone: '+1-555-0101',
    bio: 'Specialized in ADHD diagnosis and treatment for children and adolescents with over 10 years of experience.',
    availability: JSON.stringify({
      monday: ['09:00', '10:00', '11:00', '14:00', '15:00'],
      tuesday: ['09:00', '10:00', '11:00', '14:00', '15:00'],
      wednesday: ['09:00', '10:00', '11:00'],
      thursday: ['09:00', '10:00', '11:00', '14:00', '15:00'],
      friday: ['09:00', '10:00', '11:00', '14:00']
    })
  },
  {
    id: uuidv4(),
    name: 'Dr. Michael Chen',
    specialization: 'Educational Therapist',
    email: 'michael.chen@therapy.com',
    phone: '+1-555-0102',
    bio: 'Expert in learning disabilities and educational interventions for ADHD students.',
    availability: JSON.stringify({
      monday: ['10:00', '11:00', '14:00', '15:00', '16:00'],
      tuesday: ['10:00', '11:00', '14:00', '15:00', '16:00'],
      wednesday: ['10:00', '11:00', '14:00', '15:00'],
      thursday: ['10:00', '11:00', '14:00', '15:00', '16:00'],
      friday: ['10:00', '11:00', '14:00', '15:00']
    })
  }
];

// Clear existing data
async function clearData() {
  log.info('Clearing existing data...');
  
  const tables = [
    'appointments',
    'chat_messages',
    'documents',
    'focus_sessions',
    'achievements',
    'game_scores',
    'user_tasks',
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

// Seed tasks
async function seedTasks() {
  log.info('Seeding tasks...');
  
  try {
    for (const task of sampleTasks) {
      await pool.query(`
        INSERT INTO tasks (id, title, description, category, priority, points_reward, estimated_duration)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        task.id,
        task.title,
        task.description,
        task.category,
        task.priority,
        task.points_reward,
        task.estimated_duration
      ]);
    }
    
    log.success(`Seeded ${sampleTasks.length} tasks`);
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
        INSERT INTO specialists (id, name, specialization, email, phone, bio, availability)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        specialist.id,
        specialist.name,
        specialist.specialization,
        specialist.email,
        specialist.phone,
        specialist.bio,
        specialist.availability
      ]);
    }
    
    log.success(`Seeded ${specialists.length} specialists`);
  } catch (error) {
    log.error('Failed to seed specialists:', error.message);
    throw error;
  }
}

// Seed user tasks (assign tasks to users)
async function seedUserTasks() {
  log.info('Seeding user tasks...');
  
  try {
    let count = 0;
    
    for (const user of sampleUsers) {
      // Assign 2-3 random tasks to each user
      const numTasks = Math.floor(Math.random() * 2) + 2;
      const shuffledTasks = [...sampleTasks].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < numTasks; i++) {
        const task = shuffledTasks[i];
        const status = Math.random() > 0.5 ? 'pending' : 'completed';
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 7));
        
        await pool.query(`
          INSERT INTO user_tasks (id, user_id, task_id, status, due_date, assigned_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
        `, [
          uuidv4(),
          user.id,
          task.id,
          status,
          dueDate
        ]);
        
        count++;
      }
    }
    
    log.success(`Seeded ${count} user tasks`);
  } catch (error) {
    log.error('Failed to seed user tasks:', error.message);
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
          INSERT INTO game_scores (id, user_id, game_id, score, accuracy_percentage, level_reached, points_earned, played_at)
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
    await seedUserTasks();
    await seedMoodEntries();
    await seedGameScores();
    
    log.success('Database seeding completed successfully!');
    
  } catch (error) {
    log.error('Seeding failed:', error.message);
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
