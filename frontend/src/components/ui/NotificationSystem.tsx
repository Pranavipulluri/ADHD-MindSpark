import { Plus, Trophy } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface Notification {
  id: string;
  type: 'points' | 'achievement' | 'level';
  title: string;
  message: string;
  icon: string;
  color: string;
}

const NotificationSystem: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const handlePointsEarned = (event: CustomEvent) => {
      const { points, description, newTotal } = event.detail;
      
      const notification: Notification = {
        id: Date.now().toString(),
        type: 'points',
        title: `+${points} Points!`,
        message: description,
        icon: '🎉',
        color: 'bg-green-500'
      };

      showNotification(notification);
    };

    const handleAchievementUnlocked = (event: CustomEvent) => {
      const achievement = event.detail;
      
      const notification: Notification = {
        id: Date.now().toString() + '_achievement',
        type: 'achievement',
        title: 'Achievement Unlocked!',
        message: `${achievement.icon} ${achievement.name}`,
        icon: '🏆',
        color: 'bg-purple-500'
      };

      showNotification(notification);
    };

    window.addEventListener('pointsEarned', handlePointsEarned as EventListener);
    window.addEventListener('achievementUnlocked', handleAchievementUnlocked as EventListener);

    return () => {
      window.removeEventListener('pointsEarned', handlePointsEarned as EventListener);
      window.removeEventListener('achievementUnlocked', handleAchievementUnlocked as EventListener);
    };
  }, []);

  const showNotification = (notification: Notification) => {
    setNotifications(prev => [...prev, notification]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 4000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`${notification.color} text-white px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 max-w-sm cursor-pointer hover:scale-105`}
          onClick={() => removeNotification(notification.id)}
        >
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{notification.icon}</span>
            <div className="flex-1">
              <div className="font-semibold text-sm">{notification.title}</div>
              <div className="text-xs opacity-90">{notification.message}</div>
            </div>
            {notification.type === 'points' && (
              <Plus className="w-4 h-4" />
            )}
            {notification.type === 'achievement' && (
              <Trophy className="w-4 h-4" />
            )}
          </div>
        </div>
      ))}
      

    </div>
  );
};

export default NotificationSystem;