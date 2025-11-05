const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { authenticateToken, authRateLimit } = require('../middleware/auth');
const { validate, registerSchema, loginSchema, profileUpdateSchema } = require('../middleware/validation');
const config = require('../config');

const router = express.Router();

// Helper function to generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

// Register new user
router.post('/register', authRateLimit, validate(registerSchema), async (req, res) => {
  try {
    const { email, password, username, dateOfBirth, parentEmail, role } = req.validatedData;
    
    // Validate role
    const userRole = role || 'student';
    const validRoles = ['student', 'mentor', 'ngo'];
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role specified'
      });
    }
    
    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM profiles WHERE email = $1 OR username = $2',
      [email, username]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        success: false,
        error: 'User with this email or username already exists' 
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, config.security.bcryptRounds);
    
    // Create user profile
    const userId = uuidv4();
    const newUser = await pool.query(`
      INSERT INTO profiles (id, email, username, password_hash, date_of_birth, parent_email, points, level, role)
      VALUES ($1, $2, $3, $4, $5, $6, 0, 1, $7)
      RETURNING id, email, username, points, level, role, created_at
    `, [userId, email, username, hashedPassword, dateOfBirth, parentEmail, userRole]);
    
    const user = newUser.rows[0];
    const token = generateToken(user);
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        points: user.points,
        level: user.level,
        role: user.role
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  }
});

// Login user
router.post('/login', authRateLimit, validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.validatedData;
    
    // Find user
    const userResult = await pool.query(
      'SELECT * FROM profiles WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }
    
    const user = userResult.rows[0];
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }
    
    // Update last activity
    await pool.query(
      'UPDATE profiles SET last_activity = NOW() WHERE id = $1',
      [user.id]
    );
    
    const token = generateToken(user);
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        points: user.points,
        level: user.level,
        avatar_url: user.avatar_url,
        streak_days: user.streak_days,
        role: user.role || 'student'
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query(`
      SELECT id, email, username, avatar_url, date_of_birth, parent_email, 
             points, level, streak_days, preferences, last_activity, created_at
      FROM profiles WHERE id = $1
    `, [req.user.id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Profile not found',
        message: 'User profile could not be found'
      });
    }
    
    res.json({ 
      success: true,
      user: userResult.rows[0] 
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Profile fetch failed',
      message: 'An error occurred while fetching profile'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, validate(profileUpdateSchema), async (req, res) => {
  try {
    const { username, avatar_url, date_of_birth, parent_email, preferences } = req.validatedData;
    
    // Check if username is already taken by another user
    if (username) {
      const existingUser = await pool.query(
        'SELECT id FROM profiles WHERE username = $1 AND id != $2',
        [username, req.user.id]
      );
      
      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Username already taken',
          message: 'This username is already in use by another account'
        });
      }
    }
    
    const updatedUser = await pool.query(`
      UPDATE profiles 
      SET username = COALESCE($1, username),
          avatar_url = COALESCE($2, avatar_url),
          date_of_birth = COALESCE($3, date_of_birth),
          parent_email = COALESCE($4, parent_email),
          preferences = COALESCE($5, preferences),
          updated_at = NOW()
      WHERE id = $6
      RETURNING id, email, username, avatar_url, date_of_birth, parent_email, 
                points, level, streak_days, preferences, updated_at
    `, [username, avatar_url, date_of_birth, parent_email, 
        preferences ? JSON.stringify(preferences) : null, req.user.id]);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser.rows[0]
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Profile update failed',
      message: 'An error occurred while updating profile'
    });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Current password and new password are required'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password too short',
        message: 'New password must be at least 6 characters long'
      });
    }
    
    // Get current password hash
    const userResult = await pool.query(
      'SELECT password_hash FROM profiles WHERE id = $1',
      [req.user.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid current password',
        message: 'The current password you entered is incorrect'
      });
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, config.security.bcryptRounds);
    
    // Update password
    await pool.query(
      'UPDATE profiles SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hashedNewPassword, req.user.id]
    );
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      error: 'Password change failed',
      message: 'An error occurred while changing password'
    });
  }
});

// Delete account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password required',
        message: 'Password confirmation is required to delete account'
      });
    }
    
    // Verify password
    const userResult = await pool.query(
      'SELECT password_hash FROM profiles WHERE id = $1',
      [req.user.id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const validPassword = await bcrypt.compare(password, userResult.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password',
        message: 'Password confirmation failed'
      });
    }
    
    // Delete user account (cascade will handle related records)
    await pool.query('DELETE FROM profiles WHERE id = $1', [req.user.id]);
    
    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Account deletion failed',
      message: 'An error occurred while deleting account'
    });
  }
});

module.exports = router;