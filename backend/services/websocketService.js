const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class WebSocketHandler {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server,
      path: '/ws',
      clientTracking: true
    });
    
    // Store active connections
    this.clients = new Map(); // userId -> WebSocket
    this.rooms = new Map(); // roomId -> Set of userIds
    this.userRooms = new Map(); // userId -> Set of roomIds
    
    this.setupWebSocketServer();
    this.setupHeartbeat();
    
    console.log('🔌 WebSocket server initialized');
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      console.log('📡 New WebSocket connection from:', req.socket.remoteAddress);
      
      ws.isAlive = true;
      ws.userId = null;
      ws.rooms = new Set();
      
      // Handle heartbeat
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle messages
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message);
          await this.handleMessage(ws, data);
        } catch (error) {
          console.error('WebSocket message error:', error);
          this.sendError(ws, 'Invalid message format', 'MESSAGE_PARSE_ERROR');
        }
      });

      // Handle connection close
      ws.on('close', (code, reason) => {
        console.log(`📡 WebSocket disconnected: ${code} ${reason}`);
        this.handleDisconnection(ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.handleDisconnection(ws);
      });

      // Send welcome message
      this.sendMessage(ws, {
        type: 'connection_established',
        message: 'Welcome to MindSpark real-time connection!',
        timestamp: new Date().toISOString()
      });
    });
  }

  setupHeartbeat() {
    // Ping all clients every 30 seconds to check if they're alive
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive) {
          console.log('📡 Terminating dead connection');
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  async handleMessage(ws, data) {
    const { type, ...payload } = data;

    switch (type) {
      case 'auth':
        await this.handleAuthentication(ws, payload);
        break;
        
      case 'join_room':
        await this.handleJoinRoom(ws, payload);
        break;
        
      case 'leave_room':
        await this.handleLeaveRoom(ws, payload);
        break;
        
      case 'chat_message':
        await this.handleChatMessage(ws, payload);
        break;
        
      case 'typing_start':
        await this.handleTypingStart(ws, payload);
        break;
        
      case 'typing_stop':
        await this.handleTypingStop(ws, payload);
        break;
        
      case 'focus_session_update':
        await this.handleFocusSessionUpdate(ws, payload);
        break;
        
      case 'game_challenge':
        await this.handleGameChallenge(ws, payload);
        break;
        
      case 'heartbeat':
        this.sendMessage(ws, { type: 'heartbeat_ack', timestamp: new Date().toISOString() });
        break;
        
      default:
        this.sendError(ws, `Unknown message type: ${type}`, 'UNKNOWN_MESSAGE_TYPE');
    }
  }

  async handleAuthentication(ws, { token }) {
    try {
      if (!token) {
        return this.sendError(ws, 'Authentication token required', 'AUTH_TOKEN_REQUIRED');
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Verify user exists
      const userResult = await pool.query(
        'SELECT id, username, avatar_url, points, level FROM profiles WHERE id = $1',
        [decoded.id]
      );

      if (userResult.rows.length === 0) {
        return this.sendError(ws, 'User not found', 'USER_NOT_FOUND');
      }

      const user = userResult.rows[0];
      
      // Remove any existing connection for this user
      if (this.clients.has(user.id)) {
        const existingWs = this.clients.get(user.id);
        existingWs.terminate();
      }

      // Store connection
      ws.userId = user.id;
      ws.user = user;
      this.clients.set(user.id, ws);

      // Update user's last activity
      await pool.query(
        'UPDATE profiles SET last_activity = NOW() WHERE id = $1',
        [user.id]
      );

      this.sendMessage(ws, {
        type: 'auth_success',
        user: {
          id: user.id,
          username: user.username,
          avatar_url: user.avatar_url,
          points: user.points,
          level: user.level
        },
        timestamp: new Date().toISOString()
      });

      console.log(`✅ User ${user.username} authenticated via WebSocket`);
      
    } catch (error) {
      console.error('WebSocket authentication error:', error);
      this.sendError(ws, 'Authentication failed', 'AUTH_FAILED');
    }
  }

  async handleJoinRoom(ws, { room_id }) {
    try {
      if (!ws.userId) {
        return this.sendError(ws, 'Authentication required', 'AUTH_REQUIRED');
      }

      if (!room_id) {
        return this.sendError(ws, 'Room ID required', 'ROOM_ID_REQUIRED');
      }

      // Verify room exists and user has access
      const roomResult = await pool.query(
        'SELECT * FROM chat_rooms WHERE id = $1 AND is_active = true',
        [room_id]
      );

      if (roomResult.rows.length === 0) {
        return this.sendError(ws, 'Room not found or inactive', 'ROOM_NOT_FOUND');
      }

      // Add user to room participants if not already a member
      await pool.query(`
        INSERT INTO chat_participants (room_id, user_id, joined_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (room_id, user_id) DO UPDATE SET last_read_at = NOW()
      `, [room_id, ws.userId]);

      // Add to local room tracking
      if (!this.rooms.has(room_id)) {
        this.rooms.set(room_id, new Set());
      }
      
      this.rooms.get(room_id).add(ws.userId);
      ws.rooms.add(room_id);
      
      if (!this.userRooms.has(ws.userId)) {
        this.userRooms.set(ws.userId, new Set());
      }
      this.userRooms.get(ws.userId).add(room_id);

      this.sendMessage(ws, {
        type: 'room_joined',
        room_id,
        room_name: roomResult.rows[0].name,
        timestamp: new Date().toISOString()
      });

      // Notify other room members
      this.broadcastToRoom(room_id, {
        type: 'user_joined_room',
        room_id,
        user: {
          id: ws.user.id,
          username: ws.user.username,
          avatar_url: ws.user.avatar_url
        },
        timestamp: new Date().toISOString()
      }, ws.userId);

      console.log(`👥 User ${ws.user.username} joined room ${room_id}`);
      
    } catch (error) {
      console.error('Join room error:', error);
      this.sendError(ws, 'Failed to join room', 'JOIN_ROOM_FAILED');
    }
  }

  async handleLeaveRoom(ws, { room_id }) {
    try {
      if (!ws.userId || !room_id) {
        return this.sendError(ws, 'User ID and Room ID required', 'INVALID_PARAMS');
      }

      // Remove from local tracking
      if (this.rooms.has(room_id)) {
        this.rooms.get(room_id).delete(ws.userId);
        if (this.rooms.get(room_id).size === 0) {
          this.rooms.delete(room_id);
        }
      }
      
      ws.rooms.delete(room_id);
      
      if (this.userRooms.has(ws.userId)) {
        this.userRooms.get(ws.userId).delete(room_id);
      }

      this.sendMessage(ws, {
        type: 'room_left',
        room_id,
        timestamp: new Date().toISOString()
      });

      // Notify other room members
      this.broadcastToRoom(room_id, {
        type: 'user_left_room',
        room_id,
        user: {
          id: ws.user.id,
          username: ws.user.username
        },
        timestamp: new Date().toISOString()
      }, ws.userId);

      console.log(`👥 User ${ws.user.username} left room ${room_id}`);
      
    } catch (error) {
      console.error('Leave room error:', error);
      this.sendError(ws, 'Failed to leave room', 'LEAVE_ROOM_FAILED');
    }
  }

  async handleChatMessage(ws, { room_id, content, reply_to }) {
    try {
      if (!ws.userId) {
        return this.sendError(ws, 'Authentication required', 'AUTH_REQUIRED');
      }

      if (!room_id || !content || content.trim().length === 0) {
        return this.sendError(ws, 'Room ID and message content required', 'INVALID_MESSAGE');
      }

      if (content.length > 1000) {
        return this.sendError(ws, 'Message too long (max 1000 characters)', 'MESSAGE_TOO_LONG');
      }

      // Verify user is in room
      if (!ws.rooms.has(room_id)) {
        return this.sendError(ws, 'You are not a member of this room', 'NOT_ROOM_MEMBER');
      }

      // Save message to database
      const messageResult = await pool.query(`
        INSERT INTO chat_messages (room_id, user_id, content, reply_to, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING *
      `, [room_id, ws.userId, content.trim(), reply_to]);

      const message = messageResult.rows[0];

      // Get full message data with user info
      const fullMessageResult = await pool.query(`
        SELECT cm.*, p.username, p.avatar_url
        FROM chat_messages cm
        JOIN profiles p ON cm.user_id = p.id
        WHERE cm.id = $1
      `, [message.id]);

      const fullMessage = fullMessageResult.rows[0];

      // Broadcast to all room members
      this.broadcastToRoom(room_id, {
        type: 'new_message',
        message: fullMessage,
        timestamp: new Date().toISOString()
      });

      console.log(`💬 Message sent in room ${room_id} by ${ws.user.username}`);
      
    } catch (error) {
      console.error('Chat message error:', error);
      this.sendError(ws, 'Failed to send message', 'MESSAGE_SEND_FAILED');
    }
  }

  async handleTypingStart(ws, { room_id }) {
    if (!ws.userId || !room_id || !ws.rooms.has(room_id)) {
      return;
    }

    this.broadcastToRoom(room_id, {
      type: 'user_typing',
      room_id,
      user: {
        id: ws.user.id,
        username: ws.user.username
      },
      typing: true,
      timestamp: new Date().toISOString()
    }, ws.userId);
  }

  async handleTypingStop(ws, { room_id }) {
    if (!ws.userId || !room_id || !ws.rooms.has(room_id)) {
      return;
    }

    this.broadcastToRoom(room_id, {
      type: 'user_typing',
      room_id,
      user: {
        id: ws.user.id,
        username: ws.user.username
      },
      typing: false,
      timestamp: new Date().toISOString()
    }, ws.userId);
  }

  async handleFocusSessionUpdate(ws, { session_id, status, elapsed_time }) {
    try {
      if (!ws.userId) {
        return this.sendError(ws, 'Authentication required', 'AUTH_REQUIRED');
      }

      // Verify session belongs to user
      const sessionResult = await pool.query(
        'SELECT * FROM focus_sessions WHERE id = $1 AND user_id = $2',
        [session_id, ws.userId]
      );

      if (sessionResult.rows.length === 0) {
        return this.sendError(ws, 'Focus session not found', 'SESSION_NOT_FOUND');
      }

      // Broadcast focus session update to user's friends/study buddies
      const friendsResult = await pool.query(`
        SELECT friend_id FROM friendships 
        WHERE user_id = $1 AND status = 'accepted'
        UNION
        SELECT user_id FROM friendships 
        WHERE friend_id = $1 AND status = 'accepted'
      `, [ws.userId]);

      const friendIds = friendsResult.rows.map(row => row.friend_id || row.user_id);

      friendIds.forEach(friendId => {
        if (this.clients.has(friendId)) {
          const friendWs = this.clients.get(friendId);
          this.sendMessage(friendWs, {
            type: 'friend_focus_update',
            user: {
              id: ws.user.id,
              username: ws.user.username
            },
            session: {
              id: session_id,
              status,
              elapsed_time
            },
            timestamp: new Date().toISOString()
          });
        }
      });

      console.log(`🎯 Focus session update from ${ws.user.username}: ${status}`);
      
    } catch (error) {
      console.error('Focus session update error:', error);
      this.sendError(ws, 'Failed to update focus session', 'FOCUS_UPDATE_FAILED');
    }
  }

  async handleGameChallenge(ws, { target_user_id, game_id, challenge_data }) {
    try {
      if (!ws.userId) {
        return this.sendError(ws, 'Authentication required', 'AUTH_REQUIRED');
      }

      if (!target_user_id || !game_id) {
        return this.sendError(ws, 'Target user and game ID required', 'INVALID_CHALLENGE');
      }

      // Check if target user is online
      if (!this.clients.has(target_user_id)) {
        return this.sendError(ws, 'Target user is not online', 'USER_OFFLINE');
      }

      // Get game info
      const gameResult = await pool.query('SELECT * FROM games WHERE id = $1', [game_id]);
      if (gameResult.rows.length === 0) {
        return this.sendError(ws, 'Game not found', 'GAME_NOT_FOUND');
      }

      const challengeId = uuidv4();
      const targetWs = this.clients.get(target_user_id);

      // Send challenge to target user
      this.sendMessage(targetWs, {
        type: 'game_challenge_received',
        challenge_id: challengeId,
        from_user: {
          id: ws.user.id,
          username: ws.user.username,
          avatar_url: ws.user.avatar_url
        },
        game: gameResult.rows[0],
        challenge_data,
        timestamp: new Date().toISOString()
      });

      // Confirm challenge sent
      this.sendMessage(ws, {
        type: 'game_challenge_sent',
        challenge_id: challengeId,
        to_user_id: target_user_id,
        timestamp: new Date().toISOString()
      });

      console.log(`🎮 Game challenge sent from ${ws.user.username} to user ${target_user_id}`);
      
    } catch (error) {
      console.error('Game challenge error:', error);
      this.sendError(ws, 'Failed to send game challenge', 'CHALLENGE_FAILED');
    }
  }

  handleDisconnection(ws) {
    if (ws.userId) {
      // Remove from all rooms
      ws.rooms.forEach(roomId => {
        if (this.rooms.has(roomId)) {
          this.rooms.get(roomId).delete(ws.userId);
          if (this.rooms.get(roomId).size === 0) {
            this.rooms.delete(roomId);
          }
        }

        // Notify room members
        this.broadcastToRoom(roomId, {
          type: 'user_left_room',
          room_id: roomId,
          user: {
            id: ws.user?.id,
            username: ws.user?.username
          },
          timestamp: new Date().toISOString()
        }, ws.userId);
      });

      // Remove from clients
      this.clients.delete(ws.userId);
      this.userRooms.delete(ws.userId);

      console.log(`📡 User ${ws.user?.username || ws.userId} disconnected`);
    }
  }

  broadcastToRoom(roomId, message, excludeUserId = null) {
    if (!this.rooms.has(roomId)) {
      return;
    }

    const roomUsers = this.rooms.get(roomId);
    roomUsers.forEach(userId => {
      if (userId !== excludeUserId && this.clients.has(userId)) {
        const ws = this.clients.get(userId);
        this.sendMessage(ws, message);
      }
    });
  }

  broadcastToUser(userId, message) {
    if (this.clients.has(userId)) {
      const ws = this.clients.get(userId);
      this.sendMessage(ws, message);
    }
  }

  broadcastToAll(message, excludeUserId = null) {
    this.clients.forEach((ws, userId) => {
      if (userId !== excludeUserId) {
        this.sendMessage(ws, message);
      }
    });
  }

  sendMessage(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  sendError(ws, message, code = 'GENERIC_ERROR') {
    this.sendMessage(ws, {
      type: 'error',
      error: {
        message,
        code,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Get statistics
  getStats() {
    return {
      totalConnections: this.clients.size,
      activeRooms: this.rooms.size,
      totalRoomConnections: Array.from(this.rooms.values())
        .reduce((sum, users) => sum + users.size, 0)
    };
  }

  // Graceful shutdown
  async close() {
    console.log('🔌 Closing WebSocket server...');
    
    // Notify all clients about shutdown
    this.broadcastToAll({
      type: 'server_shutdown',
      message: 'Server is shutting down. Please reconnect in a moment.',
      timestamp: new Date().toISOString()
    });

    // Close all connections
    this.wss.clients.forEach(ws => {
      ws.close(1001, 'Server shutdown');
    });

    // Close the server
    return new Promise((resolve) => {
      this.wss.close(() => {
        console.log('✅ WebSocket server closed');
        resolve();
      });
    });
  }
}

module.exports = WebSocketHandler;