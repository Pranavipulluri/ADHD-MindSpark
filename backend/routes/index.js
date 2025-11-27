const express = require('express');
const { healthCheck } = require('../middleware/auth');

// Import route modules
const authRoutes = require('./auth');
const moodRoutes = require('./mood');
const taskRoutes = require('./tasks');
const gameRoutes = require('./games');
const documentRoutes = require('./documents');
const chatRoutes = require('./chat');
const specialistRoutes = require('./specialists');
const appointmentRoutes = require('./appointments');
const focusSessionRoutes = require('./focusSessions');
const progressRoutes = require('./progress');
const aiRoutes = require('./ai');
const ngoRoutes = require('./ngo');

const router = express.Router();

// Health check endpoint
router.get('/health', healthCheck);

// API Info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'MindSpark API',
    version: '1.0.0',
    description: 'Backend API for MindSpark ADHD support application',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      mood: '/api/mood',
      tasks: '/api/tasks',
      games: '/api/games',
      documents: '/api/documents',
      chat: '/api/chat',
      specialists: '/api/specialists',
      appointments: '/api/appointments',
      'focus-sessions': '/api/focus-sessions',
      progress: '/api/progress',
      ai: '/api/ai',
      ngo: '/api/ngo'
    },
    timestamp: new Date().toISOString()
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/mood', moodRoutes);
router.use('/tasks', taskRoutes);
router.use('/games', gameRoutes);
router.use('/documents', documentRoutes);
router.use('/chat', chatRoutes);
router.use('/specialists', specialistRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/focus-sessions', focusSessionRoutes);
router.use('/progress', progressRoutes);
router.use('/ai', aiRoutes);
router.use('/ngo', ngoRoutes);

module.exports = router;