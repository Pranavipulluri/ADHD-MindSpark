// tests/helpers/globalSetup.js
const { Pool } = require('pg');

module.exports = async () => {
  console.log('🔧 Setting up test environment...');
  
  // Create test database connection
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres', // Connect to default database first
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    // Create test database if it doesn't exist
    const testDbName = process.env.TEST_DB_NAME || 'mindspark_test_db';
    
    // Check if test database exists
    const dbExists = await pool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [testDbName]
    );

    if (dbExists.rows.length === 0) {
      console.log(`📊 Creating test database: ${testDbName}`);
      await pool.query(`CREATE DATABASE ${testDbName}`);
    } else {
      console.log(`📊 Test database already exists: ${testDbName}`);
    }

    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.DB_NAME = testDbName;
    
    console.log('✅ Test environment setup complete');
    
  } catch (error) {
    console.error('❌ Test environment setup failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
};
