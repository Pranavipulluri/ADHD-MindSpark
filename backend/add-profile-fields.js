const { Pool } = require('pg');
require('dotenv').config();

async function addMentorProfileFields() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔗 Connecting to database...');
    
    console.log('📝 Adding mentor/NGO profile fields...');
    
    // Add fields for mentor profiles
    await pool.query(`
      ALTER TABLE profiles 
      ADD COLUMN IF NOT EXISTS certifications TEXT[],
      ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS organization_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS organization_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS website VARCHAR(255);
    `);
    
    console.log('✅ Profile fields added!');
    
    // Verify columns
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles'
      AND column_name IN ('certifications', 'experience_years', 'organization_name', 'organization_type', 'phone', 'website')
      ORDER BY column_name
    `);
    
    console.log('\n📊 Verified columns:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.column_name} (${row.data_type})`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addMentorProfileFields();
