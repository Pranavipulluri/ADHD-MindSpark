const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { validate, moodSchema, validateQuery, dateRangeSchema } = require('../middleware/validation');

const router = express.Router();

// Helper function to calculate points for mood tracking
const calculateMoodPoints = (intensity, isStreak = false) => {
  let basePoints = 2;
  if (intensity >= 4) basePoints += 1; // Bonus for positive moods
  if (isStreak) basePoints = Math.round(basePoints * 1.5); // Streak bonus
  return basePoints;
};

// Add mood entry
router.post('/', authenticateToken, validate(moodSchema), async (req, res) => {
  try {
    const { mood_type, mood_intensity, notes } = req.validatedData;
    
    // Check if user already logged mood today
    const todayEntry = await pool.query(`
      SELECT id FROM mood_entries 
      WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE
    `, [req.user.id]);
    
    const isFirstToday = todayEntry.rows.length === 0;
    
    // Create mood entry
    const moodEntry = await pool.query(`
      INSERT INTO mood_entries (user_id, mood_type, mood_intensity, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [req.user.id, mood_type, mood_intensity, notes]);
    
    // Calculate points (only for first entry of the day)
    let pointsEarned = 0;
    if (isFirstToday) {
      // Check for streak
      const recentEntries = await pool.query(`
        SELECT DATE(created_at) as entry_date
        FROM mood_entries
        WHERE user_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY entry_date DESC
      `, [req.user.id]);
      
      const hasStreak = recentEntries.rows.length >= 3;
      pointsEarned = calculateMoodPoints(mood_intensity, hasStreak);
      
      // Update user points
      await pool.query(
        'UPDATE profiles SET points = points + $1 WHERE id = $2',
        [pointsEarned, req.user.id]
      );
      
      // Record progress
      await pool.query(`
        INSERT INTO progress_records (user_id, activity_type, activity_id, points_earned, progress_data)
        VALUES ($1, 'mood', $2, $3, $4)
      `, [req.user.id, moodEntry.rows[0].id, pointsEarned, 
          JSON.stringify({ mood_type, mood_intensity, streak_bonus: hasStreak })]);
    }
    
    res.status(201).json({
      success: true,
      message: 'Mood entry created successfully',
      data: {
        mood_entry: moodEntry.rows[0],
        points_earned: pointsEarned,
        is_first_today: isFirstToday
      }
    });
  } catch (error) {
    console.error('Mood entry creation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create mood entry',
      message: 'An error occurred while saving your mood'
    });
  }
});

// Get mood history
router.get('/', authenticateToken, validateQuery(dateRangeSchema), async (req, res) => {
  try {
    const { days = 30, start_date, end_date } = req.validatedQuery;
    
    let query = `
      SELECT * FROM mood_entries
      WHERE user_id = $1
    `;
    let params = [req.user.id];
    
    if (start_date && end_date) {
      query += ' AND created_at BETWEEN $2 AND $3';
      params.push(start_date, end_date);
    } else {
      query += ` AND created_at >= NOW() - INTERVAL '${days} days'`;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const moodHistory = await pool.query(query, params);
    
    // Get mood statistics
    const statsQuery = `
      SELECT 
        mood_type,
        COUNT(*) as count,
        AVG(mood_intensity) as avg_intensity,
        MAX(created_at) as last_entry
      FROM mood_entries
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY mood_type
      ORDER BY count DESC
    `;
    
    const stats = await pool.query(statsQuery, [req.user.id]);
    
    // Calculate streak
    const streakQuery = `
      SELECT COUNT(DISTINCT DATE(created_at)) as streak_days
      FROM mood_entries
      WHERE user_id = $1 
      AND created_at >= (
        SELECT MAX(break_date) FROM (
          SELECT 
            DATE(created_at) as entry_date,
            LAG(DATE(created_at)) OVER (ORDER BY DATE(created_at)) as prev_date,
            CASE 
              WHEN DATE(created_at) - LAG(DATE(created_at)) OVER (ORDER BY DATE(created_at)) > 1 
              THEN DATE(created_at)
              ELSE NULL
            END as break_date
          FROM mood_entries
          WHERE user_id = $1
          GROUP BY DATE(created_at)
          ORDER BY entry_date DESC
        ) breaks
        WHERE break_date IS NOT NULL
        UNION ALL
        SELECT CURRENT_DATE - INTERVAL '30 days'
        LIMIT 1
      )
    `;
    
    const streakResult = await pool.query(streakQuery, [req.user.id]);
    
    res.json({
      success: true,
      data: {
        mood_history: moodHistory.rows,
        statistics: stats.rows,
        current_streak: streakResult.rows[0]?.streak_days || 0,
        total_entries: moodHistory.rows.length
      }
    });
  } catch (error) {
    console.error('Mood history fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch mood history',
      message: 'An error occurred while retrieving your mood data'
    });
  }
});

// Get mood entry by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const moodEntry = await pool.query(
      'SELECT * FROM mood_entries WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (moodEntry.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Mood entry not found',
        message: 'The requested mood entry could not be found'
      });
    }
    
    res.json({
      success: true,
      data: {
        mood_entry: moodEntry.rows[0]
      }
    });
  } catch (error) {
    console.error('Mood entry fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch mood entry'
    });
  }
});

// Update mood entry
router.put('/:id', authenticateToken, validate(moodSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { mood_type, mood_intensity, notes } = req.validatedData;
    
    const updatedEntry = await pool.query(`
      UPDATE mood_entries 
      SET mood_type = $1, mood_intensity = $2, notes = $3
      WHERE id = $4 AND user_id = $5
      RETURNING *
    `, [mood_type, mood_intensity, notes, id, req.user.id]);
    
    if (updatedEntry.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Mood entry not found',
        message: 'The mood entry could not be found or you do not have permission to edit it'
      });
    }
    
    res.json({
      success: true,
      message: 'Mood entry updated successfully',
      data: {
        mood_entry: updatedEntry.rows[0]
      }
    });
  } catch (error) {
    console.error('Mood entry update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update mood entry'
    });
  }
});

// Delete mood entry
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedEntry = await pool.query(
      'DELETE FROM mood_entries WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );
    
    if (deletedEntry.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Mood entry not found',
        message: 'The mood entry could not be found or you do not have permission to delete it'
      });
    }
    
    res.json({
      success: true,
      message: 'Mood entry deleted successfully'
    });
  } catch (error) {
    console.error('Mood entry deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete mood entry'
    });
  }
});

// Get mood insights and recommendations
router.get('/insights/analysis', authenticateToken, async (req, res) => {
  try {
    // Get mood patterns over the last 30 days
    const patternsQuery = `
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour_of_day,
        mood_type,
        AVG(mood_intensity) as avg_intensity,
        COUNT(*) as frequency
      FROM mood_entries
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY EXTRACT(HOUR FROM created_at), mood_type
      ORDER BY hour_of_day, frequency DESC
    `;
    
    const patterns = await pool.query(patternsQuery, [req.user.id]);
    
    // Get weekly trends
    const trendsQuery = `
      SELECT 
        DATE_TRUNC('week', created_at) as week_start,
        mood_type,
        AVG(mood_intensity) as avg_intensity,
        COUNT(*) as entries
      FROM mood_entries
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '8 weeks'
      GROUP BY DATE_TRUNC('week', created_at), mood_type
      ORDER BY week_start DESC
    `;
    
    const trends = await pool.query(trendsQuery, [req.user.id]);
    
    // Generate insights based on patterns
    const insights = [];
    
    // Most common mood
    const moodCounts = {};
    patterns.rows.forEach(row => {
      moodCounts[row.mood_type] = (moodCounts[row.mood_type] || 0) + parseInt(row.frequency);
    });
    
    const mostCommonMood = Object.keys(moodCounts).reduce((a, b) => 
      moodCounts[a] > moodCounts[b] ? a : b
    );
    
    if (mostCommonMood) {
      insights.push({
        type: 'pattern',
        title: 'Most Common Mood',
        description: `You feel ${mostCommonMood} most often`,
        icon: getMoodEmoji(mostCommonMood)
      });
    }
    
    res.json({
      success: true,
      data: {
        patterns: patterns.rows,
        trends: trends.rows,
        insights
      }
    });
  } catch (error) {
    console.error('Mood insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate mood insights'
    });
  }
});

// Helper function to get mood emoji
const getMoodEmoji = (mood) => {
  const emojiMap = {
    happy: '😊',
    excited: '😍',
    calm: '😌',
    worried: '😟',
    angry: '😠'
  };
  return emojiMap[mood] || '😐';
};

module.exports = router;