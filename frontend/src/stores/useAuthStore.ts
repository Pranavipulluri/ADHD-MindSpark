// src/stores/useAuthStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthResponse } from '../types/api';
import { apiClient, APIError } from '../lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    username: string;
    email: string;
    password: string;
    dateOfBirth: string;
    parentEmail: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,

      // Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response: AuthResponse = await apiClient.login(email, password);
          
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const errorMessage = error instanceof APIError 
            ? error.message 
            : 'Login failed. Please try again.';
          
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
          
          throw error;
        }
      },

      register: async (userData: {
        username: string;
        email: string;
        password: string;
        dateOfBirth: string;
        parentEmail: string;
      }) => {
        set({ isLoading: true, error: null });
        
        try {
          const response: AuthResponse = await apiClient.register(userData);
          
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const errorMessage = error instanceof APIError 
            ? error.message 
            : 'Registration failed. Please try again.';
          
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
          
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        
        try {
          await apiClient.logout();
        } catch (error) {
          // Even if logout fails on server, clear local state
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      getCurrentUser: async () => {
        const { token } = get();
        
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        
        try {
          const response = await apiClient.getCurrentUser();
          
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          // Token is invalid, clear auth state
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
          
          // Clear token from API client
          apiClient.setToken(null);
        }
      },

      clearError: () => set({ error: null }),

      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      partialize: (state: AuthStore) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state: AuthStore | undefined) => {
        // Set token in API client when hydrating from storage
        if (state?.token) {
          apiClient.setToken(state.token);
        }
      },
    }
  )
);
