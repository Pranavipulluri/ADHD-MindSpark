const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { validate, focusSessionSchema, focusSessionCompleteSchema, validateQuery, paginationSchema } = require('../middleware/validation');

const router = express.Router();

// Helper function to calculate focus session points
const calculateFocusPoints = (sessionType, durationMinutes, interruptions = 0) => {
  const basePoints = {
    focus_timer: 15,
    breathing: 8,
    meditation: 12
  };
  
  let points = basePoints[sessionType] || 10;
  
  // Duration bonus (for sessions longer than 15 minutes)
  if (durationMinutes > 15) {
    points += Math.floor((durationMinutes - 15) / 10) * 2;
  }
  
  // Penalty for interruptions
  if (interruptions > 0) {
    points = Math.max(1, points - (interruptions * 2));
  }
  
  // Perfect session bonus (no interruptions, 20+ minutes)
  if (interruptions === 0 && durationMinutes >= 20) {
    points = Math.round(points * 1.3);
  }
  
  return points;
};

// Start new focus session
router.post('/', authenticateToken, validate(focusSessionSchema), async (req, res) => {
  try {
    const { session_type, duration_minutes } = req.validatedData;
    
    // Check if user has an active session
    const activeSession = await pool.query(
      'SELECT id FROM focus_sessions WHERE user_id = $1 AND completed = false',
      [req.user.id]
    );
    
    if (activeSession.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Active session exists',
        message: 'Please complete your current session before starting a new one'
      });
    }
    
    const session = await pool.query(`
      INSERT INTO focus_sessions (user_id, session_type, duration_minutes)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [req.user.id, session_type, duration_minutes]);
    
    res.status(201).json({
      success: true,
      message: 'Focus session started successfully',
      data: {
        session: session.rows[0]
      }
    });
  } catch (error) {
    console.error('Focus session creation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to start focus session',
      message: 'An error occurred while starting your focus session'
    });
  }
});

// Complete focus session
router.put('/:id/complete', authenticateToken, validate(focusSessionCompleteSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { interruptions, notes } = req.validatedData;
    
    // Get current session
    const currentSession = await pool.query(
      'SELECT * FROM focus_sessions WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (currentSession.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'The focus session could not be found'
      });
    }
    
    const sessionData = currentSession.rows[0];
    
    if (sessionData.completed) {
      return res.status(400).json({
        success: false,
        error: 'Session already completed',
        message: 'This focus session has already been completed'
      });
    }
    
    // Calculate actual duration based on start time
    const startTime = new Date(sessionData.created_at);
    const endTime = new Date();
    const actualDurationMinutes = Math.round((endTime - startTime) / (1000 * 60));
    
    // Use the minimum of planned duration and actual duration
    const effectiveDuration = Math.min(sessionData.duration_minutes, actualDurationMinutes);
    
    // Calculate points
    const pointsEarned = calculateFocusPoints(
      sessionData.session_type, 
      effectiveDuration, 
      interruptions
    );
    
    // Update session
    const completedSession = await pool.query(`
      UPDATE focus_sessions 
      SET completed = true, 
          interruptions = $1, 
          notes = $2, 
          points_earned = $3,
          actual_duration_minutes = $4
      WHERE id = $5 AND user_id = $6
      RETURNING *
    `, [interruptions, notes, pointsEarned, actualDurationMinutes, id, req.user.id]);
    
    // Award points to user
    await pool.query(
      'UPDATE profiles SET points = points + $1 WHERE id = $2',
      [pointsEarned, req.user.id]
    );
    
    // Record progress
    await pool.query(`
      INSERT INTO progress_records (user_id, activity_type, activity_id, points_earned, duration_minutes, progress_data)
      VALUES ($1, 'focus_session', $2, $3, $4, $5)
    `, [req.user.id, id, pointsEarned, effectiveDuration, JSON.stringify({
      session_type: sessionData.session_type,
      interruptions: interruptions,
      planned_duration: sessionData.duration_minutes,
      actual_duration: actualDurationMinutes
    })]);
    
    // Check for streak achievements
    const achievements = await checkFocusAchievements(req.user.id);
    
    res.json({
      success: true,
      message: 'Focus session completed successfully! 🎯',
      data: {
        session: completedSession.rows[0],
        points_earned: pointsEarned,
        achievements_unlocked: achievements
      }
    });
  } catch (error) {
    console.error('Focus session completion error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to complete session',
      message: 'An error occurred while completing your focus session'
    });
  }
});

// Get user's focus sessions
router.get('/', authenticateToken, validateQuery(paginationSchema), async (req, res) => {
  try {
    const { session_type, completed, page = 1, limit = 20, days = 30 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT * FROM focus_sessions
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
    `;
    let params = [req.user.id];
    let paramCount = 1;
    
    // Add filters
    if (session_type) {
      paramCount++;
      query += ` AND session_type = $${paramCount}`;
      params.push(session_type);
    }
    
    if (completed !== undefined) {
      paramCount++;
      query += ` AND completed = $${paramCount}`;
      params.push(completed === 'true');
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    const sessions = await pool.query(query, params);
    
    // Get total count
    let countQuery = `SELECT COUNT(*) FROM focus_sessions WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'`;
    let countParams = [req.user.id];
    
    if (session_type) {
      countQuery += ' AND session_type = $2';
      countParams.push(session_type);
    }
    if (completed !== undefined) {
      const countIndex = session_type ? 3 : 2;
      countQuery += ` AND completed = $${countIndex}`;
      countParams.push(completed === 'true');
    }
    
    const totalCount = await pool.query(countQuery, countParams);
    const total = parseInt(totalCount.rows[0].count);
    
    // Get session statistics
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE completed = true) as completed_sessions,
        SUM(duration_minutes) FILTER (WHERE completed = true) as total_minutes,
        AVG(duration_minutes) FILTER (WHERE completed = true) as avg_duration,
        SUM(points_earned) as total_points_earned,
        AVG(interruptions) FILTER (WHERE completed = true) as avg_interruptions,
        session_type,
        COUNT(*) as type_count
      FROM focus_sessions
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY ROLLUP(session_type)
      ORDER BY session_type NULLS FIRST
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: {
        sessions: sessions.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: parseInt(limit)
        },
        statistics: stats.rows
      }
    });
  } catch (error) {
    console.error('Focus sessions fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch focus sessions',
      message: 'An error occurred while retrieving your focus sessions'
    });
  }
});

// Get focus session by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const session = await pool.query(
      'SELECT * FROM focus_sessions WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (session.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        message: 'The requested focus session could not be found'
      });
    }
    
    res.json({
      success: true,
      data: {
        session: session.rows[0]
      }
    });
  } catch (error) {
    console.error('Focus session fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch focus session'
    });
  }
});

// Cancel active focus session
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const session = await pool.query(
      'SELECT * FROM focus_sessions WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (session.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    const sessionData = session.rows[0];
    
    if (sessionData.completed) {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel completed session'
      });
    }
    
    // Mark session as cancelled (we can add a cancelled field to the schema)
    await pool.query(`
      UPDATE focus_sessions 
      SET notes = COALESCE(notes || ' | Cancelled: ' || $1, 'Cancelled: ' || $1)
      WHERE id = $2
    `, [reason || 'Session cancelled by user', id]);
    
    // Delete the session since it was never completed
    await pool.query('DELETE FROM focus_sessions WHERE id = $1', [id]);
    
    res.json({
      success: true,
      message: 'Focus session cancelled successfully'
    });
  } catch (error) {
    console.error('Focus session cancellation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel session'
    });
  }
});

// Get focus session analytics
router.get('/analytics/overview', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    // Get overall statistics
    const overview = await pool.query(`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE completed = true) as completed_sessions,
        SUM(duration_minutes) FILTER (WHERE completed = true) as total_focus_minutes,
        AVG(duration_minutes) FILTER (WHERE completed = true) as avg_session_duration,
        SUM(points_earned) as total_points_earned,
        AVG(interruptions) FILTER (WHERE completed = true AND interruptions IS NOT NULL) as avg_interruptions,
        COUNT(*) FILTER (WHERE completed = true AND interruptions = 0) as perfect_sessions,
        MAX(duration_minutes) FILTER (WHERE completed = true) as longest_session
      FROM focus_sessions
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
    `, [req.user.id]);
    
    // Get daily trends
    const dailyTrends = await pool.query(`
      SELECT 
        DATE(created_at) as session_date,
        COUNT(*) as sessions,
        SUM(duration_minutes) FILTER (WHERE completed = true) as total_minutes,
        AVG(interruptions) FILTER (WHERE completed = true) as avg_interruptions
      FROM focus_sessions
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY session_date
    `, [req.user.id]);
    
    // Get session type breakdown
    const typeBreakdown = await pool.query(`
      SELECT 
        session_type,
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE completed = true) as completed_sessions,
        SUM(duration_minutes) FILTER (WHERE completed = true) as total_minutes,
        AVG(duration_minutes) FILTER (WHERE completed = true) as avg_duration,
        SUM(points_earned) as points_earned
      FROM focus_sessions
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY session_type
      ORDER BY completed_sessions DESC
    `, [req.user.id]);
    
    // Get current streak
    const streakQuery = await pool.query(`
      SELECT COUNT(*) as current_streak
      FROM (
        SELECT DATE(created_at) as session_date
        FROM focus_sessions
        WHERE user_id = $1 AND completed = true
        GROUP BY DATE(created_at)
        HAVING COUNT(*) >= 1
        ORDER BY session_date DESC
      ) daily_sessions
      WHERE session_date >= (
        SELECT COALESCE(
          (SELECT session_date + INTERVAL '1 day'
           FROM (
             SELECT DATE(created_at) as session_date,
                    LAG(DATE(created_at)) OVER (ORDER BY DATE(created_at) DESC) as prev_date
             FROM focus_sessions
             WHERE user_id = $1 AND completed = true
             GROUP BY DATE(created_at)
             ORDER BY session_date DESC
           ) gaps
           WHERE session_date - prev_date > INTERVAL '1 day'
           LIMIT 1),
          '1900-01-01'::date
        )
      )
    `, [req.user.id]);
    
    // Get time of day preferences
    const timePreferences = await pool.query(`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour_of_day,
        COUNT(*) as session_count,
        AVG(duration_minutes) FILTER (WHERE completed = true) as avg_duration
      FROM focus_sessions
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY session_count DESC
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: {
        overview: overview.rows[0],
        daily_trends: dailyTrends.rows,
        session_types: typeBreakdown.rows,
        current_streak: parseInt(streakQuery.rows[0]?.current_streak || 0),
        time_preferences: timePreferences.rows
      }
    });
  } catch (error) {
    console.error('Focus analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate focus analytics'
    });
  }
});

// Get active session (if any)
router.get('/active/current', authenticateToken, async (req, res) => {
  try {
    const activeSession = await pool.query(
      'SELECT * FROM focus_sessions WHERE user_id = $1 AND completed = false ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );
    
    if (activeSession.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          active_session: null
        }
      });
    }
    
    const session = activeSession.rows[0];
    const startTime = new Date(session.created_at);
    const now = new Date();
    const elapsedMinutes = Math.round((now - startTime) / (1000 * 60));
    
    res.json({
      success: true,
      data: {
        active_session: {
          ...session,
          elapsed_minutes: elapsedMinutes,
          remaining_minutes: Math.max(0, session.duration_minutes - elapsedMinutes)
        }
      }
    });
  } catch (error) {
    console.error('Active session fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active session'
    });
  }
});

// Update session notes (for active sessions)
router.patch('/:id/notes', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    if (!notes) {
      return res.status(400).json({
        success: false,
        error: 'Notes are required'
      });
    }
    
    const updatedSession = await pool.query(`
      UPDATE focus_sessions 
      SET notes = $1
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `, [notes, id, req.user.id]);
    
    if (updatedSession.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Session notes updated successfully',
      data: {
        session: updatedSession.rows[0]
      }
    });
  } catch (error) {
    console.error('Session notes update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update session notes'
    });
  }
});

// Helper function to check for focus-related achievements
const checkFocusAchievements = async (userId) => {
  const achievements = [];
  
  try {
    // Check for "Focus Champion" achievement (10 completed sessions)
    const sessionCount = await pool.query(
      'SELECT COUNT(*) as count FROM focus_sessions WHERE user_id = $1 AND completed = true',
      [userId]
    );
    
    if (parseInt(sessionCount.rows[0].count) >= 10) {
      const focusChampionAchievement = await pool.query(`
        SELECT a.* FROM achievements a
        WHERE a.name = 'Focus Champion' 
        AND NOT EXISTS (
          SELECT 1 FROM user_achievements ua 
          WHERE ua.user_id = $1 AND ua.achievement_id = a.id
        )
      `, [userId]);
      
      if (focusChampionAchievement.rows.length > 0) {
        const achievement = focusChampionAchievement.rows[0];
        await pool.query(
          'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2)',
          [userId, achievement.id]
        );
        achievements.push(achievement);
      }
    }
    
    // Check for perfect session streak
    const perfectSessions = await pool.query(`
      SELECT COUNT(*) as count 
      FROM focus_sessions 
      WHERE user_id = $1 AND completed = true AND interruptions = 0
      AND created_at >= NOW() - INTERVAL '7 days'
    `, [userId]);
    
    if (parseInt(perfectSessions.rows[0].count) >= 5) {
      const perfectionistAchievement = await pool.query(`
        SELECT a.* FROM achievements a
        WHERE a.name LIKE '%Perfect%' 
        AND NOT EXISTS (
          SELECT 1 FROM user_achievements ua 
          WHERE ua.user_id = $1 AND ua.achievement_id = a.id
        )
        LIMIT 1
      `, [userId]);
      
      if (perfectionistAchievement.rows.length > 0) {
        const achievement = perfectionistAchievement.rows[0];
        await pool.query(
          'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2)',
          [userId, achievement.id]
        );
        achievements.push(achievement);
      }
    }
  } catch (error) {
    console.error('Focus achievement check error:', error);
  }
  
  return achievements;
};

module.exports = router;