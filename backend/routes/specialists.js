const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get all specialists (mentors) for students to book appointments
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.user_id,
        p.full_name,
        p.bio,
        p.specialization,
        p.experience_years,
        p.certifications,
        COALESCE(AVG(sr.rating), 0) as average_rating,
        COUNT(DISTINCT sa.student_id) as total_students
      FROM profiles p
      LEFT JOIN specialist_ratings sr ON p.user_id = sr.specialist_id
      LEFT JOIN specialist_assignments sa ON p.user_id = sa.specialist_id
      WHERE p.role = 'mentor'
      GROUP BY p.user_id, p.full_name, p.bio, p.specialization, p.experience_years, p.certifications
      ORDER BY average_rating DESC, total_students DESC
    `);

    res.json({ specialists: result.rows });
  } catch (error) {
    console.error('Error fetching specialists:', error);
    res.status(500).json({ 
      error: 'Failed to fetch specialists',
      details: error.message 
    });
  }
});

// Book an appointment with a specialist
router.post('/appointments', authenticateToken, async (req, res) => {
  const { specialist_id, appointment_date, notes } = req.body;
  const student_id = req.user.userId;

  if (!specialist_id || !appointment_date) {
    return res.status(400).json({ 
      error: 'Specialist ID and appointment date are required' 
    });
  }

  try {
    // Check if specialist exists and is a mentor
    const specialistCheck = await pool.query(
      'SELECT user_id FROM profiles WHERE user_id = $1 AND role = $2',
      [specialist_id, 'mentor']
    );

    if (specialistCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Specialist not found' });
    }

    // Create appointment
    const result = await pool.query(
      `INSERT INTO specialist_appointments 
       (student_id, specialist_id, appointment_date, notes, status) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [student_id, specialist_id, appointment_date, notes || '', 'pending']
    );

    // Create assignment record if doesn't exist
    await pool.query(
      `INSERT INTO specialist_assignments (student_id, specialist_id, assigned_date)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (student_id, specialist_id) DO NOTHING`,
      [student_id, specialist_id]
    );

    res.status(201).json({ 
      message: 'Appointment booked successfully',
      appointment: result.rows[0] 
    });
  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({ 
      error: 'Failed to book appointment',
      details: error.message 
    });
  }
});

// Register a student with a specialist (for student count tracking)
router.post('/register-student', authenticateToken, async (req, res) => {
  const { specialist_id } = req.body;
  const student_id = req.user.userId;

  if (!specialist_id) {
    return res.status(400).json({ error: 'Specialist ID is required' });
  }

  try {
    // Check if specialist exists
    const specialistCheck = await pool.query(
      'SELECT user_id FROM profiles WHERE user_id = $1 AND role = $2',
      [specialist_id, 'mentor']
    );

    if (specialistCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Specialist not found' });
    }

    // Create assignment
    const result = await pool.query(
      `INSERT INTO specialist_assignments (student_id, specialist_id, assigned_date)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (student_id, specialist_id) DO NOTHING
       RETURNING *`,
      [student_id, specialist_id]
    );

    res.status(201).json({ 
      message: 'Successfully registered with specialist',
      assignment: result.rows[0] 
    });
  } catch (error) {
    console.error('Error registering student:', error);
    res.status(500).json({ 
      error: 'Failed to register with specialist',
      details: error.message 
    });
  }
});

// Rate a specialist
router.post('/rate', authenticateToken, async (req, res) => {
  const { specialist_id, rating, review } = req.body;
  const student_id = req.user.userId;

  if (!specialist_id || !rating) {
    return res.status(400).json({ 
      error: 'Specialist ID and rating are required' 
    });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ 
      error: 'Rating must be between 1 and 5' 
    });
  }

  try {
    // Check if specialist exists
    const specialistCheck = await pool.query(
      'SELECT user_id FROM profiles WHERE user_id = $1 AND role = $2',
      [specialist_id, 'mentor']
    );

    if (specialistCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Specialist not found' });
    }

    // Create or update rating
    const result = await pool.query(
      `INSERT INTO specialist_ratings (student_id, specialist_id, rating, review, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (student_id, specialist_id) 
       DO UPDATE SET rating = $3, review = $4, created_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [student_id, specialist_id, rating, review || '']
    );

    res.status(201).json({ 
      message: 'Rating submitted successfully',
      rating: result.rows[0] 
    });
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({ 
      error: 'Failed to submit rating',
      details: error.message 
    });
  }
});

module.exports = router;
