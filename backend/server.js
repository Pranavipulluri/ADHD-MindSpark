const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
const http = require('http');

// Load environment variables
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Environment variables
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const DATABASE_URL = process.env.DATABASE_URL || 'sqlite:./database.sqlite';

// Database setup - support both PostgreSQL and SQLite
let db;
let dbType;

// Helper function to convert PostgreSQL-style queries to SQLite
const convertQuery = (sql, params = []) => {
  if (dbType === 'sqlite') {
    // Convert $1, $2, ... to ? placeholders
    let convertedSql = sql;
    let paramIndex = 1;
    while (convertedSql.includes(`$${paramIndex}`)) {
      convertedSql = convertedSql.replace(`$${paramIndex}`, '?');
      paramIndex++;
    }
    
    // Convert table names from profiles to users for SQLite
    convertedSql = convertedSql.replace(/\bprofiles\b/g, 'users');
    
    // Handle PostgreSQL-specific functions
    convertedSql = convertedSql.replace(/NOW\(\)/g, "datetime('now')");
    convertedSql = convertedSql.replace(/CURRENT_TIMESTAMP/g, "datetime('now')");
    
    return { sql: convertedSql, params };
  }
  return { sql, params };
};

if (DATABASE_URL.startsWith('sqlite:')) {
  // SQLite setup
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = DATABASE_URL.replace('sqlite:', '');
  
  dbType = 'sqlite';
  const sqliteDb = new sqlite3.Database(dbPath);
  
  // Create wrapper for consistent API
  db = {
    query: (sql, params = []) => {
      return new Promise((resolve, reject) => {
        const { sql: convertedSql, params: convertedParams } = convertQuery(sql, params);
        
        if (convertedSql.trim().toUpperCase().startsWith('SELECT')) {
          sqliteDb.all(convertedSql, convertedParams, (err, rows) => {
            if (err) reject(err);
            else resolve({ rows });
          });
        } else {
          sqliteDb.run(convertedSql, convertedParams, function(err) {
            if (err) reject(err);
            else resolve({ rows: [], rowCount: this.changes, insertId: this.lastID });
          });
        }
      });
    }
  };
  
  console.log('🗄️ Using SQLite database');
} else {
  // PostgreSQL setup
  const { Pool } = require('pg');
  dbType = 'postgresql';
  
  db = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  console.log('🗄️ Using PostgreSQL database');
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:5175',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Helper function to generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Helper function to calculate points for activities
const calculatePoints = (activityType, data = {}) => {
  const pointsMap = {
    task_completed: 10,
    game_played: 5,
    mood_tracked: 2,
    focus_session: 15,
    breathing_session: 8,
    document_uploaded: 3
  };
  
  let basePoints = pointsMap[activityType] || 0;
  
  // Bonus points for streaks, difficulty, etc.
  if (data.streak_bonus) basePoints *= 1.5;
  if (data.difficulty === 'hard') basePoints *= 1.3;
  
  return Math.round(basePoints);
};

// WebSocket connections for real-time chat
const clients = new Map();

wss.on('connection', (ws, req) => {
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'auth') {
        // Authenticate WebSocket connection
        const token = data.token;
        const decoded = jwt.verify(token, JWT_SECRET);
        ws.userId = decoded.id;
        clients.set(decoded.id, ws);
      } else if (data.type === 'chat_message') {
        // Broadcast chat message to room participants
        const { room_id, content } = data;
        
        // Save message to database
        const result = await db.query(
          'INSERT INTO chat_messages (room_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
          [room_id, ws.userId, content]
        );
        
        // Get message with user info
        const messageWithUser = await db.query(`
          SELECT cm.*, p.username, p.avatar_url 
          FROM chat_messages cm
          JOIN profiles p ON cm.user_id = p.id
          WHERE cm.id = $1
        `, [result.rows[0].id]);
        
        // Broadcast to all connected clients in the room
        const broadcastData = {
          type: 'new_message',
          message: messageWithUser.rows[0]
        };
        
        clients.forEach((client, userId) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(broadcastData));
          }
        });
      }
    } catch (error) {
      console.error('WebSocket error:', error);
    }
  });

  ws.on('close', () => {
    if (ws.userId) {
      clients.delete(ws.userId);
    }
  });
});

// AUTHENTICATION ROUTES

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, username, dateOfBirth, parentEmail } = req.body;
    
    // Validate required fields
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username are required' });
    }
    
    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM profiles WHERE email = $1 OR username = $2',
      [email, username]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Create user profile
    const userId = uuidv4();
    const newUser = await db.query(
      `INSERT INTO profiles (id, email, username, password_hash, date_of_birth, parent_email, points, level)
       VALUES ($1, $2, $3, $4, $5, $6, 0, 1)
       RETURNING id, email, username, points, level, created_at`,
      [userId, email, username, hashedPassword, dateOfBirth, parentEmail]
    );
    
    const user = newUser.rows[0];
    const token = generateToken(user);
    
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        points: user.points,
        level: user.level
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user
    const userResult = await db.query(
      'SELECT * FROM profiles WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = userResult.rows[0];
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last activity
    await db.query(
      'UPDATE profiles SET last_activity = NOW() WHERE id = $1',
      [user.id]
    );
    
    const token = generateToken(user);
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        points: user.points,
        level: user.level,
        avatar_url: user.avatar_url
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user profile
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const userResult = await db.query(
      'SELECT id, email, username, avatar_url, points, level, streak_days, preferences FROM profiles WHERE id = $1',
      [req.user.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: userResult.rows[0] });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// MOOD TRACKING ROUTES

// Add mood entry
app.post('/api/mood', authenticateToken, async (req, res) => {
  try {
    const { mood_type, mood_intensity, notes } = req.body;
    
    if (!mood_type) {
      return res.status(400).json({ error: 'Mood type is required' });
    }
    
    const moodEntry = await db.query(`
      INSERT INTO mood_entries (user_id, mood_type, mood_intensity, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [req.user.id, mood_type, mood_intensity, notes]);
    
    // Award points for mood tracking
    const points = calculatePoints('mood_tracked');
    await db.query(
      'UPDATE profiles SET points = points + $1 WHERE id = $2',
      [points, req.user.id]
    );
    
    // Record progress
    await db.query(`
      INSERT INTO progress_records (user_id, activity_type, activity_id, points_earned, progress_data)
      VALUES ($1, 'mood', $2, $3, $4)
    `, [req.user.id, moodEntry.rows[0].id, points, JSON.stringify({ mood_type, mood_intensity })]);
    
    res.status(201).json({
      message: 'Mood entry created',
      mood_entry: moodEntry.rows[0],
      points_earned: points
    });
  } catch (error) {
    console.error('Mood entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get mood history
app.get('/api/mood', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const moodHistory = await db.query(`
      SELECT * FROM mood_entries
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
      ORDER BY created_at DESC
    `, [req.user.id]);
    
    res.json({ mood_history: moodHistory.rows });
  } catch (error) {
    console.error('Mood history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// TASK MANAGEMENT ROUTES

// Create task
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, description, priority, due_date } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Task title is required' });
    }
    
    const task = await db.query(`
      INSERT INTO tasks (user_id, title, description, priority, due_date, status)
      VALUES ($1, $2, $3, $4, $5, 'must-do')
      RETURNING *
    `, [req.user.id, title, description, priority || 'medium', due_date]);
    
    res.status(201).json({ task: task.rows[0] });
  } catch (error) {
    console.error('Task creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user tasks
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = 'SELECT * FROM tasks WHERE user_id = $1';
    let params = [req.user.id];
    
    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const tasks = await db.query(query, params);
    res.json({ tasks: tasks.rows });
  } catch (error) {
    console.error('Tasks fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update task
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, status, due_date } = req.body;
    
    const task = await db.query(`
      UPDATE tasks 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          priority = COALESCE($3, priority),
          status = COALESCE($4, status),
          due_date = COALESCE($5, due_date),
          completed_at = CASE WHEN $4 = 'done' THEN NOW() ELSE completed_at END,
          updated_at = NOW()
      WHERE id = $6 AND user_id = $7
      RETURNING *
    `, [title, description, priority, status, due_date, id, req.user.id]);
    
    if (task.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Award points if task completed
    if (status === 'done' && task.rows[0].status !== 'done') {
      const points = calculatePoints('task_completed');
      await db.query(
        'UPDATE profiles SET points = points + $1 WHERE id = $2',
        [points, req.user.id]
      );
      
      // Record progress
      await db.query(`
        INSERT INTO progress_records (user_id, activity_type, activity_id, points_earned)
        VALUES ($1, 'task', $2, $3)
      `, [req.user.id, id, points]);
    }
    
    res.json({ task: task.rows[0] });
  } catch (error) {
    console.error('Task update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GAME ROUTES

// Get available games
app.get('/api/games', async (req, res) => {
  try {
    const games = await db.query('SELECT * FROM games ORDER BY name');
    res.json({ games: games.rows });
  } catch (error) {
    console.error('Games fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit game score
app.post('/api/games/:gameId/scores', authenticateToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { score, completion_time, accuracy_percentage, level_reached } = req.body;
    
    if (score === undefined) {
      return res.status(400).json({ error: 'Score is required' });
    }
    
    // Get game info for points calculation
    const game = await db.query('SELECT * FROM games WHERE id = $1', [gameId]);
    if (game.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const gameScore = await db.query(`
      INSERT INTO game_scores (user_id, game_id, score, completion_time, accuracy_percentage, level_reached, points_earned)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [req.user.id, gameId, score, completion_time, accuracy_percentage, level_reached, game.rows[0].points_per_completion]);
    
    // Update user points
    await db.query(
      'UPDATE profiles SET points = points + $1 WHERE id = $2',
      [game.rows[0].points_per_completion, req.user.id]
    );
    
    // Record progress
    await db.query(`
      INSERT INTO progress_records (user_id, activity_type, activity_id, points_earned, progress_data)
      VALUES ($1, 'game', $2, $3, $4)
    `, [req.user.id, gameScore.rows[0].id, game.rows[0].points_per_completion, 
        JSON.stringify({ score, level_reached, accuracy_percentage })]);
    
    res.status(201).json({
      game_score: gameScore.rows[0],
      points_earned: game.rows[0].points_per_completion
    });
  } catch (error) {
    console.error('Game score error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's game scores
app.get('/api/games/scores', authenticateToken, async (req, res) => {
  try {
    const scores = await db.query(`
      SELECT gs.*, g.name as game_name, g.category
      FROM game_scores gs
      JOIN games g ON gs.game_id = g.id
      WHERE gs.user_id = $1
      ORDER BY gs.created_at DESC
      LIMIT 50
    `, [req.user.id]);
    
    res.json({ scores: scores.rows });
  } catch (error) {
    console.error('Game scores fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DOCUMENT/LIBRARY ROUTES

// Get document categories
app.get('/api/documents/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await db.query('SELECT * FROM document_categories ORDER BY name');
    res.json({ categories: categories.rows });
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload document
app.post('/api/documents', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { title, category_id, content, tags } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Document title is required' });
    }
    
    let file_url = null;
    let file_type = null;
    let file_size = null;
    
    if (req.file) {
      file_url = `/uploads/${req.file.filename}`;
      file_type = req.file.mimetype;
      file_size = req.file.size;
    }
    
    const document = await db.query(`
      INSERT INTO documents (user_id, category_id, title, content, file_url, file_type, file_size, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [req.user.id, category_id, title, content, file_url, file_type, file_size, 
        tags ? tags.split(',') : null]);
    
    // Award points
    const points = calculatePoints('document_uploaded');
    await db.query(
      'UPDATE profiles SET points = points + $1 WHERE id = $2',
      [points, req.user.id]
    );
    
    res.status(201).json({
      document: document.rows[0],
      points_earned: points
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user documents
app.get('/api/documents', authenticateToken, async (req, res) => {
  try {
    const { category_id } = req.query;
    
    let query = `
      SELECT d.*, dc.name as category_name, dc.color as category_color
      FROM documents d
      LEFT JOIN document_categories dc ON d.category_id = dc.id
      WHERE d.user_id = $1
    `;
    let params = [req.user.id];
    
    if (category_id) {
      query += ' AND d.category_id = $2';
      params.push(category_id);
    }
    
    query += ' ORDER BY d.created_at DESC';
    
    const documents = await db.query(query, params);
    res.json({ documents: documents.rows });
  } catch (error) {
    console.error('Documents fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CHAT ROUTES

// Get chat rooms
app.get('/api/chat/rooms', authenticateToken, async (req, res) => {
  try {
    const rooms = await db.query(`
      SELECT cr.*, 
             COUNT(cp.user_id) as participant_count,
             CASE WHEN cp.user_id IS NOT NULL THEN true ELSE false END as is_member
      FROM chat_rooms cr
      LEFT JOIN chat_participants cp ON cr.id = cp.room_id
      LEFT JOIN chat_participants user_cp ON cr.id = user_cp.room_id AND user_cp.user_id = $1
      WHERE cr.is_active = true
      GROUP BY cr.id, user_cp.user_id
      ORDER BY cr.created_at
    `, [req.user.id]);
    
    res.json({ rooms: rooms.rows });
  } catch (error) {
    console.error('Chat rooms fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get chat messages for a room
app.get('/api/chat/rooms/:roomId/messages', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const messages = await db.query(`
      SELECT cm.*, p.username, p.avatar_url
      FROM chat_messages cm
      JOIN profiles p ON cm.user_id = p.id
      WHERE cm.room_id = $1
      ORDER BY cm.created_at DESC
      LIMIT $2 OFFSET $3
    `, [roomId, limit, offset]);
    
    res.json({ messages: messages.rows.reverse() });
  } catch (error) {
    console.error('Chat messages fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Join chat room
app.post('/api/chat/rooms/:roomId/join', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Check if room exists and is active
    const room = await db.query(
      'SELECT * FROM chat_rooms WHERE id = $1 AND is_active = true',
      [roomId]
    );
    
    if (room.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found or inactive' });
    }
    
    // Add user to room (ignore if already member)
    await db.query(`
      INSERT INTO chat_participants (room_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (room_id, user_id) DO NOTHING
    `, [roomId, req.user.id]);
    
    res.json({ message: 'Joined room successfully' });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// SPECIALISTS ROUTES

// Get specialists
app.get('/api/specialists', authenticateToken, async (req, res) => {
  try {
    const { specialization } = req.query;
    
    let query = `
      SELECT s.*, p.username, p.avatar_url,
             COALESCE(AVG(a.rating), 0) as avg_rating,
             COUNT(a.id) as total_appointments
      FROM specialists s
      JOIN profiles p ON s.user_id = p.id
      LEFT JOIN appointments a ON s.id = a.specialist_id
      WHERE s.is_available = true
    `;
    let params = [];
    
    if (specialization) {
      query += ' AND s.specialization ILIKE $1';
      params.push(`%${specialization}%`);
    }
    
    query += `
      GROUP BY s.id, p.username, p.avatar_url
      ORDER BY avg_rating DESC, s.created_at
    `;
    
    const specialists = await db.query(query, params);
    res.json({ specialists: specialists.rows });
  } catch (error) {
    console.error('Specialists fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Book appointment
app.post('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const { specialist_id, appointment_date, duration_minutes, notes, session_type } = req.body;
    
    if (!specialist_id || !appointment_date) {
      return res.status(400).json({ error: 'Specialist ID and appointment date are required' });
    }
    
    // Check if specialist exists and is available
    const specialist = await db.query(
      'SELECT * FROM specialists WHERE id = $1 AND is_available = true',
      [specialist_id]
    );
    
    if (specialist.rows.length === 0) {
      return res.status(404).json({ error: 'Specialist not found or unavailable' });
    }
    
    // Check for scheduling conflicts
    const conflictCheck = await db.query(`
      SELECT id FROM appointments 
      WHERE specialist_id = $1 
      AND appointment_date = $2 
      AND status NOT IN ('cancelled', 'completed')
    `, [specialist_id, appointment_date]);
    
    if (conflictCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Time slot already booked' });
    }
    
    const appointment = await db.query(`
      INSERT INTO appointments (user_id, specialist_id, appointment_date, duration_minutes, notes, session_type, price)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [req.user.id, specialist_id, appointment_date, duration_minutes || 60, 
        notes, session_type || 'video', specialist.rows[0].hourly_rate]);
    
    res.status(201).json({ appointment: appointment.rows[0] });
  } catch (error) {
    console.error('Appointment booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user appointments
app.get('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const appointments = await db.query(`
      SELECT a.*, s.first_name, s.last_name, s.title, s.specialization
      FROM appointments a
      JOIN specialists s ON a.specialist_id = s.id
      WHERE a.user_id = $1
      ORDER BY a.appointment_date DESC
    `, [req.user.id]);
    
    res.json({ appointments: appointments.rows });
  } catch (error) {
    console.error('Appointments fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// FOCUS SESSIONS ROUTES

// Start focus session
app.post('/api/focus-sessions', authenticateToken, async (req, res) => {
  try {
    const { session_type, duration_minutes } = req.body;
    
    if (!session_type || !duration_minutes) {
      return res.status(400).json({ error: 'Session type and duration are required' });
    }
    
    const session = await db.query(`
      INSERT INTO focus_sessions (user_id, session_type, duration_minutes)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [req.user.id, session_type, duration_minutes]);
    
    res.status(201).json({ session: session.rows[0] });
  } catch (error) {
    console.error('Focus session creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete focus session
app.put('/api/focus-sessions/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { interruptions, notes } = req.body;
    
    const points = calculatePoints('focus_session');
    
    const session = await db.query(`
      UPDATE focus_sessions 
      SET completed = true, interruptions = $1, notes = $2, points_earned = $3
      WHERE id = $4 AND user_id = $5
      RETURNING *
    `, [interruptions || 0, notes, points, id, req.user.id]);
    
    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    // Award points
    await db.query(
      'UPDATE profiles SET points = points + $1 WHERE id = $2',
      [points, req.user.id]
    );
    
    // Record progress
    await db.query(`
      INSERT INTO progress_records (user_id, activity_type, activity_id, points_earned, duration_minutes, progress_data)
      VALUES ($1, 'focus_session', $2, $3, $4, $5)
    `, [req.user.id, id, points, session.rows[0].duration_minutes, 
        JSON.stringify({ session_type: session.rows[0].session_type, interruptions })]);
    
    res.json({ 
      session: session.rows[0],
      points_earned: points
    });
  } catch (error) {
    console.error('Focus session completion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PROGRESS AND ANALYTICS ROUTES

// Get user progress summary
app.get('/api/progress', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    // Get progress records
    const progress = await db.query(`
      SELECT 
        activity_type,
        COUNT(*) as activity_count,
        SUM(points_earned) as total_points,
        AVG(duration_minutes) as avg_duration
      FROM progress_records
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY activity_type
      ORDER BY total_points DESC
    `, [req.user.id]);
    
    // Get daily activity
    const dailyActivity = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as activities,
        SUM(points_earned) as points
      FROM progress_records
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [req.user.id]);
    
    // Get achievements
    const achievements = await db.query(`
      SELECT ua.*, a.name, a.description, a.icon, a.badge_color
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = $1
      ORDER BY ua.earned_at DESC
    `, [req.user.id]);
    
    res.json({
      progress_summary: progress.rows,
      daily_activity: dailyActivity.rows,
      achievements: achievements.rows
    });
  } catch (error) {
    console.error('Progress fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Static files serving
app.use('/uploads', express.static('uploads'));

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
server.listen(PORT, () => {
  console.log(`MindSpark backend server running on port ${PORT}`);
  console.log(`WebSocket server ready for real-time chat`);
});
