// utils/emailTemplates.js

const createEmailTemplate = (title, content, buttonText = null, buttonLink = null) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-top: 20px;
            margin-bottom: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .logo {
            font-size: 32px;
            margin-bottom: 10px;
        }
        .content {
            padding: 40px 30px;
        }
        .content h2 {
            color: #2d3748;
            margin-top: 0;
            margin-bottom: 20px;
        }
        .content p {
            margin-bottom: 16px;
            color: #4a5568;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 8px;
            margin: 20px 0;
            font-weight: 600;
            text-align: center;
            transition: transform 0.2s;
        }
        .button:hover {
            transform: translateY(-1px);
        }
        .footer {
            background: #f7fafc;
            padding: 20px 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
        }
        .footer p {
            margin: 0;
            color: #718096;
            font-size: 14px;
        }
        .social-links {
            margin: 15px 0;
        }
        .social-links a {
            color: #667eea;
            text-decoration: none;
            margin: 0 10px;
        }
        .highlight {
            background: linear-gradient(120deg, #667eea20 0%, #764ba220 100%);
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #667eea;
        }
        @media (max-width: 600px) {
            .container {
                margin: 10px;
                border-radius: 8px;
            }
            .content {
                padding: 20px;
            }
            .header {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🧠✨</div>
            <h1>MindSpark</h1>
            <p>Empowering Young Minds</p>
        </div>
        <div class="content">
            ${content}
            ${buttonText && buttonLink ? `
            <div style="text-align: center; margin: 30px 0;">
                <a href="${buttonLink}" class="button">${buttonText}</a>
            </div>
            ` : ''}
        </div>
        <div class="footer">
            <p>© 2025 MindSpark. Supporting children with ADHD and their families.</p>
            <div class="social-links">
                <a href="#">Privacy Policy</a> |
                <a href="#">Support</a> |
                <a href="#">Unsubscribe</a>
            </div>
        </div>
    </div>
</body>
</html>
  `;
};

const templates = {
  welcome: (username) => {
    const content = `
      <h2>Welcome to MindSpark, ${username}! 🎉</h2>
      <p>We're excited to have you join our community of young learners working to improve their focus, organization, and daily routines.</p>
      
      <div class="highlight">
        <h3>🚀 Getting Started</h3>
        <p>Here's what you can do right away:</p>
        <ul>
          <li><strong>Set up your first tasks</strong> - Create daily routines that work for you</li>
          <li><strong>Try our focus games</strong> - Fun activities designed to improve concentration</li>
          <li><strong>Track your mood</strong> - Understanding your feelings helps build better habits</li>
          <li><strong>Join chat rooms</strong> - Connect with other kids on similar journeys</li>
        </ul>
      </div>
      
      <p>Remember, every small step counts! Our team is here to support you every step of the way.</p>
      <p>If you have any questions, don't hesitate to reach out to our support team.</p>
      
      <p>Happy learning!</p>
      <p><strong>The MindSpark Team</strong></p>
    `;
    
    return createEmailTemplate(
      'Welcome to MindSpark!',
      content,
      'Start Your Journey',
      process.env.FRONTEND_URL || 'http://localhost:5173'
    );
  },

  achievementUnlocked: (username, achievementName, achievementDescription) => {
    const content = `
      <h2>🏆 Achievement Unlocked, ${username}!</h2>
      <p>Congratulations! You've just earned a new achievement!</p>
      
      <div class="highlight">
        <h3>🎯 ${achievementName}</h3>
        <p>${achievementDescription}</p>
      </div>
      
      <p>This is a fantastic milestone in your journey. Your dedication and hard work are really paying off!</p>
      <p>Keep up the amazing work, and remember that every achievement brings you one step closer to your goals.</p>
      
      <p>We're proud of your progress!</p>
      <p><strong>The MindSpark Team</strong></p>
    `;
    
    return createEmailTemplate(
      'Achievement Unlocked! 🏆',
      content,
      'View All Achievements',
      `${process.env.FRONTEND_URL || 'http://localhost:5173'}/achievements`
    );
  },

  weeklyProgress: (username, progressData) => {
    const content = `
      <h2>📊 Your Weekly Progress Report</h2>
      <p>Hi ${username}! Here's a summary of your amazing progress this week:</p>
      
      <div class="highlight">
        <h3>🎯 This Week's Achievements</h3>
        <ul>
          <li><strong>Tasks Completed:</strong> ${progressData.completedTasks || 0}</li>
          <li><strong>Points Earned:</strong> ${progressData.pointsEarned || 0} ⭐</li>
          <li><strong>Focus Minutes:</strong> ${progressData.focusMinutes || 0} minutes 🧘</li>
          <li><strong>Mood Tracking:</strong> ${progressData.moodTrackingDays || 0} days 😊</li>
          <li><strong>Current Streak:</strong> ${progressData.streakDays || 0} days 🔥</li>
        </ul>
      </div>
      
      ${progressData.recommendations && progressData.recommendations.length > 0 ? `
      <h3>💡 Recommendations for Next Week</h3>
      <ul>
        ${progressData.recommendations.map(rec => `<li><strong>${rec.title}:</strong> ${rec.message}</li>`).join('')}
      </ul>
      ` : ''}
      
      <p>You're making great progress! Remember, consistency is key, and every small step matters.</p>
      <p>Keep up the fantastic work!</p>
      
      <p><strong>The MindSpark Team</strong></p>
    `;
    
    return createEmailTemplate(
      'Your Weekly Progress Report 📊',
      content,
      'View Detailed Progress',
      `${process.env.FRONTEND_URL || 'http://localhost:5173'}/progress`
    );
  },

  appointmentReminder: (username, appointmentData) => {
    const appointmentDate = new Date(appointmentData.scheduledAt).toLocaleDateString();
    const appointmentTime = new Date(appointmentData.scheduledAt).toLocaleTimeString();
    
    const content = `
      <h2>📅 Appointment Reminder</h2>
      <p>Hi ${username}! This is a friendly reminder about your upcoming appointment.</p>
      
      <div class="highlight">
        <h3>👨‍⚕️ Appointment Details</h3>
        <ul>
          <li><strong>Specialist:</strong> ${appointmentData.specialistName}</li>
          <li><strong>Date:</strong> ${appointmentDate}</li>
          <li><strong>Time:</strong> ${appointmentTime}</li>
          <li><strong>Type:</strong> ${appointmentData.type}</li>
        </ul>
      </div>
      
      <h3>📝 Preparation Tips</h3>
      <ul>
        <li>Review any questions you'd like to ask</li>
        <li>Bring any relevant documents or notes</li>
        <li>Make sure to join a few minutes early</li>
      </ul>
      
      <p>If you need to reschedule or have any questions, please let us know as soon as possible.</p>
      
      <p><strong>The MindSpark Team</strong></p>
    `;
    
    return createEmailTemplate(
      'Appointment Reminder 📅',
      content,
      'View Appointment',
      `${process.env.FRONTEND_URL || 'http://localhost:5173'}/appointments`
    );
  },

  passwordReset: (username, resetToken) => {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
    const content = `
      <h2>🔐 Password Reset Request</h2>
      <p>Hi ${username}! We received a request to reset your password.</p>
      
      <p>If you requested this password reset, click the button below to create a new password:</p>
      
      <div class="highlight">
        <p><strong>⚠️ Important:</strong> This link will expire in 1 hour for your security.</p>
        <p>If you didn't request this password reset, please ignore this email. Your account is safe.</p>
      </div>
      
      <p>If you're having trouble with the button above, you can copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #667eea;">${resetLink}</p>
      
      <p><strong>The MindSpark Team</strong></p>
    `;
    
    return createEmailTemplate(
      'Password Reset 🔐',
      content,
      'Reset Password',
      resetLink
    );
  },

  parentNotification: (parentName, childName, notificationData) => {
    const content = `
      <h2>📱 Update from ${childName}</h2>
      <p>Hi ${parentName}! Here's an update on ${childName}'s progress in MindSpark:</p>
      
      <div class="highlight">
        <h3>📊 Recent Activity</h3>
        <p>${notificationData.message}</p>
      </div>
      
      ${notificationData.achievements ? `
      <h3>🏆 Recent Achievements</h3>
      <ul>
        ${notificationData.achievements.map(achievement => `<li>${achievement}</li>`).join('')}
      </ul>
      ` : ''}
      
      <p>${childName} is making great progress! These regular updates help you stay connected with their learning journey.</p>
      <p>If you have any questions about ${childName}'s progress, feel free to reach out to us.</p>
      
      <p><strong>The MindSpark Team</strong></p>
    `;
    
    return createEmailTemplate(
      `Update from ${childName} 📱`,
      content,
      'View Full Report',
      `${process.env.FRONTEND_URL || 'http://localhost:5173'}/parent-dashboard`
    );
  },

  taskReminder: (username, taskData) => {
    const dueDate = new Date(taskData.dueDate).toLocaleDateString();
    
    const content = `
      <h2>⏰ Task Reminder</h2>
      <p>Hi ${username}! Just a friendly reminder about an upcoming task.</p>
      
      <div class="highlight">
        <h3>📋 Task Details</h3>
        <ul>
          <li><strong>Task:</strong> ${taskData.title}</li>
          <li><strong>Due Date:</strong> ${dueDate}</li>
          <li><strong>Priority:</strong> ${taskData.priority}</li>
          <li><strong>Points Reward:</strong> ${taskData.pointsReward} ⭐</li>
        </ul>
        ${taskData.description ? `<p><strong>Description:</strong> ${taskData.description}</p>` : ''}
      </div>
      
      <p>You've got this! Breaking tasks into smaller steps can make them feel more manageable.</p>
      <p>Remember, completing tasks on time helps build great habits and earns you awesome points!</p>
      
      <p><strong>The MindSpark Team</strong></p>
    `;
    
    return createEmailTemplate(
      'Task Reminder ⏰',
      content,
      'Complete Task',
      `${process.env.FRONTEND_URL || 'http://localhost:5173'}/tasks`
    );
  }
};

module.exports = {
  createEmailTemplate,
  templates
};
