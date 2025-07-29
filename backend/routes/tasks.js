const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { validate, taskSchema, validateQuery, paginationSchema } = require('../middleware/validation');

const router = express.Router();

// Helper function to calculate task completion points
const calculateTaskPoints = (priority, completionTime = null) => {
  const basePoints = {
    low: 5,
    medium: 10,
    high: 15
  };
  
  let points = basePoints[priority?.toLowerCase()] || 10;
  
  // Bonus points for quick completion (within 24 hours)
  if (completionTime && completionTime < 24 * 60 * 60 * 1000) {
    points = Math.round(points * 1.2);
  }
  
  return points;
};

// Create new task
router.post('/', authenticateToken, validate(taskSchema), async (req, res) => {
  try {
    const { title, description, priority, status, due_date } = req.validatedData;
    
    const task = await pool.query(`
      INSERT INTO tasks (user_id, title, description, priority, due_date, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [req.user.id, title, description, priority || 'medium', due_date, status || 'must-do']);
    
    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: {
        task: task.rows[0]
      }
    });
  } catch (error) {
    console.error('Task creation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create task',
      message: 'An error occurred while creating the task'
    });
  }
});

// Get user's tasks
router.get('/', authenticateToken, validateQuery(paginationSchema), async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM tasks WHERE user_id = $1';
    let params = [req.user.id];
    let paramCount = 1;
    
    // Add filters
    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }
    
    if (priority) {
      paramCount++;
      query += ` AND priority = $${paramCount}`;
      params.push(priority);
    }
    
    // Add ordering and pagination
    query += ' ORDER BY created_at DESC LIMIT $' + (paramCount + 1) + ' OFFSET $' + (paramCount + 2);
    params.push(limit, offset);
    
    const tasks = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM tasks WHERE user_id = $1';
    let countParams = [req.user.id];
    
    if (status) {
      countQuery += ' AND status = $2';
      countParams.push(status);
    }
    if (priority && status) {
      countQuery += ' AND priority = $3';
      countParams.push(priority);
    } else if (priority) {
      countQuery += ' AND priority = $2';
      countParams.push(priority);
    }
    
    const totalCount = await pool.query(countQuery, countParams);
    const total = parseInt(totalCount.rows[0].count);
    
    // Get task statistics
    const stats = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM tasks 
      WHERE user_id = $1
      GROUP BY status
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: {
        tasks: tasks.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: parseInt(limit)
        },
        statistics: stats.rows.reduce((acc, stat) => {
          acc[stat.status.replace('-', '_')] = parseInt(stat.count);
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Tasks fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch tasks',
      message: 'An error occurred while retrieving tasks'
    });
  }
});

// Get task by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const task = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (task.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: 'The requested task could not be found'
      });
    }
    
    res.json({
      success: true,
      data: {
        task: task.rows[0]
      }
    });
  } catch (error) {
    console.error('Task fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task'
    });
  }
});

// Update task
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, status, due_date } = req.body;
    
    // Get current task data
    const currentTask = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (currentTask.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: 'The task could not be found or you do not have permission to edit it'
      });
    }
    
    const isCompletingTask = status === 'done' && currentTask.rows[0].status !== 'done';
    let pointsEarned = 0;
    
    const task = await pool.query(`
      UPDATE tasks 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          priority = COALESCE($3, priority),
          status = COALESCE($4, status),
          due_date = COALESCE($5, due_date),
          completed_at = CASE WHEN $4 = 'done' AND status != 'done' THEN NOW() ELSE completed_at END,
          points_earned = CASE WHEN $4 = 'done' AND status != 'done' THEN $6 ELSE points_earned END,
          updated_at = NOW()
      WHERE id = $7 AND user_id = $8
      RETURNING *
    `, [title, description, priority, status, due_date, 
        isCompletingTask ? calculateTaskPoints(priority || currentTask.rows[0].priority) : 0,
        id, req.user.id]);
    
    // Award points if task is being completed
    if (isCompletingTask) {
      const completionTime = Date.now() - new Date(currentTask.rows[0].created_at).getTime();
      pointsEarned = calculateTaskPoints(
        priority || currentTask.rows[0].priority, 
        completionTime
      );
      
      // Update user points
      await pool.query(
        'UPDATE profiles SET points = points + $1 WHERE id = $2',
        [pointsEarned, req.user.id]
      );
      
      // Record progress
      await pool.query(`
        INSERT INTO progress_records (user_id, activity_type, activity_id, points_earned, progress_data)
        VALUES ($1, 'task', $2, $3, $4)
      `, [req.user.id, id, pointsEarned, JSON.stringify({
        priority: priority || currentTask.rows[0].priority,
        completion_time_hours: Math.round(completionTime / (1000 * 60 * 60))
      })]);
    }
    
    res.json({
      success: true,
      message: isCompletingTask ? 'Task completed! Points awarded.' : 'Task updated successfully',
      data: {
        task: task.rows[0],
        points_earned: pointsEarned
      }
    });
  } catch (error) {
    console.error('Task update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task',
      message: 'An error occurred while updating the task'
    });
  }
});

// Delete task
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedTask = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, req.user.id]
    );
    
    if (deletedTask.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        message: 'The task could not be found or you do not have permission to delete it'
      });
    }
    
    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Task deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete task'
    });
  }
});

// Get task analytics
router.get('/analytics/summary', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    // Get completion rate
    const completionStats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'done') as completed_tasks,
        COUNT(*) as total_tasks,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'done') * 100.0 / NULLIF(COUNT(*), 0), 
          2
        ) as completion_rate
      FROM tasks
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
    `, [req.user.id]);
    
    // Get priority distribution
    const priorityStats = await pool.query(`
      SELECT 
        priority,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status = 'done') as completed
      FROM tasks
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY priority
    `, [req.user.id]);
    
    // Get daily completion trends
    const dailyTrends = await pool.query(`
      SELECT 
        DATE(completed_at) as completion_date,
        COUNT(*) as completed_count
      FROM tasks
      WHERE user_id = $1 
        AND status = 'done' 
        AND completed_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(completed_at)
      ORDER BY completion_date
    `, [req.user.id]);
    
    // Get overdue tasks
    const overdueTasks = await pool.query(`
      SELECT COUNT(*) as overdue_count
      FROM tasks
      WHERE user_id = $1 
        AND status != 'done'
        AND due_date < NOW()
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: {
        completion_stats: completionStats.rows[0],
        priority_distribution: priorityStats.rows,
        daily_trends: dailyTrends.rows,
        overdue_count: parseInt(overdueTasks.rows[0].overdue_count)
      }
    });
  } catch (error) {
    console.error('Task analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate task analytics'
    });
  }
});

// Bulk update tasks
router.patch('/bulk', authenticateToken, async (req, res) => {
  try {
    const { task_ids, updates } = req.body;
    
    if (!task_ids || !Array.isArray(task_ids) || task_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task IDs',
        message: 'Please provide an array of task IDs'
      });
    }
    
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No updates provided',
        message: 'Please provide update data'
      });
    }
    
    const { status, priority } = updates;
    let updatedTasks = [];
    let totalPointsEarned = 0;
    
    // Process each task individually to handle point calculation
    for (const taskId of task_ids) {
      const currentTask = await pool.query(
        'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
        [taskId, req.user.id]
      );
      
      if (currentTask.rows.length === 0) continue;
      
      const isCompletingTask = status === 'done' && currentTask.rows[0].status !== 'done';
      let taskPoints = 0;
      
      if (isCompletingTask) {
        taskPoints = calculateTaskPoints(priority || currentTask.rows[0].priority);
        totalPointsEarned += taskPoints;
      }
      
      const updatedTask = await pool.query(`
        UPDATE tasks 
        SET status = COALESCE($1, status),
            priority = COALESCE($2, priority),
            completed_at = CASE WHEN $1 = 'done' AND status != 'done' THEN NOW() ELSE completed_at END,
            points_earned = CASE WHEN $1 = 'done' AND status != 'done' THEN $3 ELSE points_earned END,
            updated_at = NOW()
        WHERE id = $4 AND user_id = $5
        RETURNING *
      `, [status, priority, taskPoints, taskId, req.user.id]);
      
      if (updatedTask.rows.length > 0) {
        updatedTasks.push(updatedTask.rows[0]);
        
        if (isCompletingTask) {
          // Record progress
          await pool.query(`
            INSERT INTO progress_records (user_id, activity_type, activity_id, points_earned)
            VALUES ($1, 'task', $2, $3)
          `, [req.user.id, taskId, taskPoints]);
        }
      }
    }
    
    // Update user points
    if (totalPointsEarned > 0) {
      await pool.query(
        'UPDATE profiles SET points = points + $1 WHERE id = $2',
        [totalPointsEarned, req.user.id]
      );
    }
    
    res.json({
      success: true,
      message: `Successfully updated ${updatedTasks.length} tasks`,
      data: {
        updated_tasks: updatedTasks,
        total_points_earned: totalPointsEarned
      }
    });
  } catch (error) {
    console.error('Bulk task update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update tasks'
    });
  }
});

module.exports = router;