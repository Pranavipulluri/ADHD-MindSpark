// src/stores/useTaskStore.ts
import { create } from 'zustand';
import { Task } from '../types/api';
import { apiClient } from '../lib/api';

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  filters: {
    status?: string;
    category?: string;
    priority?: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface TaskActions {
  fetchTasks: (filters?: any) => Promise<void>;
  createTask: (task: any) => Promise<void>;
  updateTask: (taskId: string, updates: any) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  completeTask: (taskId: string) => Promise<void>;
  setFilters: (filters: any) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

type TaskStore = TaskState & TaskActions;

export const useTaskStore = create<TaskStore>((set, get) => ({
  // State
  tasks: [],
  isLoading: false,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  },

  // Actions
  fetchTasks: async (filters = {}) => {
    set({ isLoading: true, error: null });

    try {
      const { filters: currentFilters, pagination } = get();
      const queryFilters = { ...currentFilters, ...filters, page: pagination.page };
      
      const response = await apiClient.getTasks(queryFilters);
      
      set({
        tasks: response.tasks,
        pagination: response.pagination,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to fetch tasks',
      });
    }
  },

  createTask: async (taskData) => {
    set({ isLoading: true, error: null });

    try {
      const response = await apiClient.createTask(taskData);
      
      // Add new task to the beginning of the list
      set((state: any) => ({
        tasks: [response.task, ...state.tasks],
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to create task',
      });
      throw error;
    }
  },

  updateTask: async (taskId, updates) => {
    set({ isLoading: true, error: null });

    try {
      const response = await apiClient.updateTask(taskId, updates);
      
      // Update task in the list
      set((state: any) => ({
        tasks: state.tasks.map((task: Task) =>
          task.id === taskId ? response.task : task
        ),
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to update task',
      });
      throw error;
    }
  },

  deleteTask: async (taskId) => {
    set({ isLoading: true, error: null });

    try {
      await apiClient.deleteTask(taskId);
      
      // Remove task from the list
      set((state: any) => ({
        tasks: state.tasks.filter((task: Task) => task.id !== taskId),
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to delete task',
      });
      throw error;
    }
  },

  completeTask: async (taskId) => {
    set({ isLoading: true, error: null });

    try {
      const response = await apiClient.completeTask(taskId);
      
      // Update task status
      set((state: any) => ({
        tasks: state.tasks.map((task: Task) =>
          task.id === taskId ? response.task : task
        ),
        isLoading: false,
        error: null,
      }));

      // Show points earned notification
      if (response.pointsEarned > 0) {
        // You could integrate with notification store here
        console.log(`Task completed! Earned ${response.pointsEarned} points!`);
      }
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || 'Failed to complete task',
      });
      throw error;
    }
  },

  setFilters: (filters) => {
    set({ filters });
    // Trigger refetch with new filters
    get().fetchTasks();
  },

  clearError: () => set({ error: null }),

  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));
