// tests/helpers/globalTeardown.js
const { Pool } = require('pg');

module.exports = async () => {
  console.log('🧹 Cleaning up test environment...');
  
  try {
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: 'postgres', // Connect to default database
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    });

    const testDbName = process.env.TEST_DB_NAME || 'mindspark_test_db';
    
    // Terminate all connections to test database
    await pool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [testDbName]);

    // Optional: Drop test database (uncomment if you want to clean up completely)
    // await pool.query(`DROP DATABASE IF EXISTS ${testDbName}`);
    // console.log(`🗑️ Dropped test database: ${testDbName}`);

    await pool.end();
    console.log('✅ Test environment cleanup complete');
    
  } catch (error) {
    console.error('❌ Test environment cleanup failed:', error.message);
    // Don't throw error as this might prevent test results from being displayed
  }
};
