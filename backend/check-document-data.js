const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Pranavi%23250406@localhost:5432/mindspark_db',
  ssl: false
});

async function checkDocumentData() {
  try {
    console.log('🔍 Checking current document data in database...\n');
    
    const documents = await pool.query(`
      SELECT id, title, file_url, 
             CASE 
               WHEN ai_summary IS NOT NULL THEN jsonb_pretty(ai_summary)
               ELSE 'NULL'
             END as ai_summary_formatted,
             ai_processed_at,
             length(content) as content_length,
             substring(content from 1 for 200) as content_preview
      FROM documents 
      ORDER BY created_at DESC
      LIMIT 3
    `);
    
    for (const doc of documents.rows) {
      console.log('📄 Document:', doc.title);
      console.log('📁 File:', doc.file_url || 'No file');
      console.log('📝 Content length:', doc.content_length || 0, 'characters');
      if (doc.content_preview) {
        console.log('📖 Content preview:', doc.content_preview.replace(/\s+/g, ' ').substring(0, 150) + '...');
      }
      console.log('🧠 AI Processed:', doc.ai_processed_at ? new Date(doc.ai_processed_at).toLocaleString() : 'Not processed');
      console.log('📊 AI Summary:');
      if (doc.ai_summary_formatted && doc.ai_summary_formatted !== 'NULL') {
        console.log(doc.ai_summary_formatted);
      } else {
        console.log('   No AI summary available');
      }
      console.log('─'.repeat(80));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkDocumentData();