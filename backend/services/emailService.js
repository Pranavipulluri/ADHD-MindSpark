const nodemailer = require('nodemailer');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  async initialize() {
    try {
      // Create email transporter
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        await this.transporter.verify();
        console.log('📧 Email service initialized successfully');
      } else {
        console.warn('⚠️ Email service not configured (missing SMTP credentials)');
      }
    } catch (error) {
      console.error('❌ Email service initialization failed:', error.message);
      this.transporter = null;
    }
  }

  async sendEmail(to, subject, htmlContent, textContent = null) {
    if (!this.transporter) {
      console.warn('Email service not available, skipping email send');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const mailOptions = {
        from: `"MindSpark" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        html: htmlContent,
        text: textContent || this.htmlToText(htmlContent)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('📧 Email sent successfully:', result.messageId);
      
      // Log email in database for tracking
      await this.logEmail(to, subject, 'sent', result.messageId);
      
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Email send failed:', error.message);
      await this.logEmail(to, subject, 'failed', null, error.message);
      return { success: false, error: error.message };
    }
  }

  async logEmail(to, subject, status, messageId = null, error = null) {
    try {
      await pool.query(`
        INSERT INTO email_logs (recipient, subject, status, message_id, error_message, sent_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        Array.isArray(to) ? to.join(', ') : to,
        subject,
        status,
        messageId,
        error
      ]);
    } catch (dbError) {
      console.error('Failed to log email:', dbError.message);
    }
  }

  htmlToText(html) {
    // Simple HTML to text conversion
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  // Email Templates

  getWelcomeEmailTemplate(username, activationLink = null) {
    return {
      subject: 'Welcome to MindSpark! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to MindSpark</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #8657ED, #9A87FF); color: white; padding: 40px 20px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 30px; }
            .content h2 { color: #333; font-size: 24px; margin-bottom: 20px; }
            .content p { color: #666; line-height: 1.6; margin-bottom: 20px; }
            .button { display: inline-block; background: #8657ED; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .features { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .feature { margin-bottom: 15px; }
            .feature h3 { color: #8657ED; margin: 0 0 5px 0; font-size: 16px; }
            .feature p { margin: 0; color: #666; font-size: 14px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🧠 Welcome to MindSpark!</h1>
            </div>
            <div class="content">
              <h2>Hi ${username}! 👋</h2>
              <p>We're so excited to have you join the MindSpark community! Our platform is designed to help children with ADHD thrive through engaging games, helpful tools, and supportive community features.</p>
              
              ${activationLink ? `
                <p>To get started, please click the button below to activate your account:</p>
                <a href="${activationLink}" class="button">Activate Your Account</a>
              ` : ''}
              
              <div class="features">
                <div class="feature">
                  <h3>🎮 Engaging Games</h3>
                  <p>Play fun games designed to improve focus, memory, and cognitive skills.</p>
                </div>
                <div class="feature">
                  <h3>📝 Task Management</h3>
                  <p>Organize your tasks and track your progress with our intuitive system.</p>
                </div>
                <div class="feature">
                  <h3>🧘 Focus Tools</h3>
                  <p>Practice mindfulness and improve concentration with guided sessions.</p>
                </div>
                <div class="feature">
                  <h3>👥 Community Support</h3>
                  <p>Connect with others who understand your journey and share experiences.</p>
                </div>
                <div class="feature">
                  <h3>👨‍⚕️ Expert Guidance</h3>
                  <p>Book sessions with ADHD specialists and get professional support.</p>
                </div>
              </div>
              
              <p>Ready to start your amazing journey with MindSpark? Log in to your account and explore all the wonderful features we have to offer!</p>
              
              <p>If you have any questions or need help getting started, don't hesitate to reach out to our support team.</p>
              
              <p>Welcome aboard! 🚀</p>
              <p><strong>The MindSpark Team</strong></p>
            </div>
            <div class="footer">
              <p>This email was sent to you because you created an account with MindSpark.</p>
              <p>If you have any questions, please contact us at support@mindspark.com</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  getPasswordResetTemplate(username, resetLink) {
    return {
      subject: 'Reset Your MindSpark Password 🔐',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #8657ED, #9A87FF); color: white; padding: 40px 20px; text-align: center; }
            .content { padding: 40px 30px; }
            .button { display: inline-block; background: #8657ED; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${username},</h2>
              <p>We received a request to reset your MindSpark password. If you made this request, click the button below to reset your password:</p>
              
              <a href="${resetLink}" class="button">Reset My Password</a>
              
              <div class="warning">
                <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
              </div>
              
              <p>If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.</p>
              
              <p>For security reasons, if you continue to receive unwanted password reset emails, please contact our support team.</p>
              
              <p>Stay safe,<br><strong>The MindSpark Security Team</strong></p>
            </div>
            <div class="footer">
              <p>If you're having trouble clicking the button, copy and paste this URL into your browser:</p>
              <p>${resetLink}</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  getAppointmentConfirmationTemplate(username, appointment) {
    const appointmentDate = new Date(appointment.appointment_date);
    return {
      subject: `Appointment Confirmed - ${appointmentDate.toLocaleDateString()} 📅`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appointment Confirmed</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #4CAF50, #66BB6A); color: white; padding: 40px 20px; text-align: center; }
            .content { padding: 40px 30px; }
            .appointment-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .detail-label { font-weight: 600; color: #333; }
            .detail-value { color: #666; }
            .button { display: inline-block; background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Appointment Confirmed!</h1>
            </div>
            <div class="content">
              <h2>Hi ${username},</h2>
              <p>Great news! Your appointment has been confirmed. Here are the details:</p>
              
              <div class="appointment-details">
                <div class="detail-row">
                  <span class="detail-label">Specialist:</span>
                  <span class="detail-value">${appointment.specialist_name}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Date & Time:</span>
                  <span class="detail-value">${appointmentDate.toLocaleString()}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Duration:</span>
                  <span class="detail-value">${appointment.duration_minutes} minutes</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Session Type:</span>
                  <span class="detail-value">${appointment.session_type}</span>
                </div>
                ${appointment.meeting_link ? `
                <div class="detail-row">
                  <span class="detail-label">Meeting Link:</span>
                  <span class="detail-value"><a href="${appointment.meeting_link}">Join Session</a></span>
                </div>
                ` : ''}
              </div>
              
              <p>We'll send you a reminder 24 hours before your appointment. If you need to reschedule or cancel, please do so at least 24 hours in advance.</p>
              
              <p>To prepare for your session, you might want to:</p>
              <ul>
                <li>Think about any questions or concerns you'd like to discuss</li>
                <li>Prepare a quiet, comfortable space for the session</li>
                <li>Test your internet connection if it's a video session</li>
              </ul>
              
              <p>Looking forward to seeing you soon!</p>
              <p><strong>The MindSpark Team</strong></p>
            </div>
            <div class="footer">
              <p>Need to make changes? Contact us at support@mindspark.com</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  getAchievementUnlockedTemplate(username, achievement) {
    return {
      subject: `🏆 Achievement Unlocked: ${achievement.name}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Achievement Unlocked!</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #FFD700, #FFA500); color: white; padding: 40px 20px; text-align: center; }
            .content { padding: 40px 30px; text-align: center; }
            .achievement-badge { background: ${achievement.badge_color}; color: white; padding: 30px; border-radius: 15px; margin: 20px 0; }
            .achievement-icon { font-size: 48px; margin-bottom: 15px; }
            .achievement-name { font-size: 24px; font-weight: 600; margin-bottom: 10px; }
            .achievement-description { font-size: 16px; opacity: 0.9; }
            .button { display: inline-block; background: #8657ED; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Congratulations ${username}!</h1>
            </div>
            <div class="content">
              <h2>You've unlocked a new achievement!</h2>
              
              <div class="achievement-badge">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-description">${achievement.description}</div>
              </div>
              
              <p>Way to go! You're making amazing progress on your MindSpark journey. Keep up the fantastic work!</p>
              
              <a href="${process.env.FRONTEND_URL}/dashboard" class="button">View Your Progress</a>
              
              <p>Every achievement brings you one step closer to reaching your full potential. We're proud of your dedication and hard work!</p>
              
              <p><strong>The MindSpark Team</strong></p>
            </div>
            <div class="footer">
              <p>Keep exploring MindSpark to unlock more achievements!</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  getWeeklyProgressTemplate(username, weeklyStats) {
    return {
      subject: `📊 Your Weekly Progress Report`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Weekly Progress Report</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #8657ED, #9A87FF); color: white; padding: 40px 20px; text-align: center; }
            .content { padding: 40px 30px; }
            .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
            .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
            .stat-value { font-size: 24px; font-weight: 600; color: #8657ED; }
            .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
            .progress-item { display: flex; align-items: center; margin-bottom: 15px; }
            .progress-icon { font-size: 20px; margin-right: 15px; }
            .progress-text { flex: 1; }
            .button { display: inline-block; background: #8657ED; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Your Weekly Progress</h1>
            </div>
            <div class="content">
              <h2>Hi ${username}! 👋</h2>
              <p>Here's a summary of your amazing progress this week:</p>
              
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-value">${weeklyStats.tasksCompleted}</div>
                  <div class="stat-label">Tasks Completed</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${weeklyStats.gamesPlayed}</div>
                  <div class="stat-label">Games Played</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${weeklyStats.pointsEarned}</div>
                  <div class="stat-label">Points Earned</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">${weeklyStats.streakDays}</div>
                  <div class="stat-label">Day Streak</div>
                </div>
              </div>
              
              <h3>This Week's Highlights:</h3>
              <div class="progress-item">
                <div class="progress-icon">🎯</div>
                <div class="progress-text">Completed ${weeklyStats.tasksCompleted} tasks - that's ${weeklyStats.taskImprovement > 0 ? 'an increase' : 'consistent'} with last week!</div>
              </div>
              <div class="progress-item">
                <div class="progress-icon">🎮</div>
                <div class="progress-text">Played ${weeklyStats.gamesPlayed} games and improved your focus skills</div>
              </div>
              <div class="progress-item">
                <div class="progress-icon">🧘</div>
                <div class="progress-text">Completed ${weeklyStats.focusSessions} focus sessions</div>
              </div>
              <div class="progress-item">
                <div class="progress-icon">😊</div>
                <div class="progress-text">Tracked your mood ${weeklyStats.moodEntries} times</div>
              </div>
              
              <p>Keep up the fantastic work! You're building great habits and making steady progress.</p>
              
              <a href="${process.env.FRONTEND_URL}/progress" class="button">View Full Progress Report</a>
              
              <p>Remember, every small step counts. We're cheering you on!</p>
              <p><strong>The MindSpark Team</strong></p>
            </div>
            <div class="footer">
              <p>You can update your email preferences in your account settings.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  // Notification Methods

  async sendWelcomeEmail(userEmail, username, activationLink = null) {
    const template = this.getWelcomeEmailTemplate(username, activationLink);
    return await this.sendEmail(userEmail, template.subject, template.html);
  }

  async sendPasswordResetEmail(userEmail, username, resetLink) {
    const template = this.getPasswordResetTemplate(username, resetLink);
    return await this.sendEmail(userEmail, template.subject, template.html);
  }

  async sendAppointmentConfirmation(userEmail, username, appointment) {
    const template = this.getAppointmentConfirmationTemplate(username, appointment);
    return await this.sendEmail(userEmail, template.subject, template.html);
  }

  async sendAchievementNotification(userEmail, username, achievement) {
    const template = this.getAchievementUnlockedTemplate(username, achievement);
    return await this.sendEmail(userEmail, template.subject, template.html);
  }

  async sendWeeklyProgressReport(userEmail, username, weeklyStats) {
    const template = this.getWeeklyProgressTemplate(username, weeklyStats);
    return await this.sendEmail(userEmail, template.subject, template.html);
  }

  async sendAppointmentReminder(userEmail, username, appointment) {
    const appointmentDate = new Date(appointment.appointment_date);
    const template = {
      subject: `Reminder: Appointment Tomorrow at ${appointmentDate.toLocaleTimeString()} ⏰`,
      html: `
        <h2>Hi ${username},</h2>
        <p>This is a friendly reminder that you have an appointment scheduled for tomorrow:</p>
        <p><strong>Date & Time:</strong> ${appointmentDate.toLocaleString()}<br>
        <strong>Specialist:</strong> ${appointment.specialist_name}<br>
        <strong>Session Type:</strong> ${appointment.session_type}</p>
        ${appointment.meeting_link ? `<p><strong>Meeting Link:</strong> <a href="${appointment.meeting_link}">Join Session</a></p>` : ''}
        <p>See you tomorrow!</p>
        <p><strong>The MindSpark Team</strong></p>
      `
    };
    return await this.sendEmail(userEmail, template.subject, template.html);
  }

  // Bulk email methods
  async sendBulkEmail(recipients, subject, htmlContent) {
    const results = [];
    for (const recipient of recipients) {
      const result = await this.sendEmail(recipient.email, subject, htmlContent);
      results.push({ email: recipient.email, ...result });
    }
    return results;
  }
}

// Create and export singleton instance
const emailService = new EmailService();

module.exports = emailService;