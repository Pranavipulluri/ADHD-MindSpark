const { Pool } = require('pg');
require('dotenv').config();

async function updateWorkshopsTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔗 Connecting to database...');
    
    console.log('📝 Updating workshops table...');
    
    // Add missing columns to workshops table
    await pool.query(`
      ALTER TABLE workshops 
      ADD COLUMN IF NOT EXISTS location VARCHAR(255),
      ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 30;
    `);
    
    // Modify scheduled_date to be TIMESTAMP instead of DATE
    await pool.query(`
      ALTER TABLE workshops 
      ALTER COLUMN scheduled_date TYPE TIMESTAMP USING scheduled_date::TIMESTAMP;
    `);
    
    console.log('✅ Workshops table updated!');
    
    console.log('📝 Creating workshop_participants table...');
    
    // Create workshop_participants table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workshop_participants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
        student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(workshop_id, student_id)
      );
    `);
    
    console.log('✅ Workshop participants table created!');
    
    console.log('📝 Creating indexes...');
    
    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_workshops_scheduled_date ON workshops(scheduled_date);
      CREATE INDEX IF NOT EXISTS idx_workshop_participants_workshop ON workshop_participants(workshop_id);
      CREATE INDEX IF NOT EXISTS idx_workshop_participants_student ON workshop_participants(student_id);
    `);
    
    console.log('✅ Indexes created!');
    
    // Verify tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('workshops', 'workshop_participants')
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

updateWorkshopsTable();
