#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Database configuration - support both PostgreSQL and SQLite
let db;
let dbType;

async function initializeDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl && databaseUrl.startsWith('sqlite:')) {
    // SQLite configuration
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = databaseUrl.replace('sqlite:', '');
    
    dbType = 'sqlite';
    const sqliteDb = new sqlite3.Database(dbPath);
    
    // Create wrapper object with promisified methods
    db = {
      run: (sql, params = []) => {
        return new Promise((resolve, reject) => {
          sqliteDb.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
          });
        });
      },
      
      all: (sql, params = []) => {
        return new Promise((resolve, reject) => {
          sqliteDb.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });
      },
      
      close: () => {
        sqliteDb.close();
      }
    };
    
    log.info('Using SQLite database');
  } else {
    // PostgreSQL configuration
    const { Pool } = require('pg');
    dbType = 'postgresql';
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'mindspark_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    });
    
    // Create wrapper object
    db = {
      run: (sql, params = []) => pool.query(sql, params),
      all: (sql, params = []) => pool.query(sql, params).then(result => result.rows),
      end: () => pool.end()
    };
    
    log.info('Using PostgreSQL database');
  }
}

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

// Create migrations table if it doesn't exist
async function createMigrationsTable() {
  let query;
  
  if (dbType === 'sqlite') {
    query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;
  } else {
    query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
  }
  
  try {
    await db.run(query);
    log.info('Migrations table ready');
  } catch (error) {
    log.error('Failed to create migrations table:', error.message);
    throw error;
  }
}

// Get executed migrations
async function getExecutedMigrations() {
  try {
    const result = await db.all('SELECT filename FROM migrations ORDER BY id');
    return result.map(row => row.filename);
  } catch (error) {
    log.error('Failed to get executed migrations:', error.message);
    return [];
  }
}

// Get migration files
async function getMigrationFiles() {
  const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
  
  try {
    const files = await fs.readdir(migrationsDir);
    return files
      .filter(file => file.endsWith('.sql'))
      .sort();
  } catch (error) {
    log.error('Failed to read migrations directory:', error.message);
    return [];
  }
}

// Execute a migration file
async function executeMigration(filename) {
  const filePath = path.join(__dirname, '..', 'database', 'migrations', filename);
  
  try {
    const sql = await fs.readFile(filePath, 'utf8');
    
    if (dbType === 'sqlite') {
      // SQLite doesn't support transactions with DDL in the same way
      // Execute migration
      await db.run(sql);
      
      // Record migration
      await db.run(
        'INSERT INTO migrations (filename) VALUES (?)',
        [filename]
      );
    } else {
      // PostgreSQL with transaction
      await db.run('BEGIN');
      
      // Execute migration
      await db.run(sql);
      
      // Record migration
      await db.run(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [filename]
      );
      
      // Commit transaction
      await db.run('COMMIT');
    }
    
    log.success(`Executed migration: ${filename}`);
  } catch (error) {
    if (dbType === 'postgresql') {
      // Rollback transaction for PostgreSQL
      await db.run('ROLLBACK').catch(() => {});
    }
    log.error(`Failed to execute migration ${filename}:`, error.message);
    throw error;
  }
}

// Run pending migrations
async function runMigrations() {
  try {
    log.info('Starting database migrations...');
    
    // Create migrations table
    await createMigrationsTable();
    
    // Get executed and available migrations
    const executedMigrations = await getExecutedMigrations();
    const migrationFiles = await getMigrationFiles();
    
    // Find pending migrations
    const pendingMigrations = migrationFiles.filter(
      file => !executedMigrations.includes(file)
    );
    
    if (pendingMigrations.length === 0) {
      log.info('No pending migrations found');
      return;
    }
    
    log.info(`Found ${pendingMigrations.length} pending migration(s)`);
    
    // Execute pending migrations
    for (const migration of pendingMigrations) {
      await executeMigration(migration);
    }
    
    log.success(`Successfully executed ${pendingMigrations.length} migration(s)`);
    
  } catch (error) {
    log.error('Migration failed:', error.message);
    process.exit(1);
  }
}

// Reset migrations (for development only)
async function resetMigrations() {
  try {
    log.warning('Resetting database...');
    
    if (dbType === 'sqlite') {
      // For SQLite, just delete the database file and recreate
      const dbPath = process.env.DATABASE_URL.replace('sqlite:', '');
      try {
        await fs.unlink(dbPath);
      } catch (error) {
        // File might not exist, that's okay
      }
      
      // Reinitialize database
      await initializeDatabase();
      
      // Execute schema
      const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
      const schema = await fs.readFile(schemaPath, 'utf8');
      await db.run(schema);
      
      // Create migrations table and mark all as executed
      await createMigrationsTable();
      const migrationFiles = await getMigrationFiles();
      for (const file of migrationFiles) {
        await db.run('INSERT INTO migrations (filename) VALUES (?)', [file]);
      }
    } else {
      // PostgreSQL reset
      const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
      const schema = await fs.readFile(schemaPath, 'utf8');
      
      await db.run('BEGIN');
      
      // Drop all tables
      await db.run(`
        DROP SCHEMA public CASCADE;
        CREATE SCHEMA public;
        GRANT ALL ON SCHEMA public TO postgres;
        GRANT ALL ON SCHEMA public TO public;
      `);
      
      // Execute schema
      await db.run(schema);
      
      // Clear migrations table
      await createMigrationsTable();
      
      // Mark all migrations as executed
      const migrationFiles = await getMigrationFiles();
      for (const file of migrationFiles) {
        await db.run('INSERT INTO migrations (filename) VALUES ($1)', [file]);
      }
      
      await db.run('COMMIT');
    }
    
    log.success('Database reset complete');
    
  } catch (error) {
    if (dbType === 'postgresql') {
      await db.run('ROLLBACK').catch(() => {});
    }
    log.error('Reset failed:', error.message);
    throw error;
  }
}

// Check migration status
async function checkStatus() {
  try {
    await createMigrationsTable();
    
    const executedMigrations = await getExecutedMigrations();
    const migrationFiles = await getMigrationFiles();
    
    console.log(`\n${colors.bright}Migration Status:${colors.reset}`);
    console.log(`Total migrations: ${migrationFiles.length}`);
    console.log(`Executed: ${executedMigrations.length}`);
    console.log(`Pending: ${migrationFiles.length - executedMigrations.length}\n`);
    
    if (migrationFiles.length > 0) {
      console.log(`${colors.bright}Migrations:${colors.reset}`);
      migrationFiles.forEach(file => {
        const status = executedMigrations.includes(file) ? 
          `${colors.green}✓ executed${colors.reset}` : 
          `${colors.yellow}⚠ pending${colors.reset}`;
        console.log(`  ${file} - ${status}`);
      });
    }
    
  } catch (error) {
    log.error('Failed to check status:', error.message);
  }
}

// Main function
async function main() {
  const command = process.argv[2];
  
  try {
    // Initialize database connection
    await initializeDatabase();
    
    switch (command) {
      case 'reset':
        await resetMigrations();
        break;
      case 'status':
        await checkStatus();
        break;
      case 'up':
      default:
        await runMigrations();
        break;
    }
  } finally {
    // Close database connection
    if (dbType === 'sqlite' && db) {
      db.close();
    } else if (dbType === 'postgresql' && db) {
      await db.end();
    }
  }
}

// Handle unhandled errors
process.on('unhandledRejection', (error) => {
  log.error('Unhandled rejection:', error.message);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    log.error('Migration script failed:', error.message);
    process.exit(1);
  });
}

module.exports = { 
  runMigrations, 
  resetMigrations, 
  checkStatus 
};
