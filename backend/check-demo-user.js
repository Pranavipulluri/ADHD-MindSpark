const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Pranavi%23250406@localhost:5432/mindspark_db',
  ssl: false
});

async function checkDemoUser() {
  try {
    // Check if demo user exists
    const userCheck = await pool.query(
      'SELECT id, email, username FROM profiles WHERE id = $1', 
      ['550e8400-e29b-41d4-a716-446655440000']
    );
    
    console.log('Demo user exists:', userCheck.rows.length > 0 ? 'YES' : 'NO');
    
    if (userCheck.rows.length === 0) {
      console.log('Creating demo user...');
      
      // Create demo user
      await pool.query(`
        INSERT INTO profiles (id, email, username, password_hash, points, level)
        VALUES ($1, $2, $3, $4, 0, 1)
        ON CONFLICT (id) DO NOTHING
      `, ['550e8400-e29b-41d4-a716-446655440000', 'demo@mindspark.com', 'Demo User', 'demo-password-hash']);
      
      console.log('Demo user created!');
    } else {
      console.log('Demo user details:', userCheck.rows[0]);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    pool.end();
  }
}

checkDemoUser();