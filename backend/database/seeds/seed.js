const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mindspark_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const seedData = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🌱 Starting database seeding...');
    
    // 1. Seed document categories
    console.log('📁 Seeding document categories...');
    const categories = [
      { name: 'Homework', description: 'School assignments and homework', color: '#FF6B6B' },
      { name: 'Notes', description: 'Personal notes and study materials', color: '#4ECDC4' },
      { name: 'Reading', description: 'Reading materials and books', color: '#45B7D1' },
      { name: 'Resources', description: 'Educational resources and references', color: '#96CEB4' },
      { name: 'Projects', description: 'Long-term projects and assignments', color: '#FFA07A' },
      { name: 'Worksheets', description: 'Practice worksheets and exercises', color: '#98D8C8' }
    ];
    
    for (const category of categories) {
      await client.query(
        'INSERT INTO document_categories (name, description, color) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
        [category.name, category.description, category.color]
      );
    }
    
    // 2. Seed games
    console.log('🎮 Seeding games...');
    const games = [
      {
        name: 'Tic Tac Toe',
        description: 'Classic strategy game to improve planning and thinking ahead',
        category: 'strategy',
        difficulty_level: 1,
        points_per_completion: 10
      },
      {
        name: 'Memory Match',
        description: 'Test and improve your memory by matching pairs of cards',
        category: 'memory',
        difficulty_level: 2,
        points_per_completion: 15
      },
      {
        name: 'Focus Finder',
        description: 'Find hidden objects to improve attention and concentration',
        category: 'attention',
        difficulty_level: 3,
        points_per_completion: 20
      },
      {
        name: 'Pattern Recognition',
        description: 'Identify and complete patterns to enhance cognitive skills',
        category: 'cognitive',
        difficulty_level: 2,
        points_per_completion: 12
      },
      {
        name: 'Word Builder',
        description: 'Build words from letters to improve language skills',
        category: 'language',
        difficulty_level: 2,
        points_per_completion: 8
      },
      {
        name: 'Quick Math',
        description: 'Solve math problems quickly to boost arithmetic skills',
        category: 'math',
        difficulty_level: 3,
        points_per_completion: 18
      }
    ];
    
    for (const game of games) {
      await client.query(`
        INSERT INTO games (name, description, category, difficulty_level, points_per_completion)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (name) DO NOTHING
      `, [game.name, game.description, game.category, game.difficulty_level, game.points_per_completion]);
    }
    
    // 3. Seed chat rooms
    console.log('💬 Seeding chat rooms...');
    const chatRooms = [
      {
        name: 'General Chat',
        description: 'General discussion for everyone in the community',
        room_type: 'public'
      },
      {
        name: 'Study Group',
        description: 'Study together and share learning tips',
        room_type: 'public'
      },
      {
        name: 'Parents Corner',
        description: 'Support group for parents and guardians',
        room_type: 'public'
      },
      {
        name: 'Homework Help',
        description: 'Get help with homework and assignments',
        room_type: 'public'
      },
      {
        name: 'Focus & Mindfulness',
        description: 'Share mindfulness techniques and focus strategies',
        room_type: 'public'
      },
      {
        name: 'Gaming Zone',
        description: 'Discuss games and share high scores',
        room_type: 'public'
      }
    ];
    
    for (const room of chatRooms) {
      await client.query(`
        INSERT INTO chat_rooms (name, description, room_type, is_active, max_participants)
        VALUES ($1, $2, $3, true, 50)
        ON CONFLICT (name) DO NOTHING
      `, [room.name, room.description, room.room_type]);
    }
    
    // 4. Seed achievements
    console.log('🏆 Seeding achievements...');
    const achievements = [
      {
        name: 'First Steps',
        description: 'Complete your first task',
        icon: '🎯',
        badge_color: '#4CAF50',
        points_required: 10,
        criteria: { activity_type: 'task', count: 1 }
      },
      {
        name: 'Task Master',
        description: 'Complete 10 tasks',
        icon: '✅',
        badge_color: '#2196F3',
        points_required: 100,
        criteria: { activity_type: 'task', count: 10 }
      },
      {
        name: 'Game Enthusiast',
        description: 'Play 5 different games',
        icon: '🎮',
        badge_color: '#FF9800',
        points_required: 50,
        criteria: { activity_type: 'game', unique_games: 5 }
      },
      {
        name: 'Focus Champion',
        description: 'Complete 10 focus sessions',
        icon: '🧘',
        badge_color: '#9C27B0',
        points_required: 150,
        criteria: { activity_type: 'focus_session', count: 10 }
      },
      {
        name: 'Mood Tracker',
        description: 'Track your mood for 7 consecutive days',
        icon: '😊',
        badge_color: '#FFEB3B',
        points_required: 14,
        criteria: { activity_type: 'mood', consecutive_days: 7 }
      },
      {
        name: 'Social Butterfly',
        description: 'Send 50 chat messages',
        icon: '💬',
        badge_color: '#E91E63',
        points_required: 100,
        criteria: { activity_type: 'chat', count: 50 }
      },
      {
        name: 'Organizer',
        description: 'Upload 10 documents to your library',
        icon: '📚',
        badge_color: '#607D8B',
        points_required: 30,
        criteria: { activity_type: 'document', count: 10 }
      },
      {
        name: 'High Scorer',
        description: 'Achieve a score of 1000+ in any game',
        icon: '🌟',
        badge_color: '#FFC107',
        points_required: 0,
        criteria: { activity_type: 'game', min_score: 1000 }
      },
      {
        name: 'Streak Master',
        description: 'Maintain a 14-day activity streak',
        icon: '🔥',
        badge_color: '#FF5722',
        points_required: 0,
        criteria: { streak_days: 14 }
      },
      {
        name: 'Point Collector',
        description: 'Earn 500 total points',
        icon: '💎',
        badge_color: '#3F51B5',
        points_required: 500,
        criteria: { total_points: 500 }
      }
    ];
    
    for (const achievement of achievements) {
      await client.query(`
        INSERT INTO achievements (name, description, icon, badge_color, points_required, criteria)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (name) DO NOTHING
      `, [
        achievement.name,
        achievement.description, 
        achievement.icon,
        achievement.badge_color,
        achievement.points_required,
        JSON.stringify(achievement.criteria)
      ]);
    }
    
    // 5. Create demo users (optional - remove in production)
    if (process.env.NODE_ENV !== 'production') {
      console.log('👤 Creating demo users...');
      
      const demoUsers = [
        {
          email: 'demo@mindspark.com',
          username: 'demo_user',
          password: 'demo123',
          points: 150,
          level: 2
        },
        {
          email: 'parent@mindspark.com',
          username: 'demo_parent',
          password: 'parent123',
          points: 50,
          level: 1
        }
      ];
      
      for (const user of demoUsers) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        const userId = uuidv4();
        
        await client.query(`
          INSERT INTO profiles (id, email, username, password_hash, points, level)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (email) DO NOTHING
        `, [userId, user.email, user.username, hashedPassword, user.points, user.level]);
      }
    }
    
    // 6. Create demo specialists
    console.log('👨‍⚕️ Creating demo specialists...');
    const specialists = [
      {
        email: 'dr.johnson@mindspark.com',
        username: 'dr_emma_johnson',
        first_name: 'Emma',
        last_name: 'Johnson',
        title: 'Dr.',
        specialization: 'Child Psychology',
        bio: 'Dr. Johnson specializes in helping children with ADHD develop strategies for focus and self-regulation. She has 15 years of experience working with children of all ages.',
        credentials: ['PhD in Child Psychology', 'Licensed Clinical Psychologist', 'ADHD Specialist Certification'],
        experience_years: 15,
        hourly_rate: 120.00,
        contact_email: 'dr.johnson@mindspark.com'
      },
      {
        email: 'michael.chen@mindspark.com',
        username: 'michael_chen_therapist',
        first_name: 'Michael',
        last_name: 'Chen',
        title: 'Mr.',
        specialization: 'Educational Therapy',
        bio: 'Michael works with children to develop personalized learning strategies that accommodate their unique needs and strengths. He specializes in making learning fun and engaging.',
        credentials: ['Masters in Educational Therapy', 'Learning Disabilities Specialist', 'ADHD Coach Certification'],
        experience_years: 8,
        hourly_rate: 85.00,
        contact_email: 'michael.chen@mindspark.com'
      },
      {
        email: 'sarah.rodriguez@mindspark.com',
        username: 'sarah_rodriguez_coach',
        first_name: 'Sarah',
        last_name: 'Rodriguez',
        title: 'Ms.',
        specialization: 'Behavioral Coaching',
        bio: 'Sarah helps children develop positive behaviors and coping mechanisms for challenging situations. She creates personalized strategies that build on each child\'s strengths.',
        credentials: ['Masters in Applied Behavior Analysis', 'Board Certified Behavior Analyst', 'ADHD Life Coach'],
        experience_years: 10,
        hourly_rate: 95.00,
        contact_email: 'sarah.rodriguez@mindspark.com'
      }
    ];
    
    for (const specialist of specialists) {
      const hashedPassword = await bcrypt.hash('specialist123', 10);
      const userId = uuidv4();
      const specialistId = uuidv4();
      
      // Create user profile
      await client.query(`
        INSERT INTO profiles (id, email, username, password_hash, points, level)
        VALUES ($1, $2, $3, $4, 0, 1)
        ON CONFLICT (email) DO NOTHING
      `, [userId, specialist.email, specialist.username, hashedPassword]);
      
      // Create specialist profile
      await client.query(`
        INSERT INTO specialists (
          id, user_id, first_name, last_name, title, specialization, bio, 
          credentials, experience_years, hourly_rate, contact_email, is_available
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
        ON CONFLICT (user_id) DO NOTHING
      `, [
        specialistId, userId, specialist.first_name, specialist.last_name,
        specialist.title, specialist.specialization, specialist.bio,
        specialist.credentials, specialist.experience_years, specialist.hourly_rate,
        specialist.contact_email
      ]);
    }
    
    await client.query('COMMIT');
    console.log('✅ Database seeding completed successfully!');
    
    // Display summary
    const counts = await Promise.all([
      client.query('SELECT COUNT(*) FROM document_categories'),
      client.query('SELECT COUNT(*) FROM games'),
      client.query('SELECT COUNT(*) FROM chat_rooms'),
      client.query('SELECT COUNT(*) FROM achievements'),
      client.query('SELECT COUNT(*) FROM profiles'),
      client.query('SELECT COUNT(*) FROM specialists')
    ]);
    
    console.log('\n📊 Seeding Summary:');
    console.log(`• Document Categories: ${counts[0].rows[0].count}`);
    console.log(`• Games: ${counts[1].rows[0].count}`);
    console.log(`• Chat Rooms: ${counts[2].rows[0].count}`);
    console.log(`• Achievements: ${counts[3].rows[0].count}`);
    console.log(`• User Profiles: ${counts[4].rows[0].count}`);
    console.log(`• Specialists: ${counts[5].rows[0].count}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Function to clear all data (use with caution!)
const clearData = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🧹 Clearing database data...');
    
    // Order matters due to foreign key constraints
    const tables = [
      'user_achievements',
      'progress_records',
      'focus_sessions',
      'appointments',
      'chat_participants',
      'chat_messages',
      'game_scores',
      'documents',
      'tasks',
      'mood_entries',
      'specialists',
      'profiles',
      'achievements',
      'chat_rooms',
      'games',
      'document_categories'
    ];
    
    for (const table of tables) {
      await client.query(`DELETE FROM ${table}`);
      console.log(`• Cleared ${table}`);
    }
    
    await client.query('COMMIT');
    console.log('✅ Database cleared successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error clearing database:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run seeding if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--clear')) {
    clearData()
      .then(() => {
        if (args.includes('--seed')) {
          return seedData();
        }
      })
      .then(() => process.exit(0))
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
  } else {
    seedData()
      .then(() => process.exit(0))
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
  }
}

module.exports = {
  seedData,
  clearData
};