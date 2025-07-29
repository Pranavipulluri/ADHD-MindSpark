const { pool } = require('../config/database');
const { ACHIEVEMENT_CRITERIA } = require('../utils/constants');
const { logger } = require('../utils/logger');
const emailService = require('./emailService');

class AchievementService {
  constructor() {
    this.achievements = new Map();
    this.userProgress = new Map();
  }

  async initialize() {
    try {
      await this.loadAchievements();
      logger.info('Achievement service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize achievement service', error);
      throw error;
    }
  }

  async loadAchievements() {
    const result = await pool.query('SELECT * FROM achievements ORDER BY points_required ASC');
    
    this.achievements.clear();
    result.rows.forEach(achievement => {
      this.achievements.set(achievement.id, {
        ...achievement,
        criteria: typeof achievement.criteria === 'string' 
          ? JSON.parse(achievement.criteria) 
          : achievement.criteria
      });
    });

    logger.info(`Loaded ${this.achievements.size} achievements`);
  }

  async checkUserAchievements(userId) {
    try {
      const unlockedAchievements = [];

      // Get user's current achievements
      const userAchievements = await pool.query(
        'SELECT achievement_id FROM user_achievements WHERE user_id = $1',
        [userId]
      );
      
      const unlockedIds = new Set(userAchievements.rows.map(row => row.achievement_id));

      // Check each achievement
      for (const [achievementId, achievement] of this.achievements.entries()) {
        if (unlockedIds.has(achievementId)) continue;

        const isEligible = await this.checkAchievementCriteria(userId, achievement);
        
        if (isEligible) {
          await this.unlockAchievement(userId, achievementId);
          unlockedAchievements.push(achievement);
        }
      }

      return unlockedAchievements;
    } catch (error) {
      logger.error('Error checking user achievements', { error, user_id: userId });
      return [];
    }
  }

  async checkAchievementCriteria(userId, achievement) {
    const criteria = achievement.criteria;
    
    try {
      switch (criteria.type || this.inferCriteriaType(criteria)) {
        case ACHIEVEMENT_CRITERIA.TASK_COUNT:
          return await this.checkTaskCount(userId, criteria);
        
        case ACHIEVEMENT_CRITERIA.GAME_COUNT:
          return await this.checkGameCount(userId, criteria);
        
        case ACHIEVEMENT_CRITERIA.MOOD_STREAK:
          return await this.checkMoodStreak(userId, criteria);
        
        case ACHIEVEMENT_CRITERIA.FOCUS_SESSION_COUNT:
          return await this.checkFocusSessionCount(userId, criteria);
        
        case ACHIEVEMENT_CRITERIA.CHAT_MESSAGE_COUNT:
          return await this.checkChatMessageCount(userId, criteria);
        
        case ACHIEVEMENT_CRITERIA.DOCUMENT_COUNT:
          return await this.checkDocumentCount(userId, criteria);
        
        case ACHIEVEMENT_CRITERIA.HIGH_SCORE:
          return await this.checkHighScore(userId, criteria);
        
        case ACHIEVEMENT_CRITERIA.TOTAL_POINTS:
          return await this.checkTotalPoints(userId, criteria);
        
        case ACHIEVEMENT_CRITERIA.STREAK_DAYS:
          return await this.checkStreakDays(userId, criteria);
        
        default:
          logger.warn('Unknown achievement criteria type', { achievement_id: achievement.id, criteria });
          return false;
      }
    } catch (error) {
      logger.error('Error checking achievement criteria', { error, achievement_id: achievement.id });
      return false;
    }
  }

  inferCriteriaType(criteria) {
    if (criteria.activity_type === 'task' && criteria.count) return ACHIEVEMENT_CRITERIA.TASK_COUNT;
    if (criteria.activity_type === 'game' && criteria.count) return ACHIEVEMENT_CRITERIA.GAME_COUNT;
    if (criteria.activity_type === 'focus_session' && criteria.count) return ACHIEVEMENT_CRITERIA.FOCUS_SESSION_COUNT;
    if (criteria.activity_type === 'mood' && criteria.consecutive_days) return ACHIEVEMENT_CRITERIA.MOOD_STREAK;
    if (criteria.min_score) return ACHIEVEMENT_CRITERIA.HIGH_SCORE;
    if (criteria.total_points) return ACHIEVEMENT_CRITERIA.TOTAL_POINTS;
    if (criteria.streak_days) return ACHIEVEMENT_CRITERIA.STREAK_DAYS;
    
    return 'unknown';
  }

  async checkTaskCount(userId, criteria) {
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM progress_records 
      WHERE user_id = $1 AND activity_type = 'task'
      ${criteria.timeframe ? `AND created_at >= NOW() - INTERVAL '${criteria.timeframe}'` : ''}
    `, [userId]);
    
    return parseInt(result.rows[0].count) >= (criteria.count || criteria.task_count || 1);
  }

  async checkGameCount(userId, criteria) {
    if (criteria.unique_games) {
      // Check for playing unique games
      const result = await pool.query(`
        SELECT COUNT(DISTINCT gs.game_id) as unique_count
        FROM game_scores gs
        WHERE gs.user_id = $1
        ${criteria.timeframe ? `AND gs.created_at >= NOW() - INTERVAL '${criteria.timeframe}'` : ''}
      `, [userId]);
      
      return parseInt(result.rows[0].unique_count) >= criteria.unique_games;
    } else {
      // Check for total game plays
      const result = await pool.query(`
        SELECT COUNT(*) as count 
        FROM progress_records 
        WHERE user_id = $1 AND activity_type = 'game'
        ${criteria.timeframe ? `AND created_at >= NOW() - INTERVAL '${criteria.timeframe}'` : ''}
      `, [userId]);
      
      return parseInt(result.rows[0].count) >= (criteria.count || criteria.game_count || 1);
    }
  }

  async checkMoodStreak(userId, criteria) {
    const requiredDays = criteria.consecutive_days || criteria.streak_days || 7;
    
    const result = await pool.query(`
      WITH daily_moods AS (
        SELECT DATE(created_at) as mood_date
        FROM mood_entries
        WHERE user_id = $1
        GROUP BY DATE(created_at)
        ORDER BY mood_date DESC
      ),
      consecutive_days AS (
        SELECT mood_date,
               mood_date - ROW_NUMBER() OVER (ORDER BY mood_date DESC) * INTERVAL '1 day' as group_date
        FROM daily_moods
      )
      SELECT COUNT(*) as streak_length
      FROM consecutive_days
      GROUP BY group_date
      ORDER BY streak_length DESC
      LIMIT 1
    `, [userId]);
    
    const currentStreak = result.rows.length > 0 ? parseInt(result.rows[0].streak_length) : 0;
    return currentStreak >= requiredDays;
  }

  async checkFocusSessionCount(userId, criteria) {
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM focus_sessions 
      WHERE user_id = $1 AND completed = true
      ${criteria.timeframe ? `AND created_at >= NOW() - INTERVAL '${criteria.timeframe}'` : ''}
    `, [userId]);
    
    return parseInt(result.rows[0].count) >= (criteria.count || criteria.focus_session_count || 1);
  }

  async checkChatMessageCount(userId, criteria) {
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM chat_messages 
      WHERE user_id = $1
      ${criteria.timeframe ? `AND created_at >= NOW() - INTERVAL '${criteria.timeframe}'` : ''}
    `, [userId]);
    
    return parseInt(result.rows[0].count) >= (criteria.count || criteria.message_count || 1);
  }

  async checkDocumentCount(userId, criteria) {
    const result = await pool.query(`
      SELECT COUNT(*) as count 
      FROM documents 
      WHERE user_id = $1
      ${criteria.timeframe ? `AND created_at >= NOW() - INTERVAL '${criteria.timeframe}'` : ''}
    `, [userId]);
    
    return parseInt(result.rows[0].count) >= (criteria.count || criteria.document_count || 1);
  }

  async checkHighScore(userId, criteria) {
    const result = await pool.query(`
      SELECT MAX(score) as max_score 
      FROM game_scores 
      WHERE user_id = $1
      ${criteria.game_id ? 'AND game_id = $2' : ''}
    `, criteria.game_id ? [userId, criteria.game_id] : [userId]);
    
    const maxScore = result.rows[0]?.max_score || 0;
    return maxScore >= (criteria.min_score || criteria.score || 1000);
  }

  async checkTotalPoints(userId, criteria) {
    const result = await pool.query('SELECT points FROM profiles WHERE id = $1', [userId]);
    const currentPoints = result.rows[0]?.points || 0;
    
    return currentPoints >= (criteria.total_points || criteria.points || 100);
  }

  async checkStreakDays(userId, criteria) {
    const result = await pool.query('SELECT streak_days FROM profiles WHERE id = $1', [userId]);
    const currentStreak = result.rows[0]?.streak_days || 0;
    
    return currentStreak >= (criteria.streak_days || criteria.days || 7);
  }

  async unlockAchievement(userId, achievementId) {
    try {
      // Insert achievement
      await pool.query(
        'INSERT INTO user_achievements (user_id, achievement_id, earned_at) VALUES ($1, $2, NOW())',
        [userId, achievementId]
      );

      const achievement = this.achievements.get(achievementId);
      
      // Award points if specified
      if (achievement.points_required > 0) {
        await pool.query(
          'UPDATE profiles SET points = points + $1 WHERE id = $2',
          [achievement.points_required, userId]
        );
      }

      // Log the achievement
      logger.info('Achievement unlocked', {
        user_id: userId,
        achievement_id: achievementId,
        achievement_name: achievement.name,
        points_awarded: achievement.points_required
      });

      // Send notification email
      try {
        const user = await pool.query('SELECT email, username FROM profiles WHERE id = $1', [userId]);
        if (user.rows.length > 0) {
          await emailService.sendAchievementNotification(
            user.rows[0].email,
            user.rows[0].username,
            achievement
          );
        }
      } catch (emailError) {
        logger.warn('Failed to send achievement notification email', { error: emailError, user_id: userId });
      }

      return true;
    } catch (error) {
      logger.error('Failed to unlock achievement', { error, user_id: userId, achievement_id: achievementId });
      return false;
    }
  }

  async getUserAchievements(userId) {
    try {
      const result = await pool.query(`
        SELECT ua.earned_at, a.*
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.user_id = $1
        ORDER BY ua.earned_at DESC
      `, [userId]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get user achievements', { error, user_id: userId });
      return [];
    }
  }

  async getAchievementProgress(userId, achievementId) {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) return null;

    try {
      // Check if already unlocked
      const unlocked = await pool.query(
        'SELECT earned_at FROM user_achievements WHERE user_id = $1 AND achievement_id = $2',
        [userId, achievementId]
      );

      if (unlocked.rows.length > 0) {
        return {
          achievement,
          progress: 100,
          completed: true,
          earned_at: unlocked.rows[0].earned_at
        };
      }

      // Calculate progress based on criteria
      const progress = await this.calculateAchievementProgress(userId, achievement);
      
      return {
        achievement,
        progress,
        completed: false,
        earned_at: null
      };
    } catch (error) {
      logger.error('Failed to get achievement progress', { error, user_id: userId, achievement_id: achievementId });
      return null;
    }
  }

  async calculateAchievementProgress(userId, achievement) {
    const criteria = achievement.criteria;
    
    try {
      switch (criteria.type || this.inferCriteriaType(criteria)) {
        case ACHIEVEMENT_CRITERIA.TASK_COUNT: {
          const result = await pool.query(
            'SELECT COUNT(*) as count FROM progress_records WHERE user_id = $1 AND activity_type = \'task\'',
            [userId]
          );
          const current = parseInt(result.rows[0].count);
          const target = criteria.count || criteria.task_count || 1;
          return Math.min(100, Math.round((current / target) * 100));
        }

        case ACHIEVEMENT_CRITERIA.TOTAL_POINTS: {
          const result = await pool.query('SELECT points FROM profiles WHERE id = $1', [userId]);
          const current = result.rows[0]?.points || 0;
          const target = criteria.total_points || criteria.points || 100;
          return Math.min(100, Math.round((current / target) * 100));
        }

        case ACHIEVEMENT_CRITERIA.STREAK_DAYS: {
          const result = await pool.query('SELECT streak_days FROM profiles WHERE id = $1', [userId]);
          const current = result.rows[0]?.streak_days || 0;
          const target = criteria.streak_days || criteria.days || 7;
          return Math.min(100, Math.round((current / target) * 100));
        }

        case ACHIEVEMENT_CRITERIA.GAME_COUNT: {
          if (criteria.unique_games) {
            const result = await pool.query(
              'SELECT COUNT(DISTINCT game_id) as count FROM game_scores WHERE user_id = $1',
              [userId]
            );
            const current = parseInt(result.rows[0].count);
            const target = criteria.unique_games;
            return Math.min(100, Math.round((current / target) * 100));
          } else {
            const result = await pool.query(
              'SELECT COUNT(*) as count FROM progress_records WHERE user_id = $1 AND activity_type = \'game\'',
              [userId]
            );
            const current = parseInt(result.rows[0].count);
            const target = criteria.count || criteria.game_count || 1;
            return Math.min(100, Math.round((current / target) * 100));
          }
        }

        case ACHIEVEMENT_CRITERIA.HIGH_SCORE: {
          const result = await pool.query(
            'SELECT MAX(score) as max_score FROM game_scores WHERE user_id = $1',
            [userId]
          );
          const current = result.rows[0]?.max_score || 0;
          const target = criteria.min_score || criteria.score || 1000;
          return Math.min(100, Math.round((current / target) * 100));
        }

        default:
          return 0;
      }
    } catch (error) {
      logger.error('Error calculating achievement progress', { error, achievement_id: achievement.id });
      return 0;
    }
  }

  async getLeaderboard(achievementId, limit = 10) {
    try {
      const result = await pool.query(`
        SELECT ua.user_id, ua.earned_at, p.username, p.avatar_url, p.points, p.level
        FROM user_achievements ua
        JOIN profiles p ON ua.user_id = p.id
        WHERE ua.achievement_id = $1
        ORDER BY ua.earned_at ASC
        LIMIT $2
      `, [achievementId, limit]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to get achievement leaderboard', { error, achievement_id: achievementId });
      return [];
    }
  }

  async getAchievementStats() {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_achievements,
          COUNT(DISTINCT ua.user_id) as users_with_achievements,
          AVG(unlock_count.count) as avg_achievements_per_user
        FROM achievements a
        LEFT JOIN user_achievements ua ON a.id = ua.achievement_id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as count
          FROM user_achievements
          GROUP BY user_id
        ) unlock_count ON ua.user_id = unlock_count.user_id
      `);

      const popularAchievements = await pool.query(`
        SELECT a.name, a.description, COUNT(ua.user_id) as unlock_count
        FROM achievements a
        LEFT JOIN user_achievements ua ON a.id = ua.achievement_id
        GROUP BY a.id, a.name, a.description
        ORDER BY unlock_count DESC
        LIMIT 5
      `);

      return {
        overview: result.rows[0],
        popular_achievements: popularAchievements.rows
      };
    } catch (error) {
      logger.error('Failed to get achievement stats', error);
      return null;
    }
  }

  // Batch check achievements for multiple users (for cron jobs)
  async batchCheckAchievements(userIds) {
    const results = {};
    
    for (const userId of userIds) {
      try {
        const unlockedAchievements = await this.checkUserAchievements(userId);
        results[userId] = {
          success: true,
          unlocked_count: unlockedAchievements.length,
          achievements: unlockedAchievements
        };
      } catch (error) {
        results[userId] = {
          success: false,
          error: error.message
        };
        logger.error('Batch achievement check failed', { error, user_id: userId });
      }
    }

    return results;
  }

  // Trigger achievement check after specific actions
  async triggerAchievementCheck(userId, action, metadata = {}) {
    try {
      logger.debug('Triggering achievement check', { user_id: userId, action, metadata });
      
      const unlockedAchievements = await this.checkUserAchievements(userId);
      
      if (unlockedAchievements.length > 0) {
        logger.info('Achievements unlocked during trigger', {
          user_id: userId,
          action,
          unlocked_count: unlockedAchievements.length,
          achievements: unlockedAchievements.map(a => a.name)
        });
      }

      return unlockedAchievements;
    } catch (error) {
      logger.error('Achievement trigger failed', { error, user_id: userId, action });
      return [];
    }
  }

  async cleanup() {
    // Cleanup method for graceful shutdown
    this.achievements.clear();
    this.userProgress.clear();
    logger.info('Achievement service cleaned up');
  }
}

// Create singleton instance
const achievementService = new AchievementService();

module.exports = achievementService;