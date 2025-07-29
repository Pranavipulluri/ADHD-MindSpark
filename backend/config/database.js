const { Pool } = require('pg');

// Database configuration based on environment
const config = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'mindspark_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  },
  
  test: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.TEST_DB_NAME || 'mindspark_test_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  
  production: {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }
};

const environment = process.env.NODE_ENV || 'development';
const currentConfig = config[environment];

// Create connection pool
const pool = new Pool(currentConfig);

// Handle connection errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Handle connection success
pool.on('connect', (client) => {
  console.log(`📊 Database connected: ${currentConfig.database || 'remote'}`);
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connection test successful');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
};

// Graceful shutdown
const closePool = async () => {
  try {
    await pool.end();
    console.log('📊 Database pool closed');
  } catch (error) {
    console.error('Error closing database pool:', error);
  }
};

// Helper function to execute queries with error handling
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Query executed:', { text, duration, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    console.error('Database query error:', {
      query: text,
      params,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Helper function to get a client from the pool
const getClient = async () => {
  try {
    const client = await pool.connect();
    
    // Add query method with logging
    const originalQuery = client.query;
    client.query = async function(text, params) {
      const start = Date.now();
      try {
        const result = await originalQuery.call(this, text, params);
        const duration = Date.now() - start;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Client query executed:', { text, duration, rows: result.rowCount });
        }
        
        return result;
      } catch (error) {
        console.error('Client query error:', {
          query: text,
          params,
          error: error.message
        });
        throw error;
      }
    };
    
    return client;
  } catch (error) {
    console.error('Error getting database client:', error);
    throw error;
  }
};

// Transaction helper
const transaction = async (callback) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Database health check
const healthCheck = async () => {
  try {
    const result = await query('SELECT 1 as health_check');
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connection: 'active',
      result: result.rows[0]
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      connection: 'failed',
      error: error.message
    };
  }
};

// Get database statistics
const getStats = async () => {
  try {
    const statsQuery = `
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_tuples
      FROM pg_stat_user_tables
      ORDER BY schemaname, tablename;
    `;
    
    const result = await query(statsQuery);
    return result.rows;
  } catch (error) {
    console.error('Error getting database stats:', error);
    return [];
  }
};

module.exports = {
  pool,
  query,
  getClient,
  transaction,
  testConnection,
  closePool,
  healthCheck,
  getStats,
  config: currentConfig
};