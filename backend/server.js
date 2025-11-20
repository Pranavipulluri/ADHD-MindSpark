const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

// Load environment variables
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Environment variables
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const DATABASE_URL = process.env.DATABASE_URL || 'sqlite:./database.sqlite';

// Database setup
let db;
let dbType;

if (DATABASE_URL.startsWith('sqlite:')) {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = DATABASE_URL.replace('sqlite:', '');
  dbType = 'sqlite';
  const sqliteDb = new sqlite3.Database(dbPath);

  db = {
    query: (sql, params = []) => {
      return new Promise((resolve, reject) => {
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          sqliteDb.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve({ rows });
          });
        } else {
          sqliteDb.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ rows: [], rowCount: this.changes, insertId: this.lastID });
          });
        }
      });
    }
  };
  console.log('🗄️ Using SQLite database');
} else {
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
    'https://mindspark.fit',
    'https://www.mindspark.fit',
    'https://pranavipulluri.github.io'
  ],
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Handle demo tokens for development
  if (token.startsWith('demo-token-')) {
    req.user = {
      id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID for demo
      email: 'demo@mindspark.com',
      username: 'Demo User'
    };
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Helper functions
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// AUTHENTICATION ROUTES
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, username, dateOfBirth, parentEmail } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username are required' });
    }

    const existingUser = await db.query(
      'SELECT id FROM profiles WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
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

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const userResult = await db.query(
      'SELECT * FROM profiles WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

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


// CHAT ROUTES
app.get('/api/chat/rooms', authenticateToken, async (req, res) => {
  try {
    const rooms = await db.query('SELECT * FROM chat_rooms WHERE is_active = true ORDER BY created_at');
    res.json({ rooms: rooms.rows });
  } catch (error) {
    console.error('Chat rooms fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/chat/rooms/:roomId/messages', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // First check if the room exists
    const roomCheck = await db.query('SELECT id FROM chat_rooms WHERE id = $1', [roomId]);

    if (roomCheck.rows.length === 0) {
      return res.json({ messages: [] });
    }

    // Try to get messages, but handle if table doesn't exist or is empty
    try {
      const messages = await db.query(`
        SELECT cm.id, cm.content, cm.created_at, cm.room_id, cm.user_id,
               COALESCE(p.username, 'Anonymous') as username, 
               p.avatar_url
        FROM chat_messages cm
        LEFT JOIN profiles p ON cm.user_id = p.id
        WHERE cm.room_id = $1
        ORDER BY cm.created_at DESC
        LIMIT $2 OFFSET $3
      `, [roomId, limit, offset]);

      res.json({ messages: messages.rows.reverse() });
    } catch (dbError) {
      // If there's a database error (like table doesn't exist), return empty messages
      console.log('No messages found or table issue:', dbError.message);
      res.json({ messages: [] });
    }
  } catch (error) {
    console.error('Chat messages fetch error:', error);
    res.json({ messages: [] }); // Return empty array instead of error
  }
});

app.post('/api/chat/rooms/:roomId/join', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    res.json({ message: 'Joined room successfully' });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI ROUTES
const aiModule = require('./routes/ai');
app.use('/api/ai', aiModule.router);

// TASKS ROUTES
const tasksRoutes = require('./routes/tasks');
app.use('/api/tasks', tasksRoutes);

// DOCUMENTS ROUTES  
const documentsRoutes = require('./routes/documents');
app.use('/api/documents', documentsRoutes);

// Local helper functions for document processing (keeping only what's needed)
function generateSimpleSummary(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const importantSentences = sentences
    .slice(0, Math.min(3, Math.ceil(sentences.length * 0.4)))
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  return importantSentences.join('. ') + (importantSentences.length > 0 ? '.' : '');
}

function generateSimpleQuestions(text) {
  return [
    "What are the main topics discussed in this text?",
    "What are the key points you should remember?",
    "How does this information connect to what you already know?",
    "What questions do you still have after reading this?",
    "How could you apply this information in real life?"
  ];
}

function generateSimpleAnalysis(text) {
  const words = text.split(/\s+/).length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;
  const avgWordsPerSentence = words / Math.max(sentences, 1);
  
  let readingLevel;
  if (avgWordsPerSentence < 10) {
    readingLevel = "Elementary";
  } else if (avgWordsPerSentence < 15) {
    readingLevel = "Middle School";
  } else if (avgWordsPerSentence < 20) {
    readingLevel = "High School";
  } else {
    readingLevel = "College";
  }
  
  return {
    wordCount: words,
    sentenceCount: sentences,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    readingLevel: readingLevel,
    estimatedReadingTime: Math.ceil(words / 200)
  };
}
function generateFlashcards(content) {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const flashcards = [];

  // Look for definition patterns
  sentences.forEach(sentence => {
    const trimmed = sentence.trim();

    // Pattern: "X is Y" or "X are Y"
    if (trimmed.includes(' is ') || trimmed.includes(' are ')) {
      const parts = trimmed.split(/ (is|are) /);
      if (parts.length >= 2) {
        flashcards.push({
          question: `What ${parts[1].split(' ')[0]} ${parts[0]}?`,
          answer: parts.slice(1).join(' ')
        });
      }
    }

    // Pattern: Key concepts
    if (trimmed.includes('concept') || trimmed.includes('principle') || trimmed.includes('important')) {
      flashcards.push({
        question: `Explain this key concept`,
        answer: trimmed
      });
    }
  });

  // Add topic-based flashcards
  const topics = ['definition', 'application', 'example', 'principle', 'method'];
  topics.forEach(topic => {
    const relevantSentences = sentences.filter(s =>
      s.toLowerCase().includes(topic) || s.toLowerCase().includes('key') || s.toLowerCase().includes('important')
    );

    if (relevantSentences.length > 0) {
      flashcards.push({
        question: `What is the main ${topic} discussed in this document?`,
        answer: relevantSentences[0].trim()
      });
    }
  });

  return flashcards.slice(0, 8);
}

function generateQuiz(content) {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
  const quiz = [];

  // Generate different types of questions
  sentences.slice(0, 5).forEach((sentence, index) => {
    const words = sentence.trim().split(' ');
    if (words.length > 8) {

      // Find important words (nouns, adjectives)
      const importantWords = words.filter(word =>
        word.length > 4 &&
        !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will', 'were', 'said'].includes(word.toLowerCase())
      );

      if (importantWords.length > 0) {
        const keyWord = importantWords[Math.floor(Math.random() * importantWords.length)];
        const questionSentence = sentence.replace(new RegExp(keyWord, 'gi'), '____');

        // Generate plausible wrong answers
        const wrongAnswers = [
          'information', 'process', 'system', 'method', 'concept', 'principle',
          'analysis', 'research', 'study', 'example', 'application', 'development'
        ].filter(w => w !== keyWord.toLowerCase()).slice(0, 3);

        const allOptions = [keyWord, ...wrongAnswers];
        const shuffled = allOptions.sort(() => Math.random() - 0.5);
        const correctIndex = shuffled.indexOf(keyWord);

        quiz.push({
          question: `Fill in the blank: ${questionSentence}`,
          options: shuffled,
          correct: correctIndex
        });
      }
    }
  });

  // Add comprehension questions
  if (sentences.length > 3) {
    quiz.push({
      question: "What is the main topic of this document?",
      options: ["Educational content", "Technical manual", "Research paper", "Story book"],
      correct: 0
    });
  }

  return quiz.slice(0, 5);
}

function extractKeyPoints(content) {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  return sentences.slice(0, 5).map(s => s.trim());
}

// Extension points endpoint
app.post('/api/extension/points', authenticateToken, async (req, res) => {
  try {
    const { points, activity_type, source = 'extension' } = req.body;

    if (!points || !activity_type) {
      return res.status(400).json({ error: 'Points and activity type are required' });
    }

    // Update user points
    const userResult = await db.query(
      'UPDATE profiles SET points = points + $1 WHERE id = $2 RETURNING points',
      [points, req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      total_points: userResult.rows[0].points,
      points_earned: points,
      achievement_earned: null
    });
  } catch (error) {
    console.error('Extension points error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test Hugging Face API endpoint
app.get('/api/test-hf', async (req, res) => {
  try {
    console.log('🧪 Testing Hugging Face API...');

    const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: "Hello, how are you?",
        parameters: {
          max_length: 50,
          temperature: 0.8
        }
      })
    });

    const data = await response.json();

    res.json({
      status: response.status,
      apiKeyPresent: !!process.env.HUGGINGFACE_API_KEY,
      response: data
    });
  } catch (error) {
    res.json({
      error: error.message,
      apiKeyPresent: !!process.env.HUGGINGFACE_API_KEY
    });
  }
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const HOST = '0.0.0.0'; // Listen on all network interfaces for Railway
server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🗄️ Using ${dbType} database`);
}).on('error', (err) => {
  console.error('❌ Server failed to start:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});