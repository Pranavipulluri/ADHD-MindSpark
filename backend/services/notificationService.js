// services/notificationService.js
const emailService = require('./emailService');
const WebSocketHandler = require('./websocketService');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.webSocketHandler = new WebSocketHandler();
  }

  // Send real-time notification via WebSocket
  async sendRealTimeNotification(userId, notification) {
    try {
      await this.webSocketHandler.sendToUser(userId, {
        type: 'notification',
        data: {
          id: require('uuid').v4(),
          title: notification.title,
          message: notification.message,
          type: notification.type || 'info',
          timestamp: new Date().toISOString(),
          action: notification.action || null
        }
      });

      logger.info(`Real-time notification sent to user ${userId}:`, notification.title);
    } catch (error) {
      logger.error('Failed to send real-time notification:', error);
    }
  }

  // Send email notification
  async sendEmailNotification(userEmail, notification) {
    try {
      await emailService.sendNotificationEmail(userEmail, {
        subject: notification.title,
        message: notification.message,
        type: notification.type || 'info',
        action: notification.action
      });

      logger.info(`Email notification sent to ${userEmail}:`, notification.title);
    } catch (error) {
      logger.error('Failed to send email notification:', error);
    }
  }

  // Send achievement notification
  async sendAchievementNotification(userId, userEmail, achievement) {
    const notification = {
      title: '🎉 Achievement Unlocked!',
      message: `Congratulations! You've earned the "${achievement.name}" achievement!`,
      type: 'achievement',
      action: {
        type: 'view_achievements',
        url: '/achievements'
      }
    };

    // Send both real-time and email notifications
    await Promise.all([
      this.sendRealTimeNotification(userId, notification),
      this.sendEmailNotification(userEmail, notification)
    ]);
  }

  // Send task reminder notification
  async sendTaskReminder(userId, userEmail, task) {
    const notification = {
      title: '⏰ Task Reminder',
      message: `Don't forget to complete "${task.title}" - it's due soon!`,
      type: 'reminder',
      action: {
        type: 'view_task',
        url: `/tasks/${task.id}`
      }
    };

    await Promise.all([
      this.sendRealTimeNotification(userId, notification),
      this.sendEmailNotification(userEmail, notification)
    ]);
  }

  // Send appointment reminder notification
  async sendAppointmentReminder(userId, userEmail, appointment) {
    const notification = {
      title: '👨‍⚕️ Appointment Reminder',
      message: `Your appointment with ${appointment.specialist_name} is scheduled for ${new Date(appointment.scheduled_at).toLocaleString()}`,
      type: 'appointment',
      action: {
        type: 'view_appointment',
        url: `/appointments/${appointment.id}`
      }
    };

    await Promise.all([
      this.sendRealTimeNotification(userId, notification),
      this.sendEmailNotification(userEmail, notification)
    ]);
  }

  // Send welcome notification for new users
  async sendWelcomeNotification(userId, userEmail, username) {
    const notification = {
      title: '🌟 Welcome to MindSpark!',
      message: `Hi ${username}! Welcome to MindSpark. Let's start your journey to better focus and organization!`,
      type: 'welcome',
      action: {
        type: 'get_started',
        url: '/dashboard'
      }
    };

    await this.sendRealTimeNotification(userId, notification);
    
    // Send welcome email with more detailed information
    await emailService.sendWelcomeEmail(userEmail, username);
  }

  // Send progress update notification
  async sendProgressUpdate(userId, userEmail, progressData) {
    const notification = {
      title: '📈 Weekly Progress Update',
      message: `Great work this week! You completed ${progressData.completedTasks} tasks and earned ${progressData.pointsEarned} points.`,
      type: 'progress',
      action: {
        type: 'view_progress',
        url: '/progress'
      }
    };

    await Promise.all([
      this.sendRealTimeNotification(userId, notification),
      this.sendEmailNotification(userEmail, notification)
    ]);
  }

  // Send level up notification
  async sendLevelUpNotification(userId, userEmail, newLevel) {
    const notification = {
      title: '🚀 Level Up!',
      message: `Amazing! You've reached level ${newLevel}! Keep up the great work!`,
      type: 'level_up',
      action: {
        type: 'view_profile',
        url: '/profile'
      }
    };

    await Promise.all([
      this.sendRealTimeNotification(userId, notification),
      this.sendEmailNotification(userEmail, notification)
    ]);
  }

  // Send streak milestone notification
  async sendStreakMilestone(userId, userEmail, streakDays) {
    let message;
    let milestone;

    if (streakDays === 7) {
      milestone = 'One Week';
      message = `🔥 You're on fire! You've maintained your streak for a whole week!`;
    } else if (streakDays === 30) {
      milestone = 'One Month';
      message = `🏆 Incredible! You've kept your streak going for a month!`;
    } else if (streakDays === 100) {
      milestone = '100 Days';
      message = `💯 Legendary! You've achieved a 100-day streak!`;
    } else if (streakDays % 7 === 0) {
      milestone = `${streakDays / 7} Weeks`;
      message = `🔥 Great consistency! You've maintained your streak for ${streakDays / 7} weeks!`;
    } else {
      return; // Don't send notification for non-milestone streaks
    }

    const notification = {
      title: `🔥 ${milestone} Streak!`,
      message: message,
      type: 'streak',
      action: {
        type: 'view_profile',
        url: '/profile'
      }
    };

    await Promise.all([
      this.sendRealTimeNotification(userId, notification),
      this.sendEmailNotification(userEmail, notification)
    ]);
  }

  // Send parent notification (for child accounts)
  async sendParentNotification(parentEmail, childName, notification) {
    const parentNotification = {
      title: `📱 Update from ${childName}`,
      message: notification.message,
      type: 'parent_update'
    };

    await this.sendEmailNotification(parentEmail, parentNotification);
  }

  // Batch send notifications
  async sendBatchNotifications(notifications) {
    const promises = notifications.map(async (notification) => {
      try {
        if (notification.email) {
          await this.sendEmailNotification(notification.email, notification);
        }
        if (notification.userId) {
          await this.sendRealTimeNotification(notification.userId, notification);
        }
      } catch (error) {
        logger.error(`Failed to send batch notification to ${notification.userId || notification.email}:`, error);
      }
    });

    await Promise.allSettled(promises);
    logger.info(`Sent ${notifications.length} batch notifications`);
  }
}

module.exports = new NotificationService();
