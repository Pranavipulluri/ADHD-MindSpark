const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware to check if user is an NGO
const isNGO = async (req, res, next) => {
  try {
    const userResult = await pool.query(
      'SELECT role FROM profiles WHERE id = $1',
      [req.user.id]
    );
    
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'ngo') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Only NGO accounts can access this resource'
      });
    }
    next();
  } catch (error) {
    console.error('NGO check error:', error);
    res.status(500).json({ success: false, error: 'Authorization failed' });
  }
};

// Setup NGO profile
router.post('/setup', authenticateToken, isNGO, async (req, res) => {
  try {
    const {
      organizationName,
      description,
      mission,
      websiteUrl,
      contactEmail,
      contactPhone,
      address,
      logoUrl
    } = req.body;
    
    if (!organizationName || !contactEmail) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Organization name and contact email are required'
      });
    }
    
    const ngoId = uuidv4();
    const newNGO = await pool.query(`
      INSERT INTO ngos (
        id, user_id, organization_name, description, mission, 
        website_url, contact_email, contact_phone, address, logo_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id) 
      DO UPDATE SET
        organization_name = EXCLUDED.organization_name,
        description = EXCLUDED.description,
        mission = EXCLUDED.mission,
        website_url = EXCLUDED.website_url,
        contact_email = EXCLUDED.contact_email,
        contact_phone = EXCLUDED.contact_phone,
        address = EXCLUDED.address,
        logo_url = EXCLUDED.logo_url,
        updated_at = NOW()
      RETURNING *
    `, [ngoId, req.user.id, organizationName, description, mission, 
        websiteUrl, contactEmail, contactPhone, address, logoUrl]);
    
    res.json({
      success: true,
      message: 'NGO profile created/updated successfully',
      ngo: newNGO.rows[0]
    });
  } catch (error) {
    console.error('NGO setup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup NGO profile'
    });
  }
});

// Get NGO dashboard data
router.get('/dashboard', authenticateToken, isNGO, async (req, res) => {
  try {
    // Get NGO profile
    const ngoResult = await pool.query(
      'SELECT * FROM ngos WHERE user_id = $1',
      [req.user.id]
    );
    
    if (ngoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NGO profile not found',
        message: 'Please complete your NGO profile setup first'
      });
    }
    
    const ngo = ngoResult.rows[0];
    
    // Get workshops
    const workshops = await pool.query(`
      SELECT w.*, COUNT(wp.id) as participant_count,
        COALESCE(AVG(wp.rating), 0) as average_rating
      FROM workshops w
      LEFT JOIN workshop_participants wp ON w.id = wp.workshop_id
      WHERE w.organizer_id = $1 AND w.organizer_type = 'ngo'
      GROUP BY w.id
      ORDER BY w.start_time DESC
    `, [req.user.id]);
    
    // Get upcoming workshops
    const upcomingWorkshops = workshops.rows.filter(w => 
      new Date(w.start_time) > new Date() && w.status === 'scheduled'
    );
    
    // Get completed workshops
    const completedWorkshops = workshops.rows.filter(w => w.status === 'completed');
    
    // Calculate total participants across all workshops
    const totalParticipants = workshops.rows.reduce((sum, w) => 
      sum + parseInt(w.participant_count || 0), 0
    );
    
    res.json({
      success: true,
      ngo: ngo,
      workshops: workshops.rows,
      stats: {
        totalWorkshops: workshops.rows.length,
        upcomingWorkshops: upcomingWorkshops.length,
        completedWorkshops: completedWorkshops.length,
        totalParticipants: totalParticipants,
        isVerified: ngo.is_verified
      }
    });
  } catch (error) {
    console.error('NGO dashboard fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data'
    });
  }
});

// Create workshop
router.post('/workshops', authenticateToken, isNGO, async (req, res) => {
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
      VALUES ($1, $2, 'ngo', $3, $4, $5, $6, $7, $8, $9, $10, $11)
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

// Update workshop
router.put('/workshops/:workshopId', authenticateToken, isNGO, async (req, res) => {
  try {
    const { workshopId } = req.params;
    const {
      title,
      description,
      category,
      startTime,
      endTime,
      maxParticipants,
      location,
      sessionType,
      meetingLink,
      status
    } = req.body;
    
    const updatedWorkshop = await pool.query(`
      UPDATE workshops 
      SET 
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        start_time = COALESCE($4, start_time),
        end_time = COALESCE($5, end_time),
        max_participants = COALESCE($6, max_participants),
        location = COALESCE($7, location),
        session_type = COALESCE($8, session_type),
        meeting_link = COALESCE($9, meeting_link),
        status = COALESCE($10, status),
        updated_at = NOW()
      WHERE id = $11 AND organizer_id = $12 AND organizer_type = 'ngo'
      RETURNING *
    `, [title, description, category, startTime, endTime, maxParticipants, 
        location, sessionType, meetingLink, status, workshopId, req.user.id]);
    
    if (updatedWorkshop.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workshop not found or access denied'
      });
    }
    
    res.json({
      success: true,
      message: 'Workshop updated successfully',
      workshop: updatedWorkshop.rows[0]
    });
  } catch (error) {
    console.error('Workshop update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update workshop'
    });
  }
});

// Get workshop participants
router.get('/workshops/:workshopId/participants', authenticateToken, isNGO, async (req, res) => {
  try {
    const { workshopId } = req.params;
    
    // Verify workshop belongs to this NGO
    const workshopCheck = await pool.query(
      'SELECT * FROM workshops WHERE id = $1 AND organizer_id = $2 AND organizer_type = \'ngo\'',
      [workshopId, req.user.id]
    );
    
    if (workshopCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Workshop not found or access denied'
      });
    }
    
    const participants = await pool.query(`
      SELECT wp.*, p.username, p.email, p.avatar_url
      FROM workshop_participants wp
      JOIN profiles p ON wp.user_id = p.id
      WHERE wp.workshop_id = $1
      ORDER BY wp.registration_date DESC
    `, [workshopId]);
    
    res.json({
      success: true,
      workshop: workshopCheck.rows[0],
      participants: participants.rows
    });
  } catch (error) {
    console.error('Participants fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch participants'
    });
  }
});

// Get all NGO workshops
router.get('/workshops', authenticateToken, isNGO, async (req, res) => {
  try {
    const workshops = await pool.query(`
      SELECT w.*, COUNT(wp.id) as participant_count,
        COALESCE(AVG(wp.rating), 0) as average_rating
      FROM workshops w
      LEFT JOIN workshop_participants wp ON w.id = wp.workshop_id
      WHERE w.organizer_id = $1 AND w.organizer_type = 'ngo'
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

module.exports = router;
