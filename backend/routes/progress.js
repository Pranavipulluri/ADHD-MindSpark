const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { validateQuery, dateRangeSchema } = require('../middleware/validation');
const { USER_LEVELS, POINTS } = require('../utils/constants');

const router = express.Router();

// Get user's overall progress summary
router.get('/', authenticateToken, validateQuery(dateRangeSchema), async (req, res) => {
  try {
    const { days = 30, start_date, end_date } = req.validatedQuery;
    
    let dateFilter = '';
    let dateParams = [];
    
    if (start_date && end_date) {
      dateFilter = 'AND pr.created_at BETWEEN $2 AND $3';
      dateParams = [start_date, end_date];
    } else {
      dateFilter = `AND pr.created_at >= NOW() - INTERVAL '${days} days'`;
    }
    
    // Get progress records summary
    const progressSummary = await pool.query(`
      SELECT 
        pr.activity_type,
        COUNT(*) as activity_count,
        SUM(pr.points_earned) as total_points,
        AVG(pr.duration_minutes) FILTER (WHERE pr.duration_minutes IS NOT NULL) as avg_duration
      FROM progress_records pr
      WHERE pr.user_id = $1 ${dateFilter}
      GROUP BY pr.activity_type
      ORDER BY total_points DESC
    `, [req.user.id, ...dateParams]);
    
    // Get daily activity breakdown
    const dailyActivity = await pool.query(`
      SELECT 
        DATE(pr.created_at) as activity_date,
        COUNT(*) as total_activities,
        SUM(pr.points_earned) as daily_points,
        COUNT(DISTINCT pr.activity_type) as activity_types,
        json_object_agg(pr.activity_type, COUNT(*)) as activity_breakdown
      FROM progress_records pr
      WHERE pr.user_id = $1 ${dateFilter}
      GROUP BY DATE(pr.created_at)
      ORDER BY activity_date DESC
    `, [req.user.id, ...dateParams]);
    
    // Get user achievements
    const achievements = await pool.query(`
      SELECT ua.earned_at, a.name, a.description, a.icon, a.badge_color, a.points_required
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = $1
      ORDER BY ua.earned_at DESC
    `, [req.user.id]);
    
    // Get current user level info
    const userProfile = await pool.query(
      'SELECT points, level, streak_days FROM profiles WHERE id = $1',
      [req.user.id]
    );
    
    const currentPoints = userProfile.rows[0]?.points || 0;
    const currentLevel = userProfile.rows[0]?.level || 1;
    const streakDays = userProfile.rows[0]?.streak_days || 0;
    
    // Calculate level progress
    const levelInfo = USER_LEVELS[currentLevel] || USER_LEVELS[1];
    const nextLevelInfo = USER_LEVELS[currentLevel + 1];
    const progressToNextLevel = nextLevelInfo ? 
      Math.min(100, ((currentPoints - levelInfo.min_points) / (nextLevelInfo.min_points - levelInfo.min_points)) * 100) : 100;
    
    // Get recent milestones
    const recentMilestones = await pool.query(`
      SELECT 
        'achievement' as type,
        a.name as title,
        a.description,
        ua.earned_at as date,
        a.points_required as value
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = $1 AND ua.earned_at >= NOW() - INTERVAL '7 days'
      
      UNION ALL
      
      SELECT 
        'level_up' as type,
        'Level Up!' as title,
        CONCAT('Reached level ', level) as description,
        updated_at as date,
        points as value
      FROM profiles
      WHERE id = $1 AND updated_at >= NOW() - INTERVAL '7 days'
      
      ORDER BY date DESC
      LIMIT 5
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: {
        progress_summary: progressSummary.rows,
        daily_activity: dailyActivity.rows,
        achievements: achievements.rows,
        level_info: {
          current_level: currentLevel,
          current_level_title: levelInfo.title,
          current_points: currentPoints,
          points_to_next_level: nextLevelInfo ? nextLevelInfo.min_points - currentPoints : 0,
          progress_percentage: Math.round(progressToNextLevel),
          next_level_title: nextLevelInfo?.title || 'Max Level'
        },
        streak_info: {
          current_streak: streakDays,
          longest_streak: streakDays // This could be tracked separately
        },
        recent_milestones: recentMilestones.rows
      }
    });
  } catch (error) {
    console.error('Progress fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch progress data',
      message: 'An error occurred while retrieving your progress information'
    });
  }
});

// Get detailed activity breakdown
router.get('/activities', authenticateToken, validateQuery(dateRangeSchema), async (req, res) => {
  try {
    const { activity_type, days = 30 } = req.query;
    
    let query = `
      SELECT 
        pr.*,
        CASE 
          WHEN pr.activity_type = 'task' THEN t.title
          WHEN pr.activity_type = 'game' THEN g.name
          WHEN pr.activity_type = 'mood' THEN 'Mood Entry'
          WHEN pr.activity_type = 'focus_session' THEN CONCAT('Focus Session (', fs.session_type, ')')
          WHEN pr.activity_type = 'document' THEN d.title
          ELSE 'Activity'
        END as activity_title,
        CASE 
          WHEN pr.activity_type = 'task' THEN t.status
          WHEN pr.activity_type = 'focus_session' THEN CASE WHEN fs.completed THEN 'completed' ELSE 'active' END
          ELSE NULL
        END as activity_status
      FROM progress_records pr
      LEFT JOIN tasks t ON pr.activity_type = 'task' AND pr.activity_id::uuid = t.id
      LEFT JOIN games g ON pr.activity_type = 'game' AND EXISTS (
        SELECT 1 FROM game_scores gs WHERE gs.id::text = pr.activity_id AND gs.game_id = g.id
      )
      LEFT JOIN focus_sessions fs ON pr.activity_type = 'focus_session' AND pr.activity_id::uuid = fs.id
      LEFT JOIN documents d ON pr.activity_type = 'document' AND pr.activity_id::uuid = d.id
      WHERE pr.user_id = $1 AND pr.created_at >= NOW() - INTERVAL '${days} days'
    `;
    
    let params = [req.user.id];
    
    if (activity_type) {
      query += ' AND pr.activity_type = $2';
      params.push(activity_type);
    }
    
    query += ' ORDER BY pr.created_at DESC LIMIT 100';
    
    const activities = await pool.query(query, params);
    
    // Get activity statistics
    const stats = await pool.query(`
      SELECT 
        activity_type,
        COUNT(*) as count,
        SUM(points_earned) as total_points,
        AVG(points_earned) as avg_points,
        MAX(created_at) as last_activity
      FROM progress_records
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
      ${activity_type ? 'AND activity_type = $2' : ''}
      GROUP BY activity_type
      ORDER BY total_points DESC
    `, activity_type ? [req.user.id, activity_type] : [req.user.id]);
    
    res.json({
      success: true,
      data: {
        activities: activities.rows,
        statistics: stats.rows
      }
    });
  } catch (error) {
    console.error('Activity breakdown error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity breakdown'
    });
  }
});

// Get achievements overview
router.get('/achievements', authenticateToken, async (req, res) => {
  try {
    const { status = 'all' } = req.query;
    
    let achievementQuery = `
      SELECT 
        a.*,
        ua.earned_at,
        CASE WHEN ua.user_id IS NOT NULL THEN true ELSE false END as is_earned
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
    `;
    
    if (status === 'earned') {
      achievementQuery += ' WHERE ua.user_id IS NOT NULL';
    } else if (status === 'available') {
      achievementQuery += ' WHERE ua.user_id IS NULL';
    }
    
    achievementQuery += ' ORDER BY a.points_required ASC, a.created_at ASC';
    
    const achievements = await pool.query(achievementQuery, [req.user.id]);
    
    // Calculate progress towards unearned achievements
    const achievementsWithProgress = await Promise.all(
      achievements.rows.map(async (achievement) => {
        if (achievement.is_earned) {
          return { ...achievement, progress_percentage: 100 };
        }
        
        // Calculate progress based on criteria
        const criteria = achievement.criteria || {};
        let progressPercentage = 0;
        
        try {
          if (criteria.activity_type && criteria.count) {
            const countResult = await pool.query(`
              SELECT COUNT(*) as current_count
              FROM progress_records
              WHERE user_id = $1 AND activity_type = $2
            `, [req.user.id, criteria.activity_type]);
            
            const currentCount = parseInt(countResult.rows[0]?.current_count || 0);
            progressPercentage = Math.min(100, (currentCount / criteria.count) * 100);
          } else if (criteria.total_points) {
            const userProfile = await pool.query('SELECT points FROM profiles WHERE id = $1', [req.user.id]);
            const currentPoints = userProfile.rows[0]?.points || 0;
            progressPercentage = Math.min(100, (currentPoints / criteria.total_points) * 100);
          } else if (criteria.streak_days) {
            const userProfile = await pool.query('SELECT streak_days FROM profiles WHERE id = $1', [req.user.id]);
            const currentStreak = userProfile.rows[0]?.streak_days || 0;
            progressPercentage = Math.min(100, (currentStreak / criteria.streak_days) * 100);
          }
        } catch (error) {
          console.error('Error calculating achievement progress:', error);
        }
        
        return { ...achievement, progress_percentage: Math.round(progressPercentage) };
      })
    );
    
    // Get achievement statistics
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_achievements,
        COUNT(*) FILTER (WHERE ua.user_id IS NOT NULL) as earned_achievements,
        COUNT(*) FILTER (WHERE ua.earned_at >= NOW() - INTERVAL '30 days') as recent_achievements
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: {
        achievements: achievementsWithProgress,
        statistics: stats.rows[0]
      }
    });
  } catch (error) {
    console.error('Achievements fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch achievements'
    });
  }
});

// Get learning analytics
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    // Get learning patterns
    const learningPatterns = await pool.query(`
      SELECT 
        EXTRACT(HOUR FROM pr.created_at) as hour_of_day,
        EXTRACT(DOW FROM pr.created_at) as day_of_week,
        COUNT(*) as activity_count,
        AVG(pr.points_earned) as avg_points
      FROM progress_records pr
      WHERE pr.user_id = $1 AND pr.created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY EXTRACT(HOUR FROM pr.created_at), EXTRACT(DOW FROM pr.created_at)
      ORDER BY activity_count DESC
    `, [req.user.id]);
    
    // Get productivity trends
    const productivityTrends = await pool.query(`
      SELECT 
        DATE(pr.created_at) as date,
        COUNT(*) as activities,
        SUM(pr.points_earned) as points,
        COUNT(DISTINCT pr.activity_type) as activity_variety,
        AVG(pr.duration_minutes) FILTER (WHERE pr.duration_minutes IS NOT NULL) as avg_session_length
      FROM progress_records pr
      WHERE pr.user_id = $1 AND pr.created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(pr.created_at)
      ORDER BY date
    `, [req.user.id]);
    
    // Get goal completion rates
    const goalCompletion = await pool.query(`
      SELECT 
        'tasks' as goal_type,
        COUNT(*) FILTER (WHERE t.status = 'done') as completed,
        COUNT(*) as total,
        ROUND(COUNT(*) FILTER (WHERE t.status = 'done') * 100.0 / NULLIF(COUNT(*), 0), 2) as completion_rate
      FROM tasks t
      WHERE t.user_id = $1 AND t.created_at >= NOW() - INTERVAL '${days} days'
      
      UNION ALL
      
      SELECT 
        'focus_sessions' as goal_type,
        COUNT(*) FILTER (WHERE fs.completed = true) as completed,
        COUNT(*) as total,
        ROUND(COUNT(*) FILTER (WHERE fs.completed = true) * 100.0 / NULLIF(COUNT(*), 0), 2) as completion_rate
      FROM focus_sessions fs
      WHERE fs.user_id = $1 AND fs.created_at >= NOW() - INTERVAL '${days} days'
    `, [req.user.id]);
    
    // Get improvement areas
    const improvementAreas = await pool.query(`
      SELECT 
        pr.activity_type,
        COUNT(*) as frequency,
        AVG(pr.points_earned) as avg_performance,
        STDDEV(pr.points_earned) as performance_consistency,
        DATE_TRUNC('week', pr.created_at) as week,
        AVG(pr.points_earned) as weekly_avg
      FROM progress_records pr
      WHERE pr.user_id = $1 AND pr.created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY pr.activity_type, DATE_TRUNC('week', pr.created_at)
      ORDER BY pr.activity_type, week DESC
    `, [req.user.id]);
    
    // Calculate insights
    const insights = [];
    
    // Most active time of day
    if (learningPatterns.rows.length > 0) {
      const mostActiveHour = learningPatterns.rows.reduce((prev, current) => 
        prev.activity_count > current.activity_count ? prev : current
      );
      
      insights.push({
        type: 'pattern',
        title: 'Peak Productivity Time',
        description: `You're most active at ${mostActiveHour.hour_of_day}:00`,
        value: mostActiveHour.hour_of_day,
        icon: '⏰'
      });
    }
    
    // Streak information
    const userProfile = await pool.query('SELECT streak_days FROM profiles WHERE id = $1', [req.user.id]);
    const currentStreak = userProfile.rows[0]?.streak_days || 0;
    
    if (currentStreak > 0) {
      insights.push({
        type: 'streak',
        title: 'Current Streak',
        description: `${currentStreak} days of consistent activity`,
        value: currentStreak,
        icon: '🔥'
      });
    }
    
    // Weekly progress comparison
    const thisWeekPoints = await pool.query(`
      SELECT COALESCE(SUM(points_earned), 0) as points
      FROM progress_records
      WHERE user_id = $1 AND created_at >= DATE_TRUNC('week', NOW())
    `, [req.user.id]);
    
    const lastWeekPoints = await pool.query(`
      SELECT COALESCE(SUM(points_earned), 0) as points
      FROM progress_records
      WHERE user_id = $1 
        AND created_at >= DATE_TRUNC('week', NOW()) - INTERVAL '1 week'
        AND created_at < DATE_TRUNC('week', NOW())
    `, [req.user.id]);
    
    const thisWeek = parseInt(thisWeekPoints.rows[0].points);
    const lastWeek = parseInt(lastWeekPoints.rows[0].points);
    
    if (lastWeek > 0) {
      const weeklyChange = ((thisWeek - lastWeek) / lastWeek) * 100;
      insights.push({
        type: 'trend',
        title: 'Weekly Progress',
        description: `${weeklyChange >= 0 ? '+' : ''}${Math.round(weeklyChange)}% vs last week`,
        value: weeklyChange,
        icon: weeklyChange >= 0 ? '📈' : '📉'
      });
    }
    
    res.json({
      success: true,
      data: {
        learning_patterns: learningPatterns.rows,
        productivity_trends: productivityTrends.rows,
        goal_completion: goalCompletion.rows,
        improvement_areas: improvementAreas.rows,
        insights
      }
    });
  } catch (error) {
    console.error('Progress analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate progress analytics'
    });
  }
});

// Get weekly progress report
router.get('/reports/weekly', authenticateToken, async (req, res) => {
  try {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of current week
    weekStart.setHours(0, 0, 0, 0);
    
    // Get weekly statistics
    const weeklyStats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE pr.activity_type = 'task') as tasks_completed,
        COUNT(*) FILTER (WHERE pr.activity_type = 'game') as games_played,
        COUNT(*) FILTER (WHERE pr.activity_type = 'focus_session') as focus_sessions,
        COUNT(*) FILTER (WHERE pr.activity_type = 'mood') as mood_entries,
        SUM(pr.points_earned) as total_points,
        COUNT(DISTINCT DATE(pr.created_at)) as active_days
      FROM progress_records pr
      WHERE pr.user_id = $1 AND pr.created_at >= $2
    `, [req.user.id, weekStart.toISOString()]);
    
    // Get daily breakdown
    const dailyBreakdown = await pool.query(`
      SELECT 
        DATE(pr.created_at) as date,
        COUNT(*) as activities,
        SUM(pr.points_earned) as points,
        json_object_agg(pr.activity_type, COUNT(*)) as activity_types
      FROM progress_records pr
      WHERE pr.user_id = $1 AND pr.created_at >= $2
      GROUP BY DATE(pr.created_at)
      ORDER BY date
    `, [req.user.id, weekStart.toISOString()]);
    
    // Get achievements earned this week
    const weeklyAchievements = await pool.query(`
      SELECT ua.earned_at, a.name, a.description, a.icon, a.badge_color
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = $1 AND ua.earned_at >= $2
      ORDER BY ua.earned_at DESC
    `, [req.user.id, weekStart.toISOString()]);
    
    // Calculate weekly goals progress
    const weeklyGoals = {
      tasks: { target: 5, achieved: weeklyStats.rows[0]?.tasks_completed || 0 },
      focus_sessions: { target: 3, achieved: weeklyStats.rows[0]?.focus_sessions || 0 },
      mood_entries: { target: 7, achieved: weeklyStats.rows[0]?.mood_entries || 0 },
      active_days: { target: 5, achieved: weeklyStats.rows[0]?.active_days || 0 }
    };
    
    // Generate weekly insights
    const weeklyInsights = [];
    
    const stats = weeklyStats.rows[0];
    if (stats) {
      if (stats.active_days >= 5) {
        weeklyInsights.push("Great job staying consistent this week! 🎉");
      }
      
      if (stats.focus_sessions >= 3) {
        weeklyInsights.push("You've been focused and productive! 🎯");
      }
      
      if (stats.mood_entries >= 5) {
        weeklyInsights.push("Thanks for tracking your mood regularly! 😊");
      }
      
      if (stats.total_points > 50) {
        weeklyInsights.push("You've earned lots of points this week! ⭐");
      }
    }
    
    res.json({
      success: true,
      data: {
        week_period: {
          start: weekStart.toISOString(),
          end: new Date().toISOString()
        },
        statistics: weeklyStats.rows[0],
        daily_breakdown: dailyBreakdown.rows,
        achievements: weeklyAchievements.rows,
        weekly_goals: weeklyGoals,
        insights: weeklyInsights
      }
    });
  } catch (error) {
    console.error('Weekly report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate weekly report'
    });
  }
});

// Get progress comparison with peers (anonymized)
router.get('/comparison', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    // Get user's statistics
    const userStats = await pool.query(`
      SELECT 
        SUM(points_earned) as total_points,
        COUNT(*) as total_activities,
        COUNT(DISTINCT activity_type) as activity_variety
      FROM progress_records
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
    `, [req.user.id]);
    
    // Get anonymized peer statistics (users at similar level)
    const userLevel = await pool.query('SELECT level FROM profiles WHERE id = $1', [req.user.id]);
    const currentLevel = userLevel.rows[0]?.level || 1;
    
    const peerStats = await pool.query(`
      SELECT 
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY user_points) as p25,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY user_points) as p50,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY user_points) as p75,
        AVG(user_activities) as avg_activities,
        AVG(user_variety) as avg_variety
      FROM (
        SELECT 
          pr.user_id,
          SUM(pr.points_earned) as user_points,
          COUNT(*) as user_activities,
          COUNT(DISTINCT pr.activity_type) as user_variety
        FROM progress_records pr
        JOIN profiles p ON pr.user_id = p.id
        WHERE p.level BETWEEN $1 AND $2
          AND pr.created_at >= NOW() - INTERVAL '${days} days'
          AND pr.user_id != $3
        GROUP BY pr.user_id
        HAVING COUNT(*) >= 3
      ) peer_data
    `, [Math.max(1, currentLevel - 1), currentLevel + 1, req.user.id]);
    
    const userTotalPoints = parseInt(userStats.rows[0]?.total_points || 0);
    const peerData = peerStats.rows[0];
    
    let percentile = 50; // Default
    if (peerData && peerData.p50) {
      if (userTotalPoints >= peerData.p75) percentile = 75;
      else if (userTotalPoints >= peerData.p50) percentile = 60;
      else if (userTotalPoints >= peerData.p25) percentile = 40;
      else percentile = 25;
    }
    
    res.json({
      success: true,
      data: {
        user_stats: userStats.rows[0],
        peer_comparison: {
          percentile,
          peer_stats: peerData
        },
        insights: [
          percentile >= 75 ? "You're in the top 25% of users at your level! 🌟" :
          percentile >= 50 ? "You're performing above average! 📈" :
          "Keep going! There's room for improvement! 💪"
        ]
      }
    });
  } catch (error) {
    console.error('Progress comparison error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate progress comparison'
    });
  }
});

module.exports = router;