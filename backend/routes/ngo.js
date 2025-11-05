const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all workshops (for NGOs to see their own, and students to see all available)
router.get('/workshops', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role;
    let query;
    let params = [];

    if (userRole === 'ngo') {
      // NGOs see only their own workshops
      query = `
        SELECT 
          w.*,
          p.username as organizer_name,
          COUNT(DISTINCT wp.student_id) as current_participants
        FROM workshops w
        LEFT JOIN profiles p ON w.organizer_id = p.id
        LEFT JOIN workshop_participants wp ON w.id = wp.workshop_id
        WHERE w.organizer_id = $1
        GROUP BY w.id, p.username
        ORDER BY w.scheduled_date DESC
      `;
      params = [req.user.id];
    } else {
      // Students see all active workshops
      query = `
        SELECT 
          w.*,
          p.username as organizer_name,
          COUNT(DISTINCT wp.student_id) as current_participants,
          EXISTS(
            SELECT 1 FROM workshop_participants 
            WHERE workshop_id = w.id AND student_id = $1
          ) as is_registered
        FROM workshops w
        LEFT JOIN profiles p ON w.organizer_id = p.id
        LEFT JOIN workshop_participants wp ON w.id = wp.workshop_id
        WHERE w.status IN ('upcoming', 'ongoing')
        GROUP BY w.id, p.username
        ORDER BY w.scheduled_date ASC
      `;
      params = [req.user.id];
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      workshops: result.rows
    });
  } catch (error) {
    console.error('Error fetching workshops:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workshops'
    });
  }
});

// Create a new workshop (NGOs only)
router.post('/workshops', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'ngo') {
      return res.status(403).json({
        success: false,
        error: 'Only NGOs can create workshops'
      });
    }

    const { title, description, workshop_date, workshop_time, location, max_participants } = req.body;

    if (!title || !description || !workshop_date || !workshop_time || !location || !max_participants) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    // Combine date and time for scheduled_date
    const scheduledDate = new Date(`${workshop_date}T${workshop_time}`);

    const result = await pool.query(`
      INSERT INTO workshops (
        organizer_id, 
        title, 
        description, 
        scheduled_date,
        location,
        max_participants,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'upcoming')
      RETURNING *
    `, [req.user.id, title, description, scheduledDate, location, max_participants]);

    res.json({
      success: true,
      message: 'Workshop created successfully',
      workshop: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating workshop:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create workshop'
    });
  }
});

// Update workshop (NGOs only)
router.put('/workshops/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'ngo') {
      return res.status(403).json({
        success: false,
        error: 'Only NGOs can update workshops'
      });
    }

    const { id } = req.params;
    const { title, description, workshop_date, workshop_time, location, max_participants, status } = req.body;

    // Verify workshop belongs to this NGO
    const checkOwnership = await pool.query(
      'SELECT * FROM workshops WHERE id = $1 AND organizer_id = $2',
      [id, req.user.id]
    );

    if (checkOwnership.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workshop not found or you do not have permission to update it'
      });
    }

    const scheduledDate = workshop_date && workshop_time 
      ? new Date(`${workshop_date}T${workshop_time}`) 
      : checkOwnership.rows[0].scheduled_date;

    const result = await pool.query(`
      UPDATE workshops 
      SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        scheduled_date = COALESCE($3, scheduled_date),
        location = COALESCE($4, location),
        max_participants = COALESCE($5, max_participants),
        status = COALESCE($6, status)
      WHERE id = $7
      RETURNING *
    `, [title, description, scheduledDate, location, max_participants, status, id]);

    res.json({
      success: true,
      message: 'Workshop updated successfully',
      workshop: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating workshop:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update workshop'
    });
  }
});

// Delete workshop (NGOs only)
router.delete('/workshops/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'ngo') {
      return res.status(403).json({
        success: false,
        error: 'Only NGOs can delete workshops'
      });
    }

    const { id } = req.params;

    // Verify workshop belongs to this NGO
    const checkOwnership = await pool.query(
      'SELECT * FROM workshops WHERE id = $1 AND organizer_id = $2',
      [id, req.user.id]
    );

    if (checkOwnership.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workshop not found or you do not have permission to delete it'
      });
    }

    await pool.query('DELETE FROM workshops WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Workshop deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting workshop:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete workshop'
    });
  }
});

// Register for a workshop (Students only)
router.post('/workshops/:id/register', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        error: 'Only students can register for workshops'
      });
    }

    const { id } = req.params;

    // Check if workshop exists and has space
    const workshopCheck = await pool.query(`
      SELECT 
        w.*,
        COUNT(wp.student_id) as current_participants
      FROM workshops w
      LEFT JOIN workshop_participants wp ON w.id = wp.workshop_id
      WHERE w.id = $1
      GROUP BY w.id
    `, [id]);

    if (workshopCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workshop not found'
      });
    }

    const workshop = workshopCheck.rows[0];

    if (workshop.current_participants >= workshop.max_participants) {
      return res.status(400).json({
        success: false,
        error: 'Workshop is full'
      });
    }

    // Check if already registered
    const existingRegistration = await pool.query(
      'SELECT * FROM workshop_participants WHERE workshop_id = $1 AND student_id = $2',
      [id, req.user.id]
    );

    if (existingRegistration.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'You are already registered for this workshop'
      });
    }

    // Register the student
    await pool.query(
      'INSERT INTO workshop_participants (workshop_id, student_id) VALUES ($1, $2)',
      [id, req.user.id]
    );

    res.json({
      success: true,
      message: 'Successfully registered for workshop'
    });
  } catch (error) {
    console.error('Error registering for workshop:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register for workshop'
    });
  }
});

// Unregister from a workshop (Students only)
router.delete('/workshops/:id/register', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        error: 'Only students can unregister from workshops'
      });
    }

    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM workshop_participants WHERE workshop_id = $1 AND student_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Registration not found'
      });
    }

    res.json({
      success: true,
      message: 'Successfully unregistered from workshop'
    });
  } catch (error) {
    console.error('Error unregistering from workshop:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unregister from workshop'
    });
  }
});

module.exports = router;
