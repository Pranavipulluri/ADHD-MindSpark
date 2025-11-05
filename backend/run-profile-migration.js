const { Pool } = require('pg');
require('dotenv').config();

async function runProfileMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔗 Connecting to database...');
    
    // Add profile fields
    console.log('📝 Adding profile fields...');
    await pool.query(`
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialization VARCHAR(255);
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS certifications TEXT[];
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience_years INTEGER;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_name VARCHAR(255);
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_type VARCHAR(100);
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
    `);
    
    console.log('📝 Creating indexes...');
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);`);
    
    console.log('✅ Profile migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runProfileMigration();
