const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware to check if user is a mentor
const isMentor = async (req, res, next) => {
  try {
    const userResult = await pool.query(
      'SELECT role FROM profiles WHERE id = $1',
      [req.user.id]
    );
    
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'mentor') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Only mentors can access this resource'
      });
    }
    next();
  } catch (error) {
    console.error('Mentor check error:', error);
    res.status(500).json({ success: false, error: 'Authorization failed' });
  }
};

// Setup mentor profile
router.post('/setup', authenticateToken, isMentor, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      title,
      specialization,
      bio,
      expertise,
      hourlyRate
    } = req.body;
    
    if (!firstName || !lastName || !specialization) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'First name, last name, and specialization are required'
      });
    }
    
    const mentorId = uuidv4();
    const newMentor = await pool.query(`
      INSERT INTO mentors (id, user_id, first_name, last_name, title, specialization, bio, expertise, hourly_rate)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id) 
      DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        title = EXCLUDED.title,
        specialization = EXCLUDED.specialization,
        bio = EXCLUDED.bio,
        expertise = EXCLUDED.expertise,
        hourly_rate = EXCLUDED.hourly_rate,
        updated_at = NOW()
      RETURNING *
    `, [mentorId, req.user.id, firstName, lastName, title, specialization, bio, expertise, hourlyRate]);
    
    res.json({
      success: true,
      message: 'Mentor profile created/updated successfully',
      mentor: newMentor.rows[0]
    });
  } catch (error) {
    console.error('Mentor setup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup mentor profile'
    });
  }
});

// Get mentor dashboard data
router.get('/dashboard', authenticateToken, isMentor, async (req, res) => {
  try {
    // Get mentor profile
    const mentorResult = await pool.query(
      'SELECT * FROM mentors WHERE user_id = $1',
      [req.user.id]
    );
    
    if (mentorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Mentor profile not found',
        message: 'Please complete your mentor profile setup first'
      });
    }
    
    const mentor = mentorResult.rows[0];
    
    // Get assigned students
    const studentsResult = await pool.query(`
      SELECT p.id, p.username, p.email, p.avatar_url, p.points, p.level, sm.assigned_at, sm.status
      FROM student_mentors sm
      JOIN profiles p ON sm.student_id = p.id
      WHERE sm.mentor_id = $1 AND sm.status = 'active'
      ORDER BY sm.assigned_at DESC
    `, [mentor.id]);
    
    // Get pending appointment requests
    const pendingRequests = await pool.query(`
      SELECT a.*, p.username, p.email, p.avatar_url
      FROM appointments a
      JOIN profiles p ON a.requested_by = p.id
      WHERE a.mentor_id = $1 AND a.request_status = 'pending'
      ORDER BY a.appointment_date ASC
    `, [mentor.id]);
    
    // Get upcoming accepted appointments
    const upcomingAppointments = await pool.query(`
      SELECT a.*, p.username, p.email, p.avatar_url
      FROM appointments a
      JOIN profiles p ON a.user_id = p.id
      WHERE a.mentor_id = $1 
        AND a.request_status = 'accepted' 
        AND a.appointment_date > NOW()
        AND a.status = 'scheduled'
      ORDER BY a.appointment_date ASC
      LIMIT 10
    `, [mentor.id]);
    
    // Get recent workshops
    const workshops = await pool.query(`
      SELECT w.*, COUNT(wp.id) as participant_count
      FROM workshops w
      LEFT JOIN workshop_participants wp ON w.id = wp.workshop_id
      WHERE w.organizer_id = $1 AND w.organizer_type = 'mentor'
      GROUP BY w.id
      ORDER BY w.start_time DESC
      LIMIT 5
    `, [req.user.id]);
    
    res.json({
      success: true,
      mentor: mentor,
      students: studentsResult.rows,
      pendingRequests: pendingRequests.rows,
      upcomingAppointments: upcomingAppointments.rows,
      workshops: workshops.rows,
      stats: {
        totalStudents: studentsResult.rows.length,
        pendingRequests: pendingRequests.rows.length,
        totalSessions: mentor.total_sessions,
        averageRating: mentor.average_rating
      }
    });
  } catch (error) {
    console.error('Dashboard fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data'
    });
  }
});

// Get all mentors (for students to view/book)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const mentors = await pool.query(`
      SELECT 
        m.id,
        p.username,
        p.email,
        p.bio,
        p.specialization,
        p.certifications,
        p.experience_years,
        p.avatar_url
      FROM profiles p
      WHERE p.role = 'mentor'
      ORDER BY p.created_at DESC
    `);
    
    res.json({
      success: true,
      mentors: mentors.rows
    });
  } catch (error) {
    console.error('Error fetching mentors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch mentors'
    });
  }
});

// Get mentor's appointments
router.get('/appointments', authenticateToken, isMentor, async (req, res) => {
  try {
    const appointments = await pool.query(`
      SELECT 
        sa.id,
        sa.student_id,
        sa.scheduled_date,
        sa.status,
        sa.notes,
        p.username as student_name,
        p.email as student_email
      FROM specialist_appointments sa
      JOIN profiles p ON sa.student_id = p.id
      WHERE sa.specialist_id = $1
      ORDER BY sa.scheduled_date DESC
    `, [req.user.id]);
    
    res.json({
      success: true,
      appointments: appointments.rows
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appointments'
    });
  }
});

// Get mentor's students
router.get('/students', authenticateToken, isMentor, async (req, res) => {
  try {
    const students = await pool.query(`
      SELECT 
        sa.student_id as id,
        p.username,
        p.email,
        p.avatar_url,
        COUNT(sa.id) as appointment_count
      FROM specialist_appointments sa
      JOIN profiles p ON sa.student_id = p.id
      WHERE sa.specialist_id = $1 AND sa.status IN ('accepted', 'completed')
      GROUP BY sa.student_id, p.username, p.email, p.avatar_url
      ORDER BY p.username
    `, [req.user.id]);
    
    res.json({
      success: true,
      students: students.rows
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch students'
    });
  }
});

// Update appointment status (accept/reject)
router.put('/appointments/:id/:action', authenticateToken, isMentor, async (req, res) => {
  try {
    const { id, action } = req.params;
    
    if (!['accept', 'reject', 'complete'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action'
      });
    }
    
    const statusMap = {
      accept: 'accepted',
      reject: 'rejected',
      complete: 'completed'
    };
    
    const result = await pool.query(`
      UPDATE specialist_appointments 
      SET status = $1, updated_at = NOW()
      WHERE id = $2 AND specialist_id = $3
      RETURNING *
    `, [statusMap[action], id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }
    
    res.json({
      success: true,
      message: `Appointment ${action}ed successfully`,
      appointment: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update appointment'
    });
  }
});

// Get assigned student's progress
router.get('/students/:studentId/progress', authenticateToken, isMentor, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Verify student is assigned to this mentor
    const mentorResult = await pool.query('SELECT id FROM mentors WHERE user_id = $1', [req.user.id]);
    if (mentorResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Mentor profile not found' });
    }
    
    const assignmentCheck = await pool.query(
      'SELECT * FROM student_mentors WHERE mentor_id = $1 AND student_id = $2 AND status = \'active\'',
      [mentorResult.rows[0].id, studentId]
    );
    
    if (assignmentCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'This student is not assigned to you'
      });
    }
    
    // Get student info
    const studentInfo = await pool.query(
      'SELECT id, username, email, avatar_url, points, level, streak_days FROM profiles WHERE id = $1',
      [studentId]
    );
    
    // Get recent tasks
    const tasks = await pool.query(`
      SELECT * FROM tasks 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 20
    `, [studentId]);
    
    // Get focus sessions (last 30 days)
    const focusSessions = await pool.query(`
      SELECT * FROM focus_sessions 
      WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
    `, [studentId]);
    
    // Get mood entries (last 30 days)
    const moodEntries = await pool.query(`
      SELECT * FROM mood_entries 
      WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
    `, [studentId]);
    
    // Get game scores (last 30 days)
    const gameScores = await pool.query(`
      SELECT gs.*, g.name as game_name 
      FROM game_scores gs
      JOIN games g ON gs.game_id = g.id
      WHERE gs.user_id = $1 AND gs.created_at > NOW() - INTERVAL '30 days'
      ORDER BY gs.created_at DESC
    `, [studentId]);
    
    // Calculate stats
    const completedTasks = tasks.rows.filter(t => t.status === 'done').length;
    const completedSessions = focusSessions.rows.filter(s => s.completed).length;
    const avgMood = moodEntries.rows.length > 0 
      ? moodEntries.rows.reduce((sum, m) => sum + (m.mood_intensity || 3), 0) / moodEntries.rows.length
      : 0;
    
    res.json({
      success: true,
      student: studentInfo.rows[0],
      progress: {
        tasks: tasks.rows,
        focusSessions: focusSessions.rows,
        moodEntries: moodEntries.rows,
        gameScores: gameScores.rows
      },
      stats: {
        completedTasks,
        totalTasks: tasks.rows.length,
        completedSessions,
        totalSessions: focusSessions.rows.length,
        averageMood: avgMood.toFixed(2),
        gamesPlayed: gameScores.rows.length
      }
    });
  } catch (error) {
    console.error('Student progress fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student progress'
    });
  }
});

// Accept/Reject appointment request
router.put('/appointments/:appointmentId/respond', authenticateToken, isMentor, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { action, notes } = req.body; // action: 'accept' or 'reject'
    
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action',
        message: 'Action must be either "accept" or "reject"'
      });
    }
    
    const mentorResult = await pool.query('SELECT id FROM mentors WHERE user_id = $1', [req.user.id]);
    if (mentorResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Mentor profile not found' });
    }
    
    const updatedAppointment = await pool.query(`
      UPDATE appointments 
      SET request_status = $1,
          notes = COALESCE($2, notes),
          status = CASE WHEN $1 = 'accepted' THEN 'scheduled' ELSE 'cancelled' END
      WHERE id = $3 AND mentor_id = $4 AND request_status = 'pending'
      RETURNING *
    `, [action === 'accept' ? 'accepted' : 'rejected', notes, appointmentId, mentorResult.rows[0].id]);
    
    if (updatedAppointment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found or already responded'
      });
    }
    
    res.json({
      success: true,
      message: `Appointment ${action}ed successfully`,
      appointment: updatedAppointment.rows[0]
    });
  } catch (error) {
    console.error('Appointment response error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to respond to appointment'
    });
  }
});

// Create workshop
router.post('/workshops', authenticateToken, isMentor, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      startTime,
      endTime,
      maxParticipants,
      location,
      sessionType,
      meetingLink
    } = req.body;
    
    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Title, start time, and end time are required'
      });
    }
    
    const workshopId = uuidv4();
    const newWorkshop = await pool.query(`
      INSERT INTO workshops (
        id, organizer_id, organizer_type, title, description, category,
        start_time, end_time, max_participants, location, session_type, meeting_link
      )
      VALUES ($1, $2, 'mentor', $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [workshopId, req.user.id, title, description, category, startTime, endTime, 
        maxParticipants || 50, location, sessionType || 'online', meetingLink]);
    
    res.status(201).json({
      success: true,
      message: 'Workshop created successfully',
      workshop: newWorkshop.rows[0]
    });
  } catch (error) {
    console.error('Workshop creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create workshop'
    });
  }
});

// Get mentor's workshops
router.get('/workshops', authenticateToken, isMentor, async (req, res) => {
  try {
    const workshops = await pool.query(`
      SELECT w.*, COUNT(wp.id) as participant_count,
        COALESCE(AVG(wp.rating), 0) as average_rating
      FROM workshops w
      LEFT JOIN workshop_participants wp ON w.id = wp.workshop_id
      WHERE w.organizer_id = $1 AND w.organizer_type = 'mentor'
      GROUP BY w.id
      ORDER BY w.start_time DESC
    `, [req.user.id]);
    
    res.json({
      success: true,
      workshops: workshops.rows
    });
  } catch (error) {
    console.error('Workshops fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workshops'
    });
  }
});

// Get mentor profile
router.get('/profile', authenticateToken, isMentor, async (req, res) => {
  try {
    const profile = await pool.query(`
      SELECT 
        username, 
        email, 
        bio, 
        specialization, 
        avatar_url,
        certifications,
        experience_years
      FROM profiles 
      WHERE id = $1
    `, [req.user.id]);
    
    if (profile.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }
    
    res.json({
      success: true,
      profile: {
        ...profile.rows[0],
        certifications: profile.rows[0].certifications || []
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
});

// Update mentor profile
router.put('/profile', authenticateToken, isMentor, async (req, res) => {
  try {
    const {
      username,
      bio,
      specialization,
      certifications,
      experience_years,
      avatar_url
    } = req.body;
    
    const updatedProfile = await pool.query(`
      UPDATE profiles 
      SET 
        username = COALESCE($1, username),
        bio = COALESCE($2, bio),
        specialization = COALESCE($3, specialization),
        certifications = COALESCE($4, certifications),
        experience_years = COALESCE($5, experience_years),
        avatar_url = COALESCE($6, avatar_url),
        updated_at = NOW()
      WHERE id = $7
      RETURNING username, email, bio, specialization, certifications, experience_years, avatar_url
    `, [username, bio, specialization, certifications, experience_years, avatar_url, req.user.id]);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: updatedProfile.rows[0]
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

module.exports = router;
