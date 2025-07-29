const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validate, gameScoreSchema, validateQuery, paginationSchema } = require('../middleware/validation');

const router = express.Router();

// Get all available games (public endpoint)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, difficulty } = req.query;
    
    let query = 'SELECT * FROM games WHERE 1=1';
    let params = [];
    let paramCount = 0;
    
    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(category);
    }
    
    if (difficulty) {
      paramCount++;
      query += ` AND difficulty_level = $${paramCount}`;
      params.push(parseInt(difficulty));
    }
    
    query += ' ORDER BY name';
    
    const games = await pool.query(query, params);
    
    // If user is authenticated, include their best scores
    let gamesWithScores = games.rows;
    if (req.user) {
      const userScores = await pool.query(`
        SELECT 
          game_id,
          MAX(score) as best_score,
          MAX(level_reached) as best_level,
          COUNT(*) as play_count
        FROM game_scores 
        WHERE user_id = $1
        GROUP BY game_id
      `, [req.user.id]);
      
      const scoresMap = userScores.rows.reduce((acc, score) => {
        acc[score.game_id] = {
          best_score: score.best_score,
          best_level: score.best_level,
          play_count: parseInt(score.play_count)
        };
        return acc;
      }, {});
      
      gamesWithScores = games.rows.map(game => ({
        ...game,
        user_stats: scoresMap[game.id] || null
      }));
    }
    
    res.json({
      success: true,
      data: {
        games: gamesWithScores
      }
    });
  } catch (error) {
    console.error('Games fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch games',
      message: 'An error occurred while retrieving games'
    });
  }
});

// Get game by ID
router.get('/:gameId', optionalAuth, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const game = await pool.query('SELECT * FROM games WHERE id = $1', [gameId]);
    
    if (game.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Game not found',
        message: 'The requested game could not be found'
      });
    }
    
    let gameData = game.rows[0];
    
    // Add user statistics if authenticated
    if (req.user) {
      const userStats = await pool.query(`
        SELECT 
          MAX(score) as best_score,
          MIN(score) as lowest_score,
          AVG(score) as average_score,
          MAX(level_reached) as best_level,
          MAX(accuracy_percentage) as best_accuracy,
          COUNT(*) as play_count,
          MAX(created_at) as last_played
        FROM game_scores 
        WHERE user_id = $1 AND game_id = $2
      `, [req.user.id, gameId]);
      
      gameData.user_stats = userStats.rows[0];
    }
    
    // Get leaderboard (top 10 scores)
    const leaderboard = await pool.query(`
      SELECT 
        gs.score,
        gs.level_reached,
        gs.accuracy_percentage,
        gs.created_at,
        p.username,
        p.avatar_url
      FROM game_scores gs
      JOIN profiles p ON gs.user_id = p.id
      WHERE gs.game_id = $1
      ORDER BY gs.score DESC
      LIMIT 10
    `, [gameId]);
    
    gameData.leaderboard = leaderboard.rows;
    
    res.json({
      success: true,
      data: {
        game: gameData
      }
    });
  } catch (error) {
    console.error('Game fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game'
    });
  }
});

// Submit game score
router.post('/:gameId/scores', authenticateToken, validate(gameScoreSchema), async (req, res) => {
  try {
    const { gameId } = req.params;
    const { score, completion_time, accuracy_percentage, level_reached } = req.validatedData;
    
    // Verify game exists
    const game = await pool.query('SELECT * FROM games WHERE id = $1', [gameId]);
    if (game.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Game not found',
        message: 'The specified game could not be found'
      });
    }
    
    const gameData = game.rows[0];
    
    // Calculate points based on score and game difficulty
    let pointsEarned = gameData.points_per_completion;
    
    // Bonus points for high accuracy
    if (accuracy_percentage && accuracy_percentage >= 90) {
      pointsEarned = Math.round(pointsEarned * 1.2);
    }
    
    // Bonus points for high levels
    if (level_reached && level_reached > 5) {
      pointsEarned = Math.round(pointsEarned * 1.1);
    }
    
    // Check for personal best
    const personalBest = await pool.query(
      'SELECT MAX(score) as best_score FROM game_scores WHERE user_id = $1 AND game_id = $2',
      [req.user.id, gameId]
    );
    
    const isPersonalBest = !personalBest.rows[0].best_score || score > personalBest.rows[0].best_score;
    
    if (isPersonalBest) {
      pointsEarned = Math.round(pointsEarned * 1.5); // 50% bonus for personal best
    }
    
    // Save game score
    const gameScore = await pool.query(`
      INSERT INTO game_scores (user_id, game_id, score, completion_time, accuracy_percentage, level_reached, points_earned)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [req.user.id, gameId, score, completion_time, accuracy_percentage, level_reached, pointsEarned]);
    
    // Update user points
    await pool.query(
      'UPDATE profiles SET points = points + $1 WHERE id = $2',
      [pointsEarned, req.user.id]
    );
    
    // Record progress
    await pool.query(`
      INSERT INTO progress_records (user_id, activity_type, activity_id, points_earned, progress_data)
      VALUES ($1, 'game', $2, $3, $4)
    `, [req.user.id, gameScore.rows[0].id, pointsEarned, JSON.stringify({
      game_name: gameData.name,
      score, 
      level_reached, 
      accuracy_percentage,
      is_personal_best: isPersonalBest
    })]);
    
    // Check for achievements
    const achievements = await checkGameAchievements(req.user.id, gameId, score, level_reached);
    
    res.status(201).json({
      success: true,
      message: isPersonalBest ? 'New personal best! 🎉' : 'Score recorded successfully',
      data: {
        game_score: gameScore.rows[0],
        points_earned: pointsEarned,
        is_personal_best: isPersonalBest,
        achievements_unlocked: achievements
      }
    });
  } catch (error) {
    console.error('Game score submission error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to submit score',
      message: 'An error occurred while recording your score'
    });
  }
});

// Get user's game scores
router.get('/scores/history', authenticateToken, validateQuery(paginationSchema), async (req, res) => {
  try {
    const { game_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT gs.*, g.name as game_name, g.category
      FROM game_scores gs
      JOIN games g ON gs.game_id = g.id
      WHERE gs.user_id = $1
    `;
    let params = [req.user.id];
    let paramCount = 1;
    
    if (game_id) {
      paramCount++;
      query += ` AND gs.game_id = $${paramCount}`;
      params.push(game_id);
    }
    
    query += ` ORDER BY gs.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    const scores = await pool.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM game_scores WHERE user_id = $1';
    let countParams = [req.user.id];
    
    if (game_id) {
      countQuery += ' AND game_id = $2';
      countParams.push(game_id);
    }
    
    const totalCount = await pool.query(countQuery, countParams);
    const total = parseInt(totalCount.rows[0].count);
    
    res.json({
      success: true,
      data: {
        scores: scores.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Game scores fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch game scores',
      message: 'An error occurred while retrieving your scores'
    });
  }
});

// Get leaderboard for a game
router.get('/:gameId/leaderboard', async (req, res) => {
  try {
    const { gameId } = req.params;
    const { limit = 50, timeframe = 'all' } = req.query;
    
    let query = `
      SELECT 
        gs.score,
        gs.level_reached,
        gs.accuracy_percentage,
        gs.created_at,
        p.username,
        p.avatar_url,
        RANK() OVER (ORDER BY gs.score DESC) as rank
      FROM game_scores gs
      JOIN profiles p ON gs.user_id = p.id
      WHERE gs.game_id = $1
    `;
    let params = [gameId];
    
    // Add timeframe filter
    if (timeframe === 'week') {
      query += ' AND gs.created_at >= NOW() - INTERVAL \'7 days\'';
    } else if (timeframe === 'month') {
      query += ' AND gs.created_at >= NOW() - INTERVAL \'30 days\'';
    }
    
    query += ` ORDER BY gs.score DESC LIMIT $2`;
    params.push(parseInt(limit));
    
    const leaderboard = await pool.query(query, params);
    
    res.json({
      success: true,
      data: {
        leaderboard: leaderboard.rows,
        timeframe,
        total_entries: leaderboard.rows.length
      }
    });
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard'
    });
  }
});

// Get game statistics
router.get('/:gameId/stats', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_plays,
        COUNT(DISTINCT user_id) as unique_players,
        MAX(score) as highest_score,
        AVG(score) as average_score,
        MAX(level_reached) as highest_level,
        AVG(accuracy_percentage) as average_accuracy
      FROM game_scores
      WHERE game_id = $1
    `, [gameId]);
    
    // Get play distribution by day
    const dailyPlays = await pool.query(`
      SELECT 
        DATE(created_at) as play_date,
        COUNT(*) as plays
      FROM game_scores
      WHERE game_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY play_date
    `, [gameId]);
    
    res.json({
      success: true,
      data: {
        game_stats: stats.rows[0],
        daily_plays: dailyPlays.rows
      }
    });
  } catch (error) {
    console.error('Game stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game statistics'
    });
  }
});

// Helper function to check for game achievements
const checkGameAchievements = async (userId, gameId, score, levelReached) => {
  const achievements = [];
  
  try {
    // Check for high score achievement
    if (score >= 1000) {
      const highScoreAchievement = await pool.query(`
        SELECT a.* FROM achievements a
        WHERE a.name = 'High Scorer' 
        AND NOT EXISTS (
          SELECT 1 FROM user_achievements ua 
          WHERE ua.user_id = $1 AND ua.achievement_id = a.id
        )
      `, [userId]);
      
      if (highScoreAchievement.rows.length > 0) {
        const achievement = highScoreAchievement.rows[0];
        await pool.query(
          'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2)',
          [userId, achievement.id]
        );
        achievements.push(achievement);
      }
    }
    
    // Check for game master achievement (play 10 games)
    const gameCount = await pool.query(
      'SELECT COUNT(DISTINCT game_id) as unique_games FROM game_scores WHERE user_id = $1',
      [userId]
    );
    
    if (gameCount.rows[0].unique_games >= 5) {
      const gameMasterAchievement = await pool.query(`
        SELECT a.* FROM achievements a
        WHERE a.name = 'Game Enthusiast' 
        AND NOT EXISTS (
          SELECT 1 FROM user_achievements ua 
          WHERE ua.user_id = $1 AND ua.achievement_id = a.id
        )
      `, [userId]);
      
      if (gameMasterAchievement.rows.length > 0) {
        const achievement = gameMasterAchievement.rows[0];
        await pool.query(
          'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2)',
          [userId, achievement.id]
        );
        achievements.push(achievement);
      }
    }
  } catch (error) {
    console.error('Achievement check error:', error);
  }
  
  return achievements;
};

module.exports = router;