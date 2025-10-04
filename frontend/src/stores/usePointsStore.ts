import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../lib/api';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  unlockedAt?: Date;
}

interface PointsState {
  totalPoints: number;
  level: number;
  streakDays: number;
  achievements: Achievement[];
  recentActivities: Array<{
    id: string;
    type: string;
    points: number;
    description: string;
    timestamp: Date;
  }>;
  gameStats: {
    gamesPlayed: number;
    tasksCompleted: number;
    breathingSessions: number;
    focusSessions: number;
    documentsProcessed: number;
    chatMessages: number;
  };
}

interface PointsActions {
  addPoints: (points: number, activity: string, description: string) => void;
  checkAchievements: () => void;
  updateStreak: () => void;
  getLevel: (points: number) => number;
  getPointsToNextLevel: (currentPoints: number) => number;
  syncWithBackend: (points: number, level: number) => void;
}

type PointsStore = PointsState & PointsActions;

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-steps', name: 'First Steps', description: 'Complete your first activity', icon: '🚀', points: 0 },
  { id: 'game-master', name: 'Game Master', description: 'Play 10 games', icon: '🎮', points: 100 },
  { id: 'focus-champion', name: 'Focus Champion', description: 'Complete 5 focus sessions', icon: '🎯', points: 150 },
  { id: 'breathing-expert', name: 'Breathing Expert', description: 'Complete 10 breathing exercises', icon: '🫁', points: 200 },
  { id: 'task-crusher', name: 'Task Crusher', description: 'Complete 20 tasks', icon: '✅', points: 250 },
  { id: 'streak-master', name: 'Streak Master', description: 'Maintain a 7-day streak', icon: '🔥', points: 300 },
  { id: 'point-collector', name: 'Point Collector', description: 'Earn 1000 points', icon: '💎', points: 1000 },
  { id: 'level-up', name: 'Level Up', description: 'Reach level 10', icon: '⭐', points: 1000 }
];

export const usePointsStore = create<PointsStore>()(
  persist(
    (set, get) => ({
      // State
      totalPoints: 0,
      level: 1,
      streakDays: 0,
      achievements: [],
      recentActivities: [],
      gameStats: {
        gamesPlayed: 0,
        tasksCompleted: 0,
        breathingSessions: 0,
        focusSessions: 0,
        documentsProcessed: 0,
        chatMessages: 0,
      },

      // Actions
      addPoints: async (points: number, activity: string, description: string) => {
        const state = get();
        
        try {
          // Send points to backend
          const response = await apiClient.updateExtensionPoints(points, activity);
          
          if (response.success) {
            const newPoints = response.total_points;
            const newLevel = get().getLevel(newPoints);
            
            const newActivity = {
              id: Date.now().toString(),
              type: activity,
              points,
              description,
              timestamp: new Date()
            };

            // Update game statistics
            const updatedGameStats = { ...state.gameStats };
            if (activity.includes('game') || activity.includes('tictactoe') || activity.includes('memory') || activity.includes('math') || activity.includes('word') || activity.includes('puzzle')) {
              updatedGameStats.gamesPlayed += 1;
            } else if (activity.includes('task')) {
              updatedGameStats.tasksCompleted += 1;
            } else if (activity.includes('breathing')) {
              updatedGameStats.breathingSessions += 1;
            } else if (activity.includes('focus')) {
              updatedGameStats.focusSessions += 1;
            } else if (activity.includes('document')) {
              updatedGameStats.documentsProcessed += 1;
            } else if (activity.includes('chat')) {
              updatedGameStats.chatMessages += 1;
            }

            set({
              totalPoints: newPoints,
              level: newLevel,
              recentActivities: [newActivity, ...state.recentActivities].slice(0, 20),
              gameStats: updatedGameStats
            });

            // Check for new achievements
            get().checkAchievements();

            // Show notification for points earned
            if (typeof window !== 'undefined') {
              const event = new CustomEvent('pointsEarned', {
                detail: { points, activity, description, newTotal: newPoints }
              });
              window.dispatchEvent(event);
            }
          }
        } catch (error) {
          console.error('Failed to update points:', error);
          // Fallback to local update if backend fails
          const newPoints = state.totalPoints + points;
          const newLevel = get().getLevel(newPoints);
          
          const newActivity = {
            id: Date.now().toString(),
            type: activity,
            points,
            description,
            timestamp: new Date()
          };

          // Update game statistics
          const updatedGameStats = { ...state.gameStats };
          if (activity.includes('game') || activity.includes('tictactoe') || activity.includes('memory') || activity.includes('math') || activity.includes('word') || activity.includes('puzzle')) {
            updatedGameStats.gamesPlayed += 1;
          } else if (activity.includes('task')) {
            updatedGameStats.tasksCompleted += 1;
          } else if (activity.includes('breathing')) {
            updatedGameStats.breathingSessions += 1;
          } else if (activity.includes('focus')) {
            updatedGameStats.focusSessions += 1;
          } else if (activity.includes('document')) {
            updatedGameStats.documentsProcessed += 1;
          } else if (activity.includes('chat')) {
            updatedGameStats.chatMessages += 1;
          }
          
          set({
            totalPoints: newPoints,
            level: newLevel,
            recentActivities: [newActivity, ...state.recentActivities].slice(0, 20),
            gameStats: updatedGameStats
          });
        }
      },

      checkAchievements: () => {
        const state = get();
        const newAchievements: Achievement[] = [];

        ACHIEVEMENTS.forEach(achievement => {
          const alreadyUnlocked = state.achievements.some(a => a.id === achievement.id);
          if (alreadyUnlocked) return;

          let shouldUnlock = false;

          switch (achievement.id) {
            case 'first-steps':
              shouldUnlock = state.recentActivities.length > 0;
              break;
            case 'game-master':
              shouldUnlock = state.recentActivities.filter(a => 
                a.type.includes('game') || a.type.includes('memory') || a.type.includes('tictactoe')
              ).length >= 10;
              break;
            case 'focus-champion':
              shouldUnlock = state.recentActivities.filter(a => 
                a.type.includes('focus') || a.type.includes('timer')
              ).length >= 5;
              break;
            case 'breathing-expert':
              shouldUnlock = state.recentActivities.filter(a => 
                a.type.includes('breathing')
              ).length >= 10;
              break;
            case 'task-crusher':
              shouldUnlock = state.recentActivities.filter(a => 
                a.type.includes('task')
              ).length >= 20;
              break;
            case 'streak-master':
              shouldUnlock = state.streakDays >= 7;
              break;
            case 'point-collector':
              shouldUnlock = state.totalPoints >= 1000;
              break;
            case 'level-up':
              shouldUnlock = state.level >= 10;
              break;
          }

          if (shouldUnlock) {
            const unlockedAchievement = { ...achievement, unlockedAt: new Date() };
            newAchievements.push(unlockedAchievement);

            // Show achievement notification
            if (typeof window !== 'undefined') {
              const event = new CustomEvent('achievementUnlocked', {
                detail: unlockedAchievement
              });
              window.dispatchEvent(event);
            }
          }
        });

        if (newAchievements.length > 0) {
          set({
            achievements: [...state.achievements, ...newAchievements]
          });
        }
      },

      updateStreak: () => {
        const today = new Date().toDateString();
        const lastActivity = get().recentActivities[0];
        
        if (lastActivity) {
          const lastActivityDate = new Date(lastActivity.timestamp).toDateString();
          const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
          
          if (lastActivityDate === today) {
            // Activity today, maintain or increase streak
            const state = get();
            if (state.streakDays === 0) {
              set({ streakDays: 1 });
            }
          } else if (lastActivityDate === yesterday) {
            // Activity yesterday, increase streak
            set({ streakDays: get().streakDays + 1 });
          } else {
            // No recent activity, reset streak
            set({ streakDays: 0 });
          }
        }
      },

      getLevel: (points: number) => {
        return Math.floor(points / 100) + 1;
      },

      getPointsToNextLevel: (currentPoints: number) => {
        const currentLevel = get().getLevel(currentPoints);
        const pointsForNextLevel = currentLevel * 100;
        return pointsForNextLevel - currentPoints;
      },

      syncWithBackend: (points: number, level: number) => {
        set({
          totalPoints: points,
          level: level
        });
      }
    }),
    {
      name: 'points-storage',
      partialize: (state) => ({
        totalPoints: state.totalPoints,
        level: state.level,
        streakDays: state.streakDays,
        achievements: state.achievements,
        recentActivities: state.recentActivities,
        gameStats: state.gameStats
      })
    }
  )
);

// Make store available globally for syncing
if (typeof window !== 'undefined') {
  (window as any).pointsStore = usePointsStore;
}