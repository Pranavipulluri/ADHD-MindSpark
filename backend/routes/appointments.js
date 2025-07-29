const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { validate, appointmentSchema, validateQuery, paginationSchema } = require('../middleware/validation');
const emailService = require('../services/emailService');

const router = express.Router();

// Book new appointment
router.post('/', authenticateToken, validate(appointmentSchema), async (req, res) => {
  try {
    const { specialist_id, appointment_date, duration_minutes, session_type, notes } = req.validatedData;
    
    // Verify specialist exists and is available
    const specialist = await pool.query(
      'SELECT * FROM specialists WHERE id = $1 AND is_available = true',
      [specialist_id]
    );
    
    if (specialist.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Specialist not found',
        message: 'The requested specialist is not found or unavailable'
      });
    }
    
    const specialistData = specialist.rows[0];
    
    // Check for scheduling conflicts
    const conflictCheck = await pool.query(`
      SELECT id FROM appointments 
      WHERE specialist_id = $1 
        AND appointment_date = $2 
        AND status NOT IN ('cancelled', 'no-show')
    `, [specialist_id, appointment_date]);
    
    if (conflictCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Time slot unavailable',
        message: 'This time slot is already booked'
      });
    }
    
    // Check if appointment is in the future
    const appointmentTime = new Date(appointment_date);
    if (appointmentTime <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid appointment time',
        message: 'Appointment must be scheduled for a future date and time'
      });
    }
    
    // Calculate price
    const durationHours = (duration_minutes || 60) / 60;
    const price = specialistData.hourly_rate * durationHours;
    
    // Create appointment
    const appointment = await pool.query(`
      INSERT INTO appointments (user_id, specialist_id, appointment_date, duration_minutes, notes, session_type, price)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [req.user.id, specialist_id, appointment_date, duration_minutes || 60, notes, session_type || 'video', price]);
    
    // Get appointment with specialist info for response
    const fullAppointment = await pool.query(`
      SELECT a.*, s.first_name, s.last_name, s.title, s.specialization, s.contact_email
      FROM appointments a
      JOIN specialists s ON a.specialist_id = s.id
      WHERE a.id = $1
    `, [appointment.rows[0].id]);
    
    // Send confirmation email
    try {
      const userProfile = await pool.query('SELECT email, username FROM profiles WHERE id = $1', [req.user.id]);
      if (userProfile.rows.length > 0) {
        await emailService.sendAppointmentConfirmation(
          userProfile.rows[0].email,
          userProfile.rows[0].username,
          {
            ...fullAppointment.rows[0],
            specialist_name: `${specialistData.title} ${specialistData.first_name} ${specialistData.last_name}`
          }
        );
      }
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
    }
    
    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: {
        appointment: fullAppointment.rows[0]
      }
    });
  } catch (error) {
    console.error('Appointment booking error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to book appointment',
      message: 'An error occurred while booking your appointment'
    });
  }
});

// Get user's appointments
router.get('/', authenticateToken, validateQuery(paginationSchema), async (req, res) => {
  try {
    const { status, upcoming_only, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT a.*, s.first_name, s.last_name, s.title, s.specialization, s.profile_image_url
      FROM appointments a
      JOIN specialists s ON a.specialist_id = s.id
      WHERE a.user_id = $1
    `;
    let params = [req.user.id];
    let paramCount = 1;
    
    // Add filters
    if (status) {
      paramCount++;
      query += ` AND a.status = $${paramCount}`;
      params.push(status);
    }
    
    if (upcoming_only === 'true') {
      query += ` AND a.appointment_date >= NOW()`;
    }
    
    query += ` ORDER BY a.appointment_date DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    const appointments = await pool.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM appointments WHERE user_id = $1';
    let countParams = [req.user.id];
    
    if (status) {
      countQuery += ' AND status = $2';
      countParams.push(status);
    }
    
    if (upcoming_only === 'true') {
      countQuery += status ? ' AND appointment_date >= NOW()' : ' AND appointment_date >= NOW()';
    }
    
    const totalCount = await pool.query(countQuery, countParams);
    const total = parseInt(totalCount.rows[0].count);
    
    // Get appointment statistics
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_appointments,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_appointments,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_appointments,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_appointments,
        COUNT(*) FILTER (WHERE appointment_date >= NOW()) as upcoming_appointments
      FROM appointments 
      WHERE user_id = $1
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: {
        appointments: appointments.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: parseInt(limit)
        },
        statistics: stats.rows[0]
      }
    });
  } catch (error) {
    console.error('Appointments fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch appointments',
      message: 'An error occurred while retrieving your appointments'
    });
  }
});

// Get appointment by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const appointment = await pool.query(`
      SELECT a.*, s.first_name, s.last_name, s.title, s.specialization, 
             s.contact_email, s.contact_phone, s.profile_image_url
      FROM appointments a
      JOIN specialists s ON a.specialist_id = s.id
      WHERE a.id = $1 AND a.user_id = $2
    `, [id, req.user.id]);
    
    if (appointment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found',
        message: 'The requested appointment could not be found'
      });
    }
    
    res.json({
      success: true,
      data: {
        appointment: appointment.rows[0]
      }
    });
  } catch (error) {
    console.error('Appointment fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appointment'
    });
  }
});

// Update appointment
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { appointment_date, duration_minutes, notes, session_type } = req.body;
    
    // Get current appointment
    const currentAppointment = await pool.query(
      'SELECT * FROM appointments WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (currentAppointment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found',
        message: 'The appointment could not be found'
      });
    }
    
    const appointment = currentAppointment.rows[0];
    
    // Check if appointment can be modified (not completed or cancelled)
    if (['completed', 'cancelled'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot modify appointment',
        message: 'Completed or cancelled appointments cannot be modified'
      });
    }
    
    // Check if appointment is less than 24 hours away
    const appointmentTime = new Date(appointment.appointment_date);
    const now = new Date();
    const hoursUntilAppointment = (appointmentTime - now) / (1000 * 60 * 60);
    
    if (hoursUntilAppointment < 24) {
      return res.status(400).json({
        success: false,
        error: 'Too late to modify',
        message: 'Appointments cannot be modified less than 24 hours before the scheduled time'
      });
    }
    
    // If changing appointment date, check for conflicts
    if (appointment_date && appointment_date !== appointment.appointment_date) {
      const conflictCheck = await pool.query(`
        SELECT id FROM appointments 
        WHERE specialist_id = $1 
          AND appointment_date = $2 
          AND id != $3
          AND status NOT IN ('cancelled', 'no-show')
      `, [appointment.specialist_id, appointment_date, id]);
      
      if (conflictCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Time slot unavailable',
          message: 'The new time slot is already booked'
        });
      }
    }
    
    // Update appointment
    const updatedAppointment = await pool.query(`
      UPDATE appointments 
      SET appointment_date = COALESCE($1, appointment_date),
          duration_minutes = COALESCE($2, duration_minutes),
          notes = COALESCE($3, notes),
          session_type = COALESCE($4, session_type),
          updated_at = NOW()
      WHERE id = $5 AND user_id = $6
      RETURNING *
    `, [appointment_date, duration_minutes, notes, session_type, id, req.user.id]);
    
    res.json({
      success: true,
      message: 'Appointment updated successfully',
      data: {
        appointment: updatedAppointment.rows[0]
      }
    });
  } catch (error) {
    console.error('Appointment update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update appointment'
    });
  }
});

// Cancel appointment
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Get appointment details
    const appointment = await pool.query(`
      SELECT a.*, s.first_name, s.last_name
      FROM appointments a
      JOIN specialists s ON a.specialist_id = s.id
      WHERE a.id = $1 AND a.user_id = $2
    `, [id, req.user.id]);
    
    if (appointment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }
    
    const appointmentData = appointment.rows[0];
    
    if (appointmentData.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Appointment already cancelled'
      });
    }
    
    if (appointmentData.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel completed appointment'
      });
    }
    
    // Update appointment status
    await pool.query(`
      UPDATE appointments 
      SET status = 'cancelled', 
          notes = COALESCE(notes || ' | Cancellation reason: ' || $1, $1),
          updated_at = NOW()
      WHERE id = $2
    `, [reason || 'No reason provided', id]);
    
    res.json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    console.error('Appointment cancellation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel appointment'
    });
  }
});

// Complete appointment (mark as completed)
router.post('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;
    
    // Validate rating
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid rating',
        message: 'Rating must be between 1 and 5'
      });
    }
    
    const appointment = await pool.query(
      'SELECT * FROM appointments WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (appointment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }
    
    const appointmentData = appointment.rows[0];
    
    if (appointmentData.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Appointment already completed'
      });
    }
    
    // Check if appointment time has passed
    const appointmentTime = new Date(appointmentData.appointment_date);
    const now = new Date();
    
    if (appointmentTime > now) {
      return res.status(400).json({
        success: false,
        error: 'Cannot complete future appointment',
        message: 'Appointments can only be marked as completed after the scheduled time'
      });
    }
    
    // Update appointment
    const updatedAppointment = await pool.query(`
      UPDATE appointments 
      SET status = 'completed',
          rating = $1,
          notes = COALESCE(notes || ' | Review: ' || $2, $2),
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [rating, review, id]);
    
    // Award points for attending appointment
    const pointsEarned = 25;
    await pool.query(
      'UPDATE profiles SET points = points + $1 WHERE id = $2',
      [pointsEarned, req.user.id]
    );
    
    // Record progress
    await pool.query(`
      INSERT INTO progress_records (user_id, activity_type, activity_id, points_earned)
      VALUES ($1, 'appointment', $2, $3)
    `, [req.user.id, id, pointsEarned]);
    
    res.json({
      success: true,
      message: 'Appointment completed successfully',
      data: {
        appointment: updatedAppointment.rows[0],
        points_earned: pointsEarned
      }
    });
  } catch (error) {
    console.error('Appointment completion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete appointment'
    });
  }
});

// Reschedule appointment
router.post('/:id/reschedule', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { new_appointment_date, reason } = req.body;
    
    if (!new_appointment_date) {
      return res.status(400).json({
        success: false,
        error: 'New appointment date required'
      });
    }
    
    const newDateTime = new Date(new_appointment_date);
    if (newDateTime <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date',
        message: 'New appointment date must be in the future'
      });
    }
    
    const appointment = await pool.query(
      'SELECT * FROM appointments WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    
    if (appointment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }
    
    const appointmentData = appointment.rows[0];
    
    if (['completed', 'cancelled'].includes(appointmentData.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot reschedule this appointment'
      });
    }
    
    // Check for conflicts at new time
    const conflictCheck = await pool.query(`
      SELECT id FROM appointments 
      WHERE specialist_id = $1 
        AND appointment_date = $2 
        AND id != $3
        AND status NOT IN ('cancelled', 'no-show')
    `, [appointmentData.specialist_id, new_appointment_date, id]);
    
    if (conflictCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Time slot unavailable',
        message: 'The requested time slot is already booked'
      });
    }
    
    // Update appointment
    const updatedAppointment = await pool.query(`
      UPDATE appointments 
      SET appointment_date = $1,
          notes = COALESCE(notes || ' | Rescheduled: ' || $2, $2),
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [new_appointment_date, reason || 'Rescheduled by patient', id]);
    
    res.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: {
        appointment: updatedAppointment.rows[0]
      }
    });
  } catch (error) {
    console.error('Appointment reschedule error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reschedule appointment'
    });
  }
});

// Get upcoming appointments (for reminders)
router.get('/upcoming/reminders', authenticateToken, async (req, res) => {
  try {
    const upcomingAppointments = await pool.query(`
      SELECT a.*, s.first_name, s.last_name, s.title, s.specialization,
             p.email, p.username
      FROM appointments a
      JOIN specialists s ON a.specialist_id = s.id
      JOIN profiles p ON a.user_id = p.id
      WHERE a.user_id = $1 
        AND a.status = 'scheduled'
        AND a.appointment_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
      ORDER BY a.appointment_date
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: {
        upcoming_appointments: upcomingAppointments.rows
      }
    });
  } catch (error) {
    console.error('Upcoming appointments fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming appointments'
    });
  }
});

// Get appointment history with analytics
router.get('/history/analytics', authenticateToken, async (req, res) => {
  try {
    const { days = 90 } = req.query;
    
    // Get appointment history
    const history = await pool.query(`
      SELECT 
        COUNT(*) as total_appointments,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_appointments,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_appointments,
        COUNT(*) FILTER (WHERE status = 'no-show') as no_show_appointments,
        AVG(rating) FILTER (WHERE rating IS NOT NULL) as average_rating_given,
        COUNT(DISTINCT specialist_id) as unique_specialists,
        SUM(price) FILTER (WHERE status = 'completed') as total_spent
      FROM appointments
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
    `, [req.user.id]);
    
    // Get monthly trends
    const monthlyTrends = await pool.query(`
      SELECT 
        DATE_TRUNC('month', appointment_date) as month,
        COUNT(*) as appointments,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM appointments
      WHERE user_id = $1 AND appointment_date >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE_TRUNC('month', appointment_date)
      ORDER BY month
    `, [req.user.id]);
    
    // Get specialist breakdown
    const specialistBreakdown = await pool.query(`
      SELECT 
        s.first_name, s.last_name, s.specialization,
        COUNT(*) as appointment_count,
        AVG(a.rating) as average_rating
      FROM appointments a
      JOIN specialists s ON a.specialist_id = s.id
      WHERE a.user_id = $1 AND a.created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY s.id, s.first_name, s.last_name, s.specialization
      ORDER BY appointment_count DESC
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: {
        summary: history.rows[0],
        monthly_trends: monthlyTrends.rows,
        specialist_breakdown: specialistBreakdown.rows
      }
    });
  } catch (error) {
    console.error('Appointment analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate appointment analytics'
    });
  }
});

module.exports = router;