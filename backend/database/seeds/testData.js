const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mindspark_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const createTestData = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🧪 Creating test data...');
    
    // Create test users
    const testUsers = [
      {
        email: 'alex@test.com',
        username: 'alex_student',
        password: 'password123',
        points: 150,
        level: 2
      },
      {
        email: 'sarah@test.com',
        username: 'sarah_learner',
        password: 'password123',
        points: 75,
        level: 1
      },
      {
        email: 'mike@test.com',
        username: 'mike_focus',
        password: 'password123',
        points: 300,
        level: 3
      }
    ];
    
    const userIds = [];
    
    for (const user of testUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const userId = uuidv4();
      
      await client.query(`
        INSERT INTO profiles (id, email, username, password_hash, points, level)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO NOTHING
      `, [userId, user.email, user.username, hashedPassword, user.points, user.level]);
      
      userIds.push(userId);
    }
    
    // Create test tasks
    const testTasks = [
      { title: 'Complete Math Homework', description: 'Chapter 5 exercises 1-10', priority: 'high', status: 'must-do' },
      { title: 'Read Science Chapter', description: 'Chapter about ecosystems', priority: 'medium', status: 'can-wait' },
      { title: 'Practice Piano', description: '30 minutes of practice', priority: 'low', status: 'done' },
      { title: 'Clean Room', description: 'Organize desk and put away clothes', priority: 'medium', status: 'must-do' },
      { title: 'Finish Art Project', description: 'Complete the drawing assignment', priority: 'high', status: 'can-wait' }
    ];
    
    for (const userId of userIds) {
      for (const task of testTasks) {
        await client.query(`
          INSERT INTO tasks (user_id, title, description, priority, status, completed_at)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          userId, 
          task.title, 
          task.description, 
          task.priority, 
          task.status,
          task.status === 'done' ? new Date() : null
        ]);
      }
    }
    
    // Create test mood entries
    const moodTypes = ['happy', 'excited', 'calm', 'worried', 'angry'];
    const moodNotes = [
      'Had a great day at school!',
      'Feeling excited about the weekend',
      'Nice relaxing evening',
      'Test tomorrow, feeling nervous',
      'Got frustrated with homework'
    ];
    
    for (const userId of userIds) {
      // Create mood entries for the past week
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const moodType = moodTypes[Math.floor(Math.random() * moodTypes.length)];
        const intensity = Math.floor(Math.random() * 5) + 1;
        const notes = moodNotes[Math.floor(Math.random() * moodNotes.length)];
        
        await client.query(`
          INSERT INTO mood_entries (user_id, mood_type, mood_intensity, notes, created_at)
          VALUES ($1, $2, $3, $4, $5)
        `, [userId, moodType, intensity, notes, date]);
      }
    }
    
    // Create test game scores
    const gameIds = await client.query('SELECT id FROM games');
    
    for (const userId of userIds) {
      for (const game of gameIds.rows) {
        // Create 3-5 scores per game per user
        const scoreCount = Math.floor(Math.random() * 3) + 3;
        
        for (let i = 0; i < scoreCount; i++) {
          const score = Math.floor(Math.random() * 1000) + 100;
          const accuracy = Math.floor(Math.random() * 30) + 70; // 70-100%
          const level = Math.floor(Math.random() * 5) + 1;
          
          await client.query(`
            INSERT INTO game_scores (user_id, game_id, score, accuracy_percentage, level_reached, points_earned)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [userId, game.id, score, accuracy, level, 10]);
        }
      }
    }
    
    // Create test documents
    const documentTitles = [
      'Science Notes - Chapter 3',
      'History Essay Draft',
      'Math Formula Sheet',
      'Reading List for Summer',
      'Art Project Ideas',
      'Spanish Vocabulary',
      'Geography Map Notes'
    ];
    
    const categories = await client.query('SELECT id FROM document_categories');
    
    for (const userId of userIds) {
      for (let i = 0; i < 5; i++) {
        const title = documentTitles[Math.floor(Math.random() * documentTitles.length)];
        const categoryId = categories.rows[Math.floor(Math.random() * categories.rows.length)].id;
        const content = `This is test content for ${title}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`;
        
        await client.query(`
          INSERT INTO documents (user_id, category_id, title, content, tags)
          VALUES ($1, $2, $3, $4, $5)
        `, [userId, categoryId, title, content, ['test', 'sample']]);
      }
    }
    
    // Create test focus sessions
    const sessionTypes = ['focus_timer', 'breathing', 'meditation'];
    
    for (const userId of userIds) {
      for (let i = 0; i < 10; i++) {
        const sessionType = sessionTypes[Math.floor(Math.random() * sessionTypes.length)];
        const duration = Math.floor(Math.random() * 30) + 10; // 10-40 minutes
        const completed = Math.random() > 0.2; // 80% completion rate
        const interruptions = completed ? Math.floor(Math.random() * 3) : Math.floor(Math.random() * 5) + 2;
        const points = completed ? 15 : 0;
        
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 14));
        
        await client.query(`
          INSERT INTO focus_sessions (user_id, session_type, duration_minutes, completed, interruptions, points_earned, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [userId, sessionType, duration, completed, interruptions, points, date]);
      }
    }
    
    // Create test chat messages
    const roomIds = await client.query('SELECT id FROM chat_rooms');
    const chatMessages = [
      'Hey everyone! How is everyone doing today?',
      'Just finished my homework, feeling great!',
      'Anyone want to study together?',
      'I love the new games in the app!',
      'My focus session went really well today',
      'Does anyone have tips for staying organized?',
      'Thanks for all the support, this community is amazing!',
      'Good luck on your test tomorrow!',
      'Who wants to challenge me to a game?',
      'Hope everyone has a wonderful day!'
    ];
    
    for (const room of roomIds.rows) {
      // Add all users to the room
      for (const userId of userIds) {
        await client.query(`
          INSERT INTO chat_participants (room_id, user_id)
          VALUES ($1, $2)
          ON CONFLICT (room_id, user_id) DO NOTHING
        `, [room.id, userId]);
      }
      
      // Create messages
      for (let i = 0; i < 15; i++) {
        const userId = userIds[Math.floor(Math.random() * userIds.length)];
        const content = chatMessages[Math.floor(Math.random() * chatMessages.length)];
        
        const date = new Date();
        date.setHours(date.getHours() - Math.floor(Math.random() * 24));
        
        await client.query(`
          INSERT INTO chat_messages (room_id, user_id, content, created_at)
          VALUES ($1, $2, $3, $4)
        `, [room.id, userId, content, date]);
      }
    }
    
    // Create progress records
    for (const userId of userIds) {
      const activities = ['task', 'game', 'mood', 'focus_session', 'document'];
      
      for (let i = 0; i < 20; i++) {
        const activityType = activities[Math.floor(Math.random() * activities.length)];
        const points = Math.floor(Math.random() * 20) + 5;
        const duration = activityType === 'focus_session' ? Math.floor(Math.random() * 30) + 10 : null;
        
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 7));
        
        await client.query(`
          INSERT INTO progress_records (user_id, activity_type, points_earned, duration_minutes, created_at)
          VALUES ($1, $2, $3, $4, $5)
        `, [userId, activityType, points, duration, date]);
      }
    }
    
    await client.query('COMMIT');
    console.log('✅ Test data created successfully!');
    
    // Display summary
    const summaryQueries = [
      'SELECT COUNT(*) as users FROM profiles WHERE email LIKE \'%@test.com\'',
      'SELECT COUNT(*) as tasks FROM tasks',
      'SELECT COUNT(*) as mood_entries FROM mood_entries',
      'SELECT COUNT(*) as game_scores FROM game_scores',
      'SELECT COUNT(*) as documents FROM documents',
      'SELECT COUNT(*) as focus_sessions FROM focus_sessions',
      'SELECT COUNT(*) as chat_messages FROM chat_messages',
      'SELECT COUNT(*) as progress_records FROM progress_records'
    ];
    
    console.log('\n📊 Test Data Summary:');
    for (const query of summaryQueries) {
      const result = await client.query(query);
      const table = query.split(' as ')[1].split(' ')[0];
      console.log(`• ${table}: ${result.rows[0].count}`);
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating test data:', error);
    throw error;
  } finally {
    client.release();
  }
};

const clearTestData = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🧹 Clearing test data...');
    
    // Delete test data (in reverse order of dependencies)
    await client.query('DELETE FROM progress_records WHERE user_id IN (SELECT id FROM profiles WHERE email LIKE \'%@test.com\')');
    await client.query('DELETE FROM chat_messages WHERE user_id IN (SELECT id FROM profiles WHERE email LIKE \'%@test.com\')');
    await client.query('DELETE FROM chat_participants WHERE user_id IN (SELECT id FROM profiles WHERE email LIKE \'%@test.com\')');
    await client.query('DELETE FROM focus_sessions WHERE user_id IN (SELECT id FROM profiles WHERE email LIKE \'%@test.com\')');
    await client.query('DELETE FROM documents WHERE user_id IN (SELECT id FROM profiles WHERE email LIKE \'%@test.com\')');
    await client.query('DELETE FROM game_scores WHERE user_id IN (SELECT id FROM profiles WHERE email LIKE \'%@test.com\')');
    await client.query('DELETE FROM mood_entries WHERE user_id IN (SELECT id FROM profiles WHERE email LIKE \'%@test.com\')');
    await client.query('DELETE FROM tasks WHERE user_id IN (SELECT id FROM profiles WHERE email LIKE \'%@test.com\')');
    await client.query('DELETE FROM profiles WHERE email LIKE \'%@test.com\'');
    
    await client.query('COMMIT');
    console.log('✅ Test data cleared successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error clearing test data:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run if called directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'clear') {
    clearTestData()
      .then(() => process.exit(0))
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
  } else {
    createTestData()
      .then(() => process.exit(0))
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
  }
}

module.exports = {
  createTestData,
  clearTestData
};