import { Calendar, Edit2, Mail, Star, Trophy, User, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { usePointsStore } from '../../stores/usePointsStore';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  dateOfBirth: string;
  points: number;
  level: number;
  streakDays: number;
  gamesPlayed: number;
  tasksCompleted: number;
  breathingSessions: number;
  badges: string[];
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useAuthStore();
  const { totalPoints, level, achievements, recentActivities, gameStats } = usePointsStore();
  
  // Use game stats from store
  const gamesPlayed = gameStats.gamesPlayed;
  const tasksCompleted = gameStats.tasksCompleted;
  const breathingSessions = gameStats.breathingSessions;
  const focusSessions = gameStats.focusSessions;
  
  // Calculate streak days (simplified - days with any activity)
  const today = new Date();
  const streakDays = calculateStreakDays();
  
  function calculateStreakDays(): number {
    const activityDates = recentActivities.map(a => 
      new Date(a.timestamp).toDateString()
    );
    const uniqueDates = [...new Set(activityDates)].sort();
    
    let streak = 0;
    const todayStr = today.toDateString();
    
    for (let i = 0; i < uniqueDates.length; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      
      if (uniqueDates.includes(checkDate.toDateString())) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }
  
  const [profile, setProfile] = useState<UserProfile>({
    id: user?.id || '1',
    username: user?.username || 'Guest User',
    email: user?.email || 'guest@example.com',
    dateOfBirth: user?.date_of_birth || '2010-01-01',
    points: totalPoints,
    level: level,
    streakDays: streakDays,
    gamesPlayed: gamesPlayed,
    tasksCompleted: tasksCompleted,
    breathingSessions: breathingSessions,
    badges: achievements.map(a => a.name)
  });
  
  // Update profile when user data changes
  useEffect(() => {
    if (user) {
      setProfile(prev => ({
        ...prev,
        id: user.id,
        username: user.username,
        email: user.email,
        dateOfBirth: user.date_of_birth || prev.dateOfBirth,
        points: totalPoints,
        level: level,
        streakDays: streakDays,
        gamesPlayed: gamesPlayed,
        tasksCompleted: tasksCompleted,
        breathingSessions: breathingSessions,
        badges: achievements.map(a => a.name)
      }));
    }
  }, [user, totalPoints, level, achievements, recentActivities]);

  const [editForm, setEditForm] = useState({
    username: profile.username,
    email: profile.email,
    dateOfBirth: profile.dateOfBirth
  });
  
  // Update edit form when profile changes
  useEffect(() => {
    setEditForm({
      username: profile.username,
      email: profile.email,
      dateOfBirth: profile.dateOfBirth
    });
  }, [profile]);

  const handleSave = () => {
    setProfile(prev => ({
      ...prev,
      username: editForm.username,
      email: editForm.email,
      dateOfBirth: editForm.dateOfBirth
    }));
    setIsEditing(false);
  };

  const getBadgeColor = (badge: string) => {
    const colors = {
      'First Steps': 'bg-blue-100 text-blue-800',
      'Game Master': 'bg-purple-100 text-purple-800',
      'Focus Champion': 'bg-green-100 text-green-800',
      'Breathing Expert': 'bg-teal-100 text-teal-800',
      'Task Crusher': 'bg-orange-100 text-orange-800',
      'Streak Master': 'bg-red-100 text-red-800'
    };
    return colors[badge as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getNextLevelPoints = () => {
    return (profile.level * 100) - (profile.points % 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-12 h-12 text-white" />
          </div>
          
          {!isEditing ? (
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">{profile.username}</h2>
              <p className="text-gray-600 mb-2">{profile.email}</p>
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center space-x-1 text-purple-600 hover:text-purple-700 text-sm"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="text"
                value={editForm.username}
                onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                placeholder="Username"
              />
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                placeholder="Email"
              />
              <input
                type="date"
                value={editForm.dateOfBirth}
                onChange={(e) => setEditForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
              />
              <div className="flex space-x-3">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Level and Points */}
        <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-purple-800">Level {profile.level}</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-800">{profile.points}</div>
              <div className="text-sm text-purple-600">points</div>
            </div>
          </div>
          
          <div className="w-full bg-white rounded-full h-3 mb-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${((profile.points % 100) / 100) * 100}%` }}
            ></div>
          </div>
          <div className="text-sm text-purple-600 text-center">
            {getNextLevelPoints()} points to next level
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{profile.streakDays}</div>
            <div className="text-sm text-blue-700">Day Streak</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{profile.gamesPlayed}</div>
            <div className="text-sm text-green-700">Games Played</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{profile.tasksCompleted}</div>
            <div className="text-sm text-orange-700">Tasks Done</div>
          </div>
          <div className="text-center p-3 bg-teal-50 rounded-lg">
            <div className="text-2xl font-bold text-teal-600">{profile.breathingSessions}</div>
            <div className="text-sm text-teal-700">Breathing</div>
          </div>
        </div>

        {/* Badges */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Star className="w-5 h-5 text-yellow-500 mr-2" />
            Badges Earned
          </h3>
          <div className="flex flex-wrap gap-2">
            {profile.badges.map((badge, index) => (
              <span
                key={index}
                className={`px-3 py-1 rounded-full text-sm font-medium ${getBadgeColor(badge)}`}
              >
                {badge}
              </span>
            ))}
          </div>
        </div>

        {/* Personal Info */}
        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-3">Personal Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Email:</span>
              <span>{profile.email}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Birthday:</span>
              <span>{new Date(profile.dateOfBirth).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;