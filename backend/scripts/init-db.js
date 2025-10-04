const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL || 'sqlite:./database.sqlite';

async function initializeDatabase() {
  let db;
  let dbType;

  if (DATABASE_URL.startsWith('sqlite:')) {
    // SQLite setup
    const dbPath = DATABASE_URL.replace('sqlite:', '');
    dbType = 'sqlite';
    const sqliteDb = new sqlite3.Database(dbPath);
    
    db = {
      query: (sql, params = []) => {
        return new Promise((resolve, reject) => {
          if (sql.trim().toUpperCase().startsWith('SELECT')) {
            sqliteDb.all(sql, params, (err, rows) => {
              if (err) reject(err);
              else resolve({ rows });
            });
          } else {
            sqliteDb.run(sql, params, function(err) {
              if (err) reject(err);
              else resolve({ rows: [], rowCount: this.changes, insertId: this.lastID });
            });
          }
        });
      }
    };
    
    console.log('🗄️ Using SQLite database');
  } else {
    // PostgreSQL setup
    dbType = 'postgresql';
    db = new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    console.log('🗄️ Using PostgreSQL database');
  }

  try {
    // Create basic tables if they don't exist
    console.log('Creating basic tables...');

    // Profiles table
    if (dbType === 'sqlite') {
      await db.query(`
        CREATE TABLE IF NOT EXISTS profiles (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          date_of_birth TEXT,
          parent_email TEXT,
          avatar_url TEXT,
          points INTEGER DEFAULT 0,
          level INTEGER DEFAULT 1,
          streak_days INTEGER DEFAULT 0,
          preferences TEXT,
          last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      await db.query(`
        CREATE TABLE IF NOT EXISTS profiles (
          id UUID PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          username VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          date_of_birth DATE,
          parent_email VARCHAR(255),
          avatar_url TEXT,
          points INTEGER DEFAULT 0,
          level INTEGER DEFAULT 1,
          streak_days INTEGER DEFAULT 0,
          preferences JSONB,
          last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // Chat rooms table
    if (dbType === 'sqlite') {
      await db.query(`
        CREATE TABLE IF NOT EXISTS chat_rooms (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      await db.query(`
        CREATE TABLE IF NOT EXISTS chat_rooms (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // Insert default chat rooms
    const defaultRooms = [
      { id: 'general', name: '🌟 General Chat', description: 'Welcome to our community!' },
      { id: 'study', name: '📚 Study Group', description: 'Share study tips and help each other learn' },
      { id: 'games', name: '🎮 Game Zone', description: 'Discuss games and challenges' },
      { id: 'support', name: '💙 Support Circle', description: 'A safe space for support and encouragement' }
    ];

    for (const room of defaultRooms) {
      try {
        if (dbType === 'sqlite') {
          await db.query(
            'INSERT OR IGNORE INTO chat_rooms (id, name, description) VALUES (?, ?, ?)',
            [room.id, room.name, room.description]
          );
        } else {
          await db.query(
            'INSERT INTO chat_rooms (id, name, description) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
            [room.id, room.name, room.description]
          );
        }
      } catch (error) {
        // Ignore duplicate errors
      }
    }

    // Chat messages table
    if (dbType === 'sqlite') {
      await db.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          room_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      await db.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          room_id TEXT NOT NULL,
          user_id UUID NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // Tasks table
    if (dbType === 'sqlite') {
      await db.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          category TEXT DEFAULT 'daily',
          priority TEXT DEFAULT 'medium',
          status TEXT DEFAULT 'pending',
          due_date TEXT,
          estimated_duration INTEGER,
          points_reward INTEGER DEFAULT 10,
          assigned_at TEXT DEFAULT CURRENT_TIMESTAMP,
          completed_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES profiles(id)
        )
      `);
    } else {
      await db.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(20) DEFAULT 'daily',
          priority VARCHAR(20) DEFAULT 'medium',
          status VARCHAR(20) DEFAULT 'pending',
          due_date TIMESTAMP,
          estimated_duration INTEGER,
          points_reward INTEGER DEFAULT 10,
          assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES profiles(id)
        )
      `);
    }

    // Create demo user
    try {
      if (dbType === 'sqlite') {
        await db.query(
          'INSERT OR IGNORE INTO profiles (id, email, username, password_hash, points, level) VALUES (?, ?, ?, ?, ?, ?)',
          ['demo-user', 'demo@mindspark.com', 'Demo User', 'demo-hash', 100, 2]
        );
      } else {
        await db.query(
          'INSERT INTO profiles (id, email, username, password_hash, points, level) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
          ['demo-user', 'demo@mindspark.com', 'Demo User', 'demo-hash', 100, 2]
        );
      }
    } catch (error) {
      // Ignore if user already exists
    }

    console.log('✅ Database initialized successfully!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    if (dbType === 'sqlite') {
      // SQLite connection will be closed automatically
    } else {
      await db.end();
    }
  }
}

// Run initialization
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };