const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, chatRateLimit } = require('../middleware/auth');
const { validate, chatMessageSchema, validateQuery, paginationSchema } = require('../middleware/validation');

const router = express.Router();

// Get chat rooms
router.get('/rooms', authenticateToken, async (req, res) => {
  try {
    const rooms = await pool.query(`
      SELECT cr.*, 
             COUNT(cp.user_id) as participant_count,
             CASE WHEN user_cp.user_id IS NOT NULL THEN true ELSE false END as is_member,
             CASE WHEN user_cp.role IS NOT NULL THEN user_cp.role ELSE 'none' END as user_role
      FROM chat_rooms cr
      LEFT JOIN chat_participants cp ON cr.id = cp.room_id
      LEFT JOIN chat_participants user_cp ON cr.id = user_cp.room_id AND user_cp.user_id = $1
      WHERE cr.is_active = true
      GROUP BY cr.id, user_cp.user_id, user_cp.role
      ORDER BY cr.created_at
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: {
        rooms: rooms.rows
      }
    });
  } catch (error) {
    console.error('Chat rooms fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch chat rooms',
      message: 'An error occurred while retrieving chat rooms'
    });
  }
});

// Get chat room by ID
router.get('/rooms/:roomId', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await pool.query(`
      SELECT cr.*, 
             COUNT(cp.user_id) as participant_count,
             CASE WHEN user_cp.user_id IS NOT NULL THEN true ELSE false END as is_member,
             CASE WHEN user_cp.role IS NOT NULL THEN user_cp.role ELSE 'none' END as user_role
      FROM chat_rooms cr
      LEFT JOIN chat_participants cp ON cr.id = cp.room_id
      LEFT JOIN chat_participants user_cp ON cr.id = user_cp.room_id AND user_cp.user_id = $1
      WHERE cr.id = $2 AND cr.is_active = true
      GROUP BY cr.id, user_cp.user_id, user_cp.role
    `, [req.user.id, roomId]);
    
    if (room.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Chat room not found',
        message: 'The requested chat room could not be found'
      });
    }
    
    res.json({
      success: true,
      data: {
        room: room.rows[0]
      }
    });
  } catch (error) {
    console.error('Chat room fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat room'
    });
  }
});

// Get chat messages for a room
router.get('/rooms/:roomId/messages', authenticateToken, validateQuery(paginationSchema), async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    // Verify user has access to this room
    const roomAccess = await pool.query(`
      SELECT cr.room_type, cp.user_id as is_member
      FROM chat_rooms cr
      LEFT JOIN chat_participants cp ON cr.id = cp.room_id AND cp.user_id = $1
      WHERE cr.id = $2 AND cr.is_active = true
    `, [req.user.id, roomId]);
    
    if (roomAccess.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Chat room not found'
      });
    }
    
    const room = roomAccess.rows[0];
    if (room.room_type === 'private' && !room.is_member) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have permission to view messages in this room'
      });
    }
    
    const messages = await pool.query(`
      SELECT cm.*, p.username, p.avatar_url,
             reply_msg.content as reply_content,
             reply_user.username as reply_username
      FROM chat_messages cm
      JOIN profiles p ON cm.user_id = p.id
      LEFT JOIN chat_messages reply_msg ON cm.reply_to = reply_msg.id
      LEFT JOIN profiles reply_user ON reply_msg.user_id = reply_user.id
      WHERE cm.room_id = $1
      ORDER BY cm.created_at DESC
      LIMIT $2 OFFSET $3
    `, [roomId, limit, offset]);
    
    // Update user's last read timestamp
    await pool.query(`
      INSERT INTO chat_participants (room_id, user_id, last_read_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (room_id, user_id) 
      DO UPDATE SET last_read_at = NOW()
    `, [roomId, req.user.id]);
    
    // Get total message count
    const totalCount = await pool.query(
      'SELECT COUNT(*) FROM chat_messages WHERE room_id = $1',
      [roomId]
    );
    
    res.json({
      success: true,
      data: {
        messages: messages.rows.reverse(), // Reverse to show oldest first
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalCount.rows[0].count / limit),
          total_items: parseInt(totalCount.rows[0].count),
          items_per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Chat messages fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch chat messages',
      message: 'An error occurred while retrieving messages'
    });
  }
});

// Send chat message
router.post('/rooms/:roomId/messages', authenticateToken, chatRateLimit, validate(chatMessageSchema), async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, message_type = 'text', reply_to } = req.validatedData;
    
    // Verify user has access to this room
    const roomAccess = await pool.query(`
      SELECT cr.room_type, cp.user_id as is_member
      FROM chat_rooms cr
      LEFT JOIN chat_participants cp ON cr.id = cp.room_id AND cp.user_id = $1
      WHERE cr.id = $2 AND cr.is_active = true
    `, [req.user.id, roomId]);
    
    if (roomAccess.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Chat room not found'
      });
    }
    
    const room = roomAccess.rows[0];
    
    // For private rooms, user must be a member
    if (room.room_type === 'private' && !room.is_member) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You must be a member of this room to send messages'
      });
    }
    
    // For public rooms, auto-join user if not already a member
    if (room.room_type === 'public' && !room.is_member) {
      await pool.query(`
        INSERT INTO chat_participants (room_id, user_id, joined_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (room_id, user_id) DO NOTHING
      `, [roomId, req.user.id]);
    }
    
    // Verify reply_to message exists and is in the same room
    if (reply_to) {
      const replyMessage = await pool.query(
        'SELECT id FROM chat_messages WHERE id = $1 AND room_id = $2',
        [reply_to, roomId]
      );
      
      if (replyMessage.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid reply message',
          message: 'The message you are replying to does not exist or is not in this room'
        });
      }
    }
    
    // Create message
    const message = await pool.query(`
      INSERT INTO chat_messages (room_id, user_id, content, message_type, reply_to)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [roomId, req.user.id, content, message_type, reply_to]);
    
    // Get message with user info for response
    const messageWithUser = await pool.query(`
      SELECT cm.*, p.username, p.avatar_url
      FROM chat_messages cm
      JOIN profiles p ON cm.user_id = p.id
      WHERE cm.id = $1
    `, [message.rows[0].id]);
    
    // Award points for chat participation (limited per day)
    const dailyMessageCount = await pool.query(`
      SELECT COUNT(*) FROM chat_messages 
      WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE
    `, [req.user.id]);
    
    let pointsEarned = 0;
    if (parseInt(dailyMessageCount.rows[0].count) <= 10) { // Max 10 points per day from chat
      pointsEarned = 1;
      await pool.query(
        'UPDATE profiles SET points = points + $1 WHERE id = $2',
        [pointsEarned, req.user.id]
      );
    }
    
    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message: messageWithUser.rows[0],
        points_earned: pointsEarned
      }
    });
  } catch (error) {
    console.error('Chat message send error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to send message',
      message: 'An error occurred while sending your message'
    });
  }
});

// Join chat room
router.post('/rooms/:roomId/join', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Check if room exists and is active
    const room = await pool.query(
      'SELECT * FROM chat_rooms WHERE id = $1 AND is_active = true',
      [roomId]
    );
    
    if (room.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Chat room not found',
        message: 'The requested chat room could not be found or is inactive'
      });
    }
    
    const roomData = room.rows[0];
    
    // Check if room is full
    const participantCount = await pool.query(
      'SELECT COUNT(*) as count FROM chat_participants WHERE room_id = $1',
      [roomId]
    );
    
    if (parseInt(participantCount.rows[0].count) >= roomData.max_participants) {
      return res.status(409).json({
        success: false,
        error: 'Room is full',
        message: 'This chat room has reached its maximum capacity'
      });
    }
    
    // Add user to room
    await pool.query(`
      INSERT INTO chat_participants (room_id, user_id, joined_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (room_id, user_id) DO NOTHING
    `, [roomId, req.user.id]);
    
    res.json({
      success: true,
      message: 'Successfully joined the chat room',
      data: {
        room: roomData
      }
    });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to join room',
      message: 'An error occurred while joining the chat room'
    });
  }
});

// Leave chat room
router.post('/rooms/:roomId/leave', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const result = await pool.query(
      'DELETE FROM chat_participants WHERE room_id = $1 AND user_id = $2 RETURNING *',
      [roomId, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not a member',
        message: 'You are not a member of this chat room'
      });
    }
    
    res.json({
      success: true,
      message: 'Successfully left the chat room'
    });
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to leave room'
    });
  }
});

// Get room participants
router.get('/rooms/:roomId/participants', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Verify user has access to this room
    const roomAccess = await pool.query(`
      SELECT cr.room_type, cp.user_id as is_member
      FROM chat_rooms cr
      LEFT JOIN chat_participants cp ON cr.id = cp.room_id AND cp.user_id = $1
      WHERE cr.id = $2 AND cr.is_active = true
    `, [req.user.id, roomId]);
    
    if (roomAccess.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Chat room not found'
      });
    }
    
    const room = roomAccess.rows[0];
    if (room.room_type === 'private' && !room.is_member) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const participants = await pool.query(`
      SELECT cp.joined_at, cp.last_read_at, cp.role,
             p.id, p.username, p.avatar_url, p.points, p.level
      FROM chat_participants cp
      JOIN profiles p ON cp.user_id = p.id
      WHERE cp.room_id = $1
      ORDER BY cp.joined_at
    `, [roomId]);
    
    res.json({
      success: true,
      data: {
        participants: participants.rows
      }
    });
  } catch (error) {
    console.error('Participants fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch participants'
    });
  }
});

// Update message (edit)
router.put('/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Content is required'
      });
    }
    
    if (content.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Message too long',
        message: 'Message cannot exceed 1000 characters'
      });
    }
    
    // Update message (only if user owns it and it's recent)
    const updatedMessage = await pool.query(`
      UPDATE chat_messages 
      SET content = $1, is_edited = true, edited_at = NOW()
      WHERE id = $2 AND user_id = $3 
        AND created_at >= NOW() - INTERVAL '15 minutes'
      RETURNING *
    `, [content.trim(), messageId, req.user.id]);
    
    if (updatedMessage.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Message not found or cannot be edited',
        message: 'Messages can only be edited within 15 minutes of posting'
      });
    }
    
    res.json({
      success: true,
      message: 'Message updated successfully',
      data: {
        message: updatedMessage.rows[0]
      }
    });
  } catch (error) {
    console.error('Message update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update message'
    });
  }
});

// Delete message
router.delete('/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    // Delete message (only if user owns it)
    const deletedMessage = await pool.query(
      'DELETE FROM chat_messages WHERE id = $1 AND user_id = $2 RETURNING *',
      [messageId, req.user.id]
    );
    
    if (deletedMessage.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Message not found',
        message: 'The message could not be found or you do not have permission to delete it'
      });
    }
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Message deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message'
    });
  }
});

// Create private room
router.post('/rooms', authenticateToken, async (req, res) => {
  try {
    const { name, description, room_type = 'private', participant_ids = [] } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Room name is required'
      });
    }
    
    if (room_type === 'private' && participant_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Participants required',
        message: 'Private rooms must have at least one participant'
      });
    }
    
    // Create room
    const room = await pool.query(`
      INSERT INTO chat_rooms (name, description, room_type, created_by, is_active, max_participants)
      VALUES ($1, $2, $3, $4, true, $5)
      RETURNING *
    `, [name.trim(), description, room_type, req.user.id, room_type === 'private' ? 10 : 50]);
    
    const roomId = room.rows[0].id;
    
    // Add creator to room
    await pool.query(`
      INSERT INTO chat_participants (room_id, user_id, role, joined_at)
      VALUES ($1, $2, 'admin', NOW())
    `, [roomId, req.user.id]);
    
    // Add other participants
    if (participant_ids.length > 0) {
      const participantValues = participant_ids.map((userId, index) => 
        `($1, $${index + 3}, 'member', NOW())`
      ).join(',');
      
      await pool.query(`
        INSERT INTO chat_participants (room_id, user_id, role, joined_at)
        VALUES ${participantValues}
      `, [roomId, req.user.id, ...participant_ids]);
    }
    
    res.status(201).json({
      success: true,
      message: 'Chat room created successfully',
      data: {
        room: room.rows[0]
      }
    });
  } catch (error) {
    console.error('Room creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create chat room'
    });
  }
});

module.exports = router;