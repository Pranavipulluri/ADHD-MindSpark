import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../lib/api';

interface User {
  id: string;
  email: string;
  username: string;
  points: number;
  level: number;
  avatar_url?: string;
  streak_days?: number;
  role?: 'student' | 'mentor' | 'ngo';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: {
        id: 'demo-user',
        email: 'demo@mindspark.com',
        username: 'Demo User',
        points: 100,
        level: 2
      },
      isAuthenticated: true,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.login(email, password);
          console.log('🔐 Login response:', response);
          console.log('🔐 User role:', response.user.role);
          
          // IMPORTANT: Store user data FIRST before anything else
          const userWithRole = {
            ...response.user,
            role: response.user.role || 'student' // Default to student if no role
          };
          
          localStorage.setItem('user', JSON.stringify(userWithRole));
          console.log('✅ User stored in localStorage:', userWithRole);
          
          set({
            user: userWithRole,
            isAuthenticated: true,
            isLoading: false,
          });
          
          // Trigger custom event to update App.tsx
          window.dispatchEvent(new Event('user-login'));
          
          // Force page reload to update role-based routing (with delay to ensure storage is written)
          setTimeout(() => {
            console.log('🔄 Reloading page for role-based redirect...');
            window.location.href = '/'; // Full reload to home, routing will handle redirect
          }, 200);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (userData: any) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.register(userData);
          console.log('📝 Registration response:', response);
          console.log('📝 User role:', response.user.role);
          
          // IMPORTANT: Store user data FIRST before anything else
          const userWithRole = {
            ...response.user,
            role: response.user.role || userData.role || 'student' // Fallback to requested role
          };
          
          localStorage.setItem('user', JSON.stringify(userWithRole));
          console.log('✅ User stored in localStorage:', userWithRole);
          
          set({
            user: userWithRole,
            isAuthenticated: true,
            isLoading: false,
          });
          
          // Trigger custom event to update App.tsx
          window.dispatchEvent(new Event('user-login'));
          
          // Force page reload to update role-based routing (with delay to ensure storage is written)
          setTimeout(() => {
            console.log('🔄 Reloading page for role-based redirect...');
            window.location.href = '/'; // Full reload to home, routing will handle redirect
          }, 200);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        apiClient.logout();
        localStorage.removeItem('user');
        set({
          user: null,
          isAuthenticated: false,
        });
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          });
        }
      },

      refreshUser: async () => {
        try {
          const response = await apiClient.getCurrentUser();
          set({ user: response.user });
        } catch (error) {
          console.error('Failed to refresh user:', error);
          // If token is invalid, logout
          get().logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);