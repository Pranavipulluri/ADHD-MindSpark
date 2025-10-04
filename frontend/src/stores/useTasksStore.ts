import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../lib/api';
import { Task } from '../types';

interface TasksState {
  tasks: Task[];
  isLoading: boolean;
  filter: 'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

interface TasksActions {
  loadTasks: () => Promise<void>;
  createTask: (task: Omit<Task, 'id' | 'user_id' | 'assigned_at' | 'created_at' | 'updated_at' | 'points_reward'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  setFilter: (filter: TasksState['filter']) => void;
  getFilteredTasks: () => Task[];
}

type TasksStore = TasksState & TasksActions;

export const useTasksStore = create<TasksStore>()(
  persist(
    (set, get) => ({
      // State
      tasks: [],
      isLoading: false,
      filter: 'all',

      // Actions
      loadTasks: async () => {
        set({ isLoading: true });
        try {
          const response = await apiClient.getTasks();
          if (response.tasks) {
            set({ tasks: response.tasks });
          }
        } catch (error) {
          console.error('Failed to load tasks:', error);
          // Keep existing tasks on error
        } finally {
          set({ isLoading: false });
        }
      },

      createTask: async (taskData) => {
        try {
          const response = await apiClient.createTask(taskData);
          if (response.task) {
            set(state => ({
              tasks: [...state.tasks, response.task]
            }));
          }
        } catch (error) {
          console.error('Failed to create task:', error);
          // Add task locally as fallback
          const newTask: Task = {
            id: Date.now().toString(),
            user_id: 'demo-user',
            title: taskData.title,
            description: taskData.description,
            category: taskData.category || 'daily',
            priority: taskData.priority || 'medium',
            status: taskData.status || 'pending',
            points_reward: taskData.priority === 'high' ? 20 : taskData.priority === 'medium' ? 15 : 10,
            assigned_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          set(state => ({
            tasks: [...state.tasks, newTask]
          }));
        }
      },

      updateTask: async (id, updates) => {
        try {
          const response = await apiClient.updateTask(id, updates);
          if (response.task) {
            set(state => ({
              tasks: state.tasks.map(task => 
                task.id === id ? response.task : task
              )
            }));
          }
        } catch (error) {
          console.error('Failed to update task:', error);
          // Update locally as fallback
          set(state => ({
            tasks: state.tasks.map(task => 
              task.id === id 
                ? { ...task, ...updates, updated_at: new Date().toISOString() }
                : task
            )
          }));
        }
      },

      deleteTask: async (id) => {
        try {
          await apiClient.deleteTask(id);
          set(state => ({
            tasks: state.tasks.filter(task => task.id !== id)
          }));
        } catch (error) {
          console.error('Failed to delete task:', error);
          // Still remove locally
          set(state => ({
            tasks: state.tasks.filter(task => task.id !== id)
          }));
        }
      },

      completeTask: async (id) => {
        await get().updateTask(id, { 
          status: 'completed', 
          completed_at: new Date().toISOString() 
        });
      },

      setFilter: (filter) => {
        set({ filter });
      },

      getFilteredTasks: () => {
        const { tasks, filter } = get();
        if (filter === 'all') {
          return tasks;
        }
        return tasks.filter(task => task.status === filter);
      }
    }),
    {
      name: 'tasks-storage',
      partialize: (state) => ({
        tasks: state.tasks,
        filter: state.filter
      })
    }
  )
);