// services/progressService.js
const { Pool } = require('pg');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');
const achievementService = require('./achievementService');

class ProgressService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  // Calculate user's overall progress
  async calculateUserProgress(userId, timeframe = '30d') {
    try {
      const timeframeMap = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365
      };

      const days = timeframeMap[timeframe] || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get task completion stats
      const taskStats = await this.pool.query(`
        SELECT 
          COUNT(*) as total_tasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
          AVG(CASE WHEN status = 'completed' AND completed_at IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (completed_at - assigned_at)) / 3600 
              ELSE NULL END) as avg_completion_time_hours
        FROM user_tasks 
        WHERE user_id = $1 AND assigned_at >= $2
      `, [userId, startDate]);

      // Get game performance stats
      const gameStats = await this.pool.query(`
        SELECT 
          COUNT(*) as games_played,
          AVG(score) as avg_score,
          AVG(accuracy_percentage) as avg_accuracy,
          MAX(level_reached) as max_level,
          SUM(points_earned) as total_points_earned
        FROM game_scores 
        WHERE user_id = $1 AND played_at >= $2
      `, [userId, startDate]);

      // Get mood tracking consistency
      const moodStats = await this.pool.query(`
        SELECT 
          COUNT(DISTINCT DATE(created_at)) as mood_tracking_days,
          AVG(mood_intensity) as avg_mood_intensity,
          mode() WITHIN GROUP (ORDER BY mood_type) as most_common_mood
        FROM mood_entries 
        WHERE user_id = $1 AND created_at >= $2
      `, [userId, startDate]);

      // Get focus session stats
      const focusStats = await this.pool.query(`
        SELECT 
          COUNT(*) as total_sessions,
          SUM(duration_minutes) as total_focus_minutes,
          AVG(duration_minutes) as avg_session_duration,
          AVG(quality_rating) as avg_quality_rating
        FROM focus_sessions 
        WHERE user_id = $1 AND created_at >= $2 AND status = 'completed'
      `, [userId, startDate]);

      // Calculate progress scores
      const taskCompletionRate = taskStats.rows[0].total_tasks > 0 ? 
        (taskStats.rows[0].completed_tasks / taskStats.rows[0].total_tasks) * 100 : 0;

      const moodTrackingConsistency = (moodStats.rows[0].mood_tracking_days / days) * 100;

      const gamePerformanceScore = this.calculateGamePerformanceScore(gameStats.rows[0]);

      const focusConsistency = focusStats.rows[0].total_sessions > 0 ? 
        Math.min((focusStats.rows[0].total_sessions / days) * 100, 100) : 0;

      // Overall progress score (weighted average)
      const overallScore = (
        taskCompletionRate * 0.3 +
        moodTrackingConsistency * 0.2 +
        gamePerformanceScore * 0.3 +
        focusConsistency * 0.2
      );

      return {
        timeframe,
        overallScore: Math.round(overallScore),
        taskCompletion: {
          rate: Math.round(taskCompletionRate),
          totalTasks: parseInt(taskStats.rows[0].total_tasks),
          completedTasks: parseInt(taskStats.rows[0].completed_tasks),
          avgCompletionTime: parseFloat(taskStats.rows[0].avg_completion_time_hours) || 0
        },
        gamePerformance: {
          score: Math.round(gamePerformanceScore),
          gamesPlayed: parseInt(gameStats.rows[0].games_played) || 0,
          avgScore: Math.round(parseFloat(gameStats.rows[0].avg_score) || 0),
          avgAccuracy: Math.round(parseFloat(gameStats.rows[0].avg_accuracy) || 0),
          maxLevel: parseInt(gameStats.rows[0].max_level) || 0,
          totalPoints: parseInt(gameStats.rows[0].total_points_earned) || 0
        },
        moodTracking: {
          consistency: Math.round(moodTrackingConsistency),
          trackingDays: parseInt(moodStats.rows[0].mood_tracking_days) || 0,
          avgIntensity: Math.round(parseFloat(moodStats.rows[0].avg_mood_intensity) || 0),
          mostCommonMood: moodStats.rows[0].most_common_mood || 'unknown'
        },
        focusSessions: {
          consistency: Math.round(focusConsistency),
          totalSessions: parseInt(focusStats.rows[0].total_sessions) || 0,
          totalMinutes: parseInt(focusStats.rows[0].total_focus_minutes) || 0,
          avgDuration: Math.round(parseFloat(focusStats.rows[0].avg_session_duration) || 0),
          avgQuality: Math.round(parseFloat(focusStats.rows[0].avg_quality_rating) || 0)
        }
      };

    } catch (error) {
      logger.error('Error calculating user progress:', error);
      throw error;
    }
  }

  // Calculate game performance score
  calculateGamePerformanceScore(gameStats) {
    if (!gameStats.games_played || gameStats.games_played === 0) return 0;

    const scoreWeight = 0.4;
    const accuracyWeight = 0.4;
    const consistencyWeight = 0.2;

    // Normalize scores (assuming max score is around 1000)
    const normalizedScore = Math.min((gameStats.avg_score || 0) / 1000 * 100, 100);
    const accuracyScore = gameStats.avg_accuracy || 0;
    const consistencyScore = Math.min(gameStats.games_played * 5, 100); // 5 points per game, max 100

    return (
      normalizedScore * scoreWeight +
      accuracyScore * accuracyWeight +
      consistencyScore * consistencyWeight
    );
  }

  // Get progress trends over time
  async getProgressTrends(userId, timeframe = '30d') {
    try {
      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get daily task completion trends
      const taskTrends = await this.pool.query(`
        SELECT 
          DATE(completed_at) as date,
          COUNT(*) as completed_tasks
        FROM user_tasks 
        WHERE user_id = $1 AND status = 'completed' AND completed_at >= $2
        GROUP BY DATE(completed_at)
        ORDER BY date
      `, [userId, startDate]);

      // Get daily mood trends
      const moodTrends = await this.pool.query(`
        SELECT 
          DATE(created_at) as date,
          AVG(mood_intensity) as avg_mood,
          COUNT(*) as mood_entries
        FROM mood_entries 
        WHERE user_id = $1 AND created_at >= $2
        GROUP BY DATE(created_at)
        ORDER BY date
      `, [userId, startDate]);

      // Get daily game performance trends
      const gameTrends = await this.pool.query(`
        SELECT 
          DATE(played_at) as date,
          AVG(score) as avg_score,
          AVG(accuracy_percentage) as avg_accuracy,
          COUNT(*) as games_played
        FROM game_scores 
        WHERE user_id = $1 AND played_at >= $2
        GROUP BY DATE(played_at)
        ORDER BY date
      `, [userId, startDate]);

      return {
        taskTrends: taskTrends.rows,
        moodTrends: moodTrends.rows,
        gameTrends: gameTrends.rows
      };

    } catch (error) {
      logger.error('Error getting progress trends:', error);
      throw error;
    }
  }

  // Update user level and send notifications
  async updateUserLevel(userId) {
    try {
      const user = await this.pool.query(
        'SELECT points, level, email FROM profiles WHERE id = $1',
        [userId]
      );

      if (user.rows.length === 0) return;

      const currentPoints = user.rows[0].points;
      const currentLevel = user.rows[0].level;
      const userEmail = user.rows[0].email;

      // Calculate new level (every 100 points = 1 level)
      const newLevel = Math.floor(currentPoints / 100) + 1;

      if (newLevel > currentLevel) {
        // Update user level
        await this.pool.query(
          'UPDATE profiles SET level = $1, updated_at = NOW() WHERE id = $2',
          [newLevel, userId]
        );

        // Send level up notification
        await notificationService.sendLevelUpNotification(userId, userEmail, newLevel);

        // Check for level-based achievements
        await achievementService.checkLevelAchievements(userId, newLevel);

        logger.info(`User ${userId} leveled up to level ${newLevel}`);
      }

      return newLevel;

    } catch (error) {
      logger.error('Error updating user level:', error);
      throw error;
    }
  }

  // Update user streak and send notifications
  async updateUserStreak(userId) {
    try {
      // Get user's last activity and current streak
      const user = await this.pool.query(
        'SELECT last_activity, streak_days, email FROM profiles WHERE id = $1',
        [userId]
      );

      if (user.rows.length === 0) return;

      const lastActivity = new Date(user.rows[0].last_activity);
      const currentStreak = user.rows[0].streak_days;
      const userEmail = user.rows[0].email;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastActivityDate = new Date(lastActivity.getFullYear(), lastActivity.getMonth(), lastActivity.getDate());

      let newStreak = currentStreak;

      // Check if activity was yesterday (continue streak) or today (maintain streak)
      const daysDiff = Math.floor((today - lastActivityDate) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1) {
        // Activity was yesterday, increment streak
        newStreak = currentStreak + 1;
      } else if (daysDiff > 1) {
        // Activity gap > 1 day, reset streak
        newStreak = 1;
      }
      // If daysDiff === 0, keep current streak (same day activity)

      // Update streak and last activity
      await this.pool.query(
        'UPDATE profiles SET streak_days = $1, last_activity = NOW(), updated_at = NOW() WHERE id = $2',
        [newStreak, userId]
      );

      // Send streak milestone notifications
      if (newStreak > currentStreak && (newStreak === 7 || newStreak === 30 || newStreak === 100 || newStreak % 7 === 0)) {
        await notificationService.sendStreakMilestone(userId, userEmail, newStreak);
      }

      // Check for streak-based achievements
      await achievementService.checkStreakAchievements(userId, newStreak);

      return newStreak;

    } catch (error) {
      logger.error('Error updating user streak:', error);
      throw error;
    }
  }

  // Generate weekly progress report
  async generateWeeklyReport(userId) {
    try {
      const progress = await this.calculateUserProgress(userId, '7d');
      const trends = await this.getProgressTrends(userId, '7d');

      const report = {
        weekPeriod: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        },
        summary: {
          overallScore: progress.overallScore,
          completedTasks: progress.taskCompletion.completedTasks,
          pointsEarned: progress.gamePerformance.totalPoints,
          focusMinutes: progress.focusSessions.totalMinutes,
          moodTrackingDays: progress.moodTracking.trackingDays
        },
        achievements: {
          taskCompletion: progress.taskCompletion.rate >= 80 ? 'excellent' : progress.taskCompletion.rate >= 60 ? 'good' : 'needs_improvement',
          consistency: progress.moodTracking.consistency >= 80 ? 'excellent' : progress.moodTracking.consistency >= 60 ? 'good' : 'needs_improvement',
          focus: progress.focusSessions.consistency >= 80 ? 'excellent' : progress.focusSessions.consistency >= 60 ? 'good' : 'needs_improvement'
        },
        trends: trends,
        recommendations: this.generateRecommendations(progress)
      };

      return report;

    } catch (error) {
      logger.error('Error generating weekly report:', error);
      throw error;
    }
  }

  // Generate personalized recommendations
  generateRecommendations(progress) {
    const recommendations = [];

    if (progress.taskCompletion.rate < 70) {
      recommendations.push({
        type: 'task_management',
        title: 'Improve Task Completion',
        message: 'Try breaking large tasks into smaller, manageable chunks.',
        priority: 'high'
      });
    }

    if (progress.moodTracking.consistency < 50) {
      recommendations.push({
        type: 'mood_tracking',
        title: 'Track Your Mood Daily',
        message: 'Regular mood tracking helps identify patterns and triggers.',
        priority: 'medium'
      });
    }

    if (progress.focusSessions.totalSessions < 5) {
      recommendations.push({
        type: 'focus_practice',
        title: 'Practice Focus Exercises',
        message: 'Try to complete at least one focus session per day.',
        priority: 'high'
      });
    }

    if (progress.gamePerformance.avgAccuracy < 70) {
      recommendations.push({
        type: 'game_practice',
        title: 'Focus on Accuracy',
        message: 'Take your time with games to improve accuracy over speed.',
        priority: 'low'
      });
    }

    return recommendations;
  }
}

module.exports = new ProgressService();
