// src/stores/useWebSocketStore.ts
import { create } from 'zustand';
import { Notification, WSMessage } from '../types/api';

interface WebSocketState {
  socket: WebSocket | null;
  isConnected: boolean;
  notifications: Notification[];
  unreadCount: number;
}

interface WebSocketActions {
  connect: (token: string) => void;
  disconnect: () => void;
  sendMessage: (message: any) => void;
  addNotification: (notification: Notification) => void;
  markNotificationAsRead: (notificationId: string) => void;
  clearNotifications: () => void;
}

type WebSocketStore = WebSocketState & WebSocketActions;

const isDevelopment = import.meta.env.DEV;
const WS_URL = isDevelopment
  ? 'ws://localhost:3001'
  : (import.meta.env.VITE_WS_URL || 'wss://your-backend-url.railway.app');

export const useWebSocketStore = create<WebSocketStore>((set, get) => ({
  // State
  socket: null,
  isConnected: false,
  notifications: [],
  unreadCount: 0,

  // Actions
  connect: (token: string) => {
    const { socket } = get();
    
    // Don't create duplicate connections
    if (socket && socket.readyState === WebSocket.OPEN) {
      return;
    }

    // Disconnect existing connection
    if (socket) {
      socket.close();
    }

    try {
      const newSocket = new WebSocket(`${WS_URL}?token=${token}`);

      newSocket.onopen = () => {
        console.log('WebSocket connected');
        set({ isConnected: true });
      };

      newSocket.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'notification':
              get().addNotification(message.data);
              break;
            case 'chat_message':
              // Handle chat messages - could integrate with chat store
              console.log('New chat message:', message.data);
              break;
            case 'task_update':
              // Handle task updates
              console.log('Task updated:', message.data);
              break;
            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      newSocket.onclose = () => {
        console.log('WebSocket disconnected');
        set({ isConnected: false, socket: null });
      };

      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        set({ isConnected: false });
      };

      set({ socket: newSocket });
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  },

  disconnect: () => {
    const { socket } = get();
    
    if (socket) {
      socket.close();
      set({ socket: null, isConnected: false });
    }
  },

  sendMessage: (message: any) => {
    const { socket, isConnected } = get();
    
    if (socket && isConnected) {
      socket.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected. Cannot send message:', message);
    }
  },

  addNotification: (notification: Notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 50), // Keep only last 50
      unreadCount: state.unreadCount + (notification.read ? 0 : 1),
    }));
  },

  markNotificationAsRead: (notificationId: string) => {
    set((state) => ({
      notifications: state.notifications.map((notif) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },
}));
