const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validateQuery, paginationSchema } = require('../middleware/validation');

const router = express.Router();

// SIMPLE: Get all mentors for students to see
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id,
        p.username,
        p.email,
        p.bio,
        p.specialization,
        p.avatar_url,
        COALESCE(AVG(sr.rating), 5.0) as rating,
        COUNT(DISTINCT sa.student_id) as total_students,
        COUNT(DISTINCT w.id) as workshops_conducted
      FROM profiles p
      LEFT JOIN specialist_ratings sr ON p.id = sr.specialist_id
      LEFT JOIN specialist_assignments sa ON p.id = sa.specialist_id
      LEFT JOIN workshops w ON p.organizer_id = w.organizer_id
      WHERE p.role = 'mentor'
      GROUP BY p.id, p.username, p.email, p.bio, p.specialization, p.avatar_url
      ORDER BY rating DESC, total_students DESC
    `);

    res.json({
      success: true,
      specialists: result.rows
    });
  } catch (error) {
    console.error('Error fetching specialists:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch specialists'
    });
  }
});

// Book appointment with specialist
router.post('/appointments', authenticateToken, async (req, res) => {
  try {
    const { specialist_id, date, time, notes } = req.body;
    const student_id = req.user.id;

    if (!specialist_id || !date || !time) {
      return res.status(400).json({
        success: false,
        error: 'Specialist ID, date, and time are required'
      });
    }

    const result = await pool.query(`
      INSERT INTO specialist_appointments (student_id, specialist_id, appointment_date, appointment_time, notes, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `, [student_id, specialist_id, date, time, notes || '']);

    res.json({
      success: true,
      message: 'Appointment request sent successfully',
      appointment: result.rows[0]
    });
  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to book appointment'
    });
  }
});

// Register as student under a specialist
router.post('/register-student', authenticateToken, async (req, res) => {
  try {
    const { specialist_id } = req.body;
    const student_id = req.user.id;

    if (!specialist_id) {
      return res.status(400).json({
        success: false,
        error: 'Specialist ID is required'
      });
    }

    // Check if already registered
    const existingAssignment = await pool.query(
      'SELECT * FROM specialist_assignments WHERE student_id = $1 AND specialist_id = $2',
      [student_id, specialist_id]
    );

    if (existingAssignment.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'You are already registered under this specialist'
      });
    }

    const result = await pool.query(`
      INSERT INTO specialist_assignments (student_id, specialist_id)
      VALUES ($1, $2)
      RETURNING *
    `, [student_id, specialist_id]);

    res.json({
      success: true,
      message: 'Successfully registered as student',
      assignment: result.rows[0]
    });
  } catch (error) {
    console.error('Error registering student:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register as student'
    });
  }
});

// Rate a specialist (students can rate after appointment)
router.post('/rate', authenticateToken, async (req, res) => {
  try {
    const { specialist_id, rating, review } = req.body;
    const student_id = req.user.id;

    if (!specialist_id || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Valid specialist ID and rating (1-5) are required'
      });
    }

    const result = await pool.query(`
      INSERT INTO specialist_ratings (student_id, specialist_id, rating, review)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (student_id, specialist_id) 
      DO UPDATE SET rating = $3, review = $4, created_at = NOW()
      RETURNING *
    `, [student_id, specialist_id, rating, review || '']);

    res.json({
      success: true,
      message: 'Rating submitted successfully',
      rating: result.rows[0]
    });
  } catch (error) {
    console.error('Error rating specialist:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit rating'
    });
  }
});

module.exports = router;
  try {
    const { specialization, is_available, page = 1, limit = 20, sort_by = 'rating' } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT s.*, p.username, p.avatar_url,
             COALESCE(AVG(a.rating), 0) as avg_rating,
             COUNT(a.id) as total_appointments,
             COUNT(a.id) FILTER (WHERE a.status = 'completed') as completed_appointments
      FROM specialists s
      JOIN profiles p ON s.user_id = p.id
      LEFT JOIN appointments a ON s.id = a.specialist_id
      WHERE 1=1
    `;
    let params = [];
    let paramCount = 0;
    
    // Add filters
    if (specialization) {
      paramCount++;
      query += ` AND s.specialization ILIKE $${paramCount}`;
      params.push(`%${specialization}%`);
    }
    
    if (is_available !== undefined) {
      paramCount++;
      query += ` AND s.is_available = $${paramCount}`;
      params.push(is_available === 'true');
    }
    
    query += ` GROUP BY s.id, p.username, p.avatar_url`;
    
    // Add sorting
    switch (sort_by) {
      case 'rating':
        query += ` ORDER BY avg_rating DESC, s.created_at DESC`;
        break;
      case 'experience':
        query += ` ORDER BY s.experience_years DESC, s.created_at DESC`;
        break;
      case 'appointments':
        query += ` ORDER BY total_appointments DESC, s.created_at DESC`;
        break;
      case 'price_low':
        query += ` ORDER BY s.hourly_rate ASC, s.created_at DESC`;
        break;
      case 'price_high':
        query += ` ORDER BY s.hourly_rate DESC, s.created_at DESC`;
        break;
      default:
        query += ` ORDER BY s.created_at DESC`;
    }
    
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    const specialists = await pool.query(query, params);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(DISTINCT s.id) FROM specialists s WHERE 1=1';
    let countParams = [];
    let countParamCount = 0;
    
    if (specialization) {
      countParamCount++;
      countQuery += ` AND s.specialization ILIKE $${countParamCount}`;
      countParams.push(`%${specialization}%`);
    }
    
    if (is_available !== undefined) {
      countParamCount++;
      countQuery += ` AND s.is_available = $${countParamCount}`;
      countParams.push(is_available === 'true');
    }
    
    const totalCount = await pool.query(countQuery, countParams);
    const total = parseInt(totalCount.rows[0].count);
    
    // Get unique specializations for filtering
    const specializations = await pool.query(`
      SELECT DISTINCT specialization 
      FROM specialists 
      WHERE is_available = true 
      ORDER BY specialization
    `);
    
    res.json({
      success: true,
      data: {
        specialists: specialists.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: parseInt(limit)
        },
        filters: {
          specializations: specializations.rows.map(row => row.specialization)
        }
      }
    });
  } catch (error) {
    console.error('Specialists fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch specialists',
      message: 'An error occurred while retrieving specialists'
    });
  }
});

// Get specialist by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const specialist = await pool.query(`
      SELECT s.*, p.username, p.avatar_url,
             COALESCE(AVG(a.rating), 0) as avg_rating,
             COUNT(a.id) as total_appointments,
             COUNT(a.id) FILTER (WHERE a.status = 'completed') as completed_appointments,
             COUNT(a.id) FILTER (WHERE a.appointment_date >= NOW()) as upcoming_appointments
      FROM specialists s
      JOIN profiles p ON s.user_id = p.id
      LEFT JOIN appointments a ON s.id = a.specialist_id
      WHERE s.id = $1
      GROUP BY s.id, p.username, p.avatar_url
    `, [id]);
    
    if (specialist.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Specialist not found',
        message: 'The requested specialist could not be found'
      });
    }
    
    const specialistData = specialist.rows[0];
    
    // Get recent reviews (if user is authenticated)
    let reviews = [];
    if (req.user) {
      const reviewsResult = await pool.query(`
        SELECT a.rating, a.notes as review, a.completed_at, p.username
        FROM appointments a
        JOIN profiles p ON a.user_id = p.id
        WHERE a.specialist_id = $1 AND a.status = 'completed' AND a.rating IS NOT NULL
        ORDER BY a.completed_at DESC
        LIMIT 5
      `, [id]);
      
      reviews = reviewsResult.rows;
    }
    
    // Get availability schedule
    const availability = specialistData.availability_schedule || {};
    
    res.json({
      success: true,
      data: {
        specialist: {
          ...specialistData,
          reviews,
          availability
        }
      }
    });
  } catch (error) {
    console.error('Specialist fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch specialist'
    });
  }
});

// Get specialist's availability
router.get('/:id/availability', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query; // YYYY-MM-DD format
    
    const specialist = await pool.query(
      'SELECT availability_schedule, is_available FROM specialists WHERE id = $1',
      [id]
    );
    
    if (specialist.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Specialist not found'
      });
    }
    
    if (!specialist.rows[0].is_available) {
      return res.json({
        success: true,
        data: {
          available_slots: [],
          message: 'Specialist is currently unavailable'
        }
      });
    }
    
    const schedule = specialist.rows[0].availability_schedule || {};
    
    // If specific date requested, get availability for that date
    if (date) {
      const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'lowercase' });
      const daySchedule = schedule[dayOfWeek] || [];
      
      // Get existing appointments for this date
      const existingAppointments = await pool.query(`
        SELECT appointment_date, duration_minutes
        FROM appointments
        WHERE specialist_id = $1 
          AND DATE(appointment_date) = $2
          AND status NOT IN ('cancelled', 'no-show')
      `, [id, date]);
      
      // Calculate available slots (this is a simplified version)
      const bookedSlots = existingAppointments.rows.map(apt => 
        new Date(apt.appointment_date).getHours()
      );
      
      const availableSlots = daySchedule.filter(slot => 
        !bookedSlots.includes(parseInt(slot.split(':')[0]))
      );
      
      return res.json({
        success: true,
        data: {
          date,
          available_slots: availableSlots,
          booked_slots: bookedSlots
        }
      });
    }
    
    // Return full schedule
    res.json({
      success: true,
      data: {
        schedule,
        timezone: 'America/New_York' // This should be configurable
      }
    });
  } catch (error) {
    console.error('Availability fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch availability'
    });
  }
});

// Get specialist's reviews
router.get('/:id/reviews', optionalAuth, validateQuery(paginationSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    // Verify specialist exists
    const specialist = await pool.query('SELECT id FROM specialists WHERE id = $1', [id]);
    if (specialist.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Specialist not found'
      });
    }
    
    const reviews = await pool.query(`
      SELECT a.rating, a.notes as review, a.completed_at,
             p.username, p.avatar_url
      FROM appointments a
      JOIN profiles p ON a.user_id = p.id
      WHERE a.specialist_id = $1 
        AND a.status = 'completed' 
        AND a.rating IS NOT NULL
      ORDER BY a.completed_at DESC
      LIMIT $2 OFFSET $3
    `, [id, limit, offset]);
    
    // Get total count
    const totalCount = await pool.query(`
      SELECT COUNT(*) FROM appointments
      WHERE specialist_id = $1 AND status = 'completed' AND rating IS NOT NULL
    `, [id]);
    
    // Get rating distribution
    const ratingStats = await pool.query(`
      SELECT 
        rating,
        COUNT(*) as count
      FROM appointments
      WHERE specialist_id = $1 AND status = 'completed' AND rating IS NOT NULL
      GROUP BY rating
      ORDER BY rating DESC
    `, [id]);
    
    res.json({
      success: true,
      data: {
        reviews: reviews.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalCount.rows[0].count / limit),
          total_items: parseInt(totalCount.rows[0].count),
          items_per_page: parseInt(limit)
        },
        rating_distribution: ratingStats.rows
      }
    });
  } catch (error) {
    console.error('Reviews fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reviews'
    });
  }
});

// Search specialists
router.get('/search/query', optionalAuth, async (req, res) => {
  try {
    const { q, location, max_rate, min_rating = 0 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query required',
        message: 'Please provide a search query'
      });
    }
    
    let query = `
      SELECT s.*, p.username, p.avatar_url,
             COALESCE(AVG(a.rating), 0) as avg_rating,
             COUNT(a.id) FILTER (WHERE a.status = 'completed') as completed_appointments,
             ts_rank(to_tsvector('english', s.first_name || ' ' || s.last_name || ' ' || s.specialization || ' ' || COALESCE(s.bio, '')), plainto_tsquery('english', $1)) as relevance
      FROM specialists s
      JOIN profiles p ON s.user_id = p.id
      LEFT JOIN appointments a ON s.id = a.specialist_id
      WHERE s.is_available = true
        AND (
          to_tsvector('english', s.first_name || ' ' || s.last_name || ' ' || s.specialization || ' ' || COALESCE(s.bio, '')) @@ plainto_tsquery('english', $1)
          OR s.first_name ILIKE $2
          OR s.last_name ILIKE $2
          OR s.specialization ILIKE $2
          OR s.bio ILIKE $2
        )
    `;
    
    let params = [q, `%${q}%`];
    let paramCount = 2;
    
    if (max_rate) {
      paramCount++;
      query += ` AND s.hourly_rate <= $${paramCount}`;
      params.push(parseFloat(max_rate));
    }
    
    query += ` GROUP BY s.id, p.username, p.avatar_url`;
    query += ` HAVING COALESCE(AVG(a.rating), 0) >= $${paramCount + 1}`;
    params.push(parseFloat(min_rating));
    
    query += ` ORDER BY relevance DESC, avg_rating DESC LIMIT 20`;
    
    const results = await pool.query(query, params);
    
    res.json({
      success: true,
      data: {
        results: results.rows,
        query: q,
        total_results: results.rows.length
      }
    });
  } catch (error) {
    console.error('Specialist search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
});

// Get specialist statistics (for admin/specialist dashboard)
router.get('/:id/statistics', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;
    
    // Verify specialist exists and user has permission
    const specialist = await pool.query(
      'SELECT user_id FROM specialists WHERE id = $1',
      [id]
    );
    
    if (specialist.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Specialist not found'
      });
    }
    
    // Check permission (only the specialist themselves or admin can view stats)
    if (specialist.rows[0].user_id !== req.user.id) {
      // Check if user is admin (you might want to implement role-based access)
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have permission to view these statistics'
      });
    }
    
    // Get appointment statistics
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_appointments,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_appointments,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_appointments,
        COUNT(*) FILTER (WHERE status = 'no-show') as no_show_appointments,
        COUNT(*) FILTER (WHERE appointment_date >= NOW()) as upcoming_appointments,
        COALESCE(AVG(rating), 0) as average_rating,
        SUM(price) FILTER (WHERE status = 'completed') as total_earnings
      FROM appointments
      WHERE specialist_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
    `, [id]);
    
    // Get daily appointment trends
    const dailyTrends = await pool.query(`
      SELECT 
        DATE(appointment_date) as appointment_date,
        COUNT(*) as appointments,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM appointments
      WHERE specialist_id = $1 AND appointment_date >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(appointment_date)
      ORDER BY appointment_date
    `, [id]);
    
    // Get rating distribution
    const ratingDistribution = await pool.query(`
      SELECT 
        rating,
        COUNT(*) as count
      FROM appointments
      WHERE specialist_id = $1 AND status = 'completed' AND rating IS NOT NULL
      GROUP BY rating
      ORDER BY rating DESC
    `, [id]);
    
    res.json({
      success: true,
      data: {
        overview: stats.rows[0],
        daily_trends: dailyTrends.rows,
        rating_distribution: ratingDistribution.rows
      }
    });
  } catch (error) {
    console.error('Specialist statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// Update specialist profile (for specialist themselves)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      first_name, 
      last_name, 
      title, 
      specialization, 
      bio, 
      credentials, 
      experience_years,
      hourly_rate,
      is_available,
      availability_schedule,
      contact_email,
      contact_phone
    } = req.body;
    
    // Verify specialist exists and user has permission
    const specialist = await pool.query(
      'SELECT user_id FROM specialists WHERE id = $1',
      [id]
    );
    
    if (specialist.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Specialist not found'
      });
    }
    
    if (specialist.rows[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only update your own specialist profile'
      });
    }
    
    const updatedSpecialist = await pool.query(`
      UPDATE specialists 
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          title = COALESCE($3, title),
          specialization = COALESCE($4, specialization),
          bio = COALESCE($5, bio),
          credentials = COALESCE($6, credentials),
          experience_years = COALESCE($7, experience_years),
          hourly_rate = COALESCE($8, hourly_rate),
          is_available = COALESCE($9, is_available),
          availability_schedule = COALESCE($10, availability_schedule),
          contact_email = COALESCE($11, contact_email),
          contact_phone = COALESCE($12, contact_phone),
          updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `, [
      first_name, last_name, title, specialization, bio,
      credentials, experience_years, hourly_rate, is_available,
      availability_schedule ? JSON.stringify(availability_schedule) : null,
      contact_email, contact_phone, id
    ]);
    
    res.json({
      success: true,
      message: 'Specialist profile updated successfully',
      data: {
        specialist: updatedSpecialist.rows[0]
      }
    });
  } catch (error) {
    console.error('Specialist update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update specialist profile'
    });
  }
});

module.exports = router;