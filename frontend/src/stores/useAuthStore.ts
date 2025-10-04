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
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (userData: any) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.register(userData);
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        apiClient.logout();
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