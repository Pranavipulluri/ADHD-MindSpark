const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔗 Connecting to database...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', '006_specialist_marketplace.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Running specialist marketplace migration...');
    
    // Execute migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('\nCreated tables:');
    console.log('  - specialist_appointments');
    console.log('  - specialist_assignments');
    console.log('  - specialist_ratings');
    console.log('  - workshops');
    
    // Verify tables exist
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('specialist_appointments', 'specialist_assignments', 'specialist_ratings', 'workshops')
      ORDER BY table_name
    `);
    
    console.log('\n📊 Verified tables:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
