const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Pranavi%23250406@localhost:5432/mindspark_db',
  ssl: false
});

async function createDemoUser() {
  try {
    // Check if demo user exists
    const existingUser = await pool.query(
      'SELECT id FROM profiles WHERE id = $1',
      ['550e8400-e29b-41d4-a716-446655440000']
    );

    if (existingUser.rows.length === 0) {
      // Create demo user
      await pool.query(`
        INSERT INTO profiles (id, username, email, password_hash, points, level, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `, [
        '550e8400-e29b-41d4-a716-446655440000',
        'Demo User',
        'demo@mindspark.com',
        '$2a$10$demo.hash.for.testing.purposes.only', // Demo password hash
        100,
        1
      ]);
      console.log('✅ Demo user created successfully');
    } else {
      console.log('✅ Demo user already exists');
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error creating demo user:', error.message);
    process.exit(1);
  }
}

createDemoUser();