import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../lib/api';

interface ChatMessage {
  id: string;
  content: string;
  username: string;
  user_id: string;
  room_id: string;
  created_at: string;
}

interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  participant_count: number;
  is_member: boolean;
}

interface ChatState {
  messages: Record<string, ChatMessage[]>; // roomId -> messages
  rooms: ChatRoom[];
  currentRoom: string;
  isLoading: boolean;
}

interface ChatActions {
  setCurrentRoom: (roomId: string) => void;
  loadRooms: () => Promise<void>;
  loadMessages: (roomId: string) => Promise<void>;
  sendMessage: (roomId: string, content: string) => Promise<void>;
  addMessage: (message: ChatMessage) => void;
  joinRoom: (roomId: string) => Promise<void>;
}

type ChatStore = ChatState & ChatActions;

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // State
      messages: {},
      rooms: [],
      currentRoom: 'general',
      isLoading: false,

      // Actions
      setCurrentRoom: (roomId: string) => {
        set({ currentRoom: roomId });
        // Load messages for the new room
        get().loadMessages(roomId);
      },

      loadRooms: async () => {
        set({ isLoading: true });
        try {
          const response = await apiClient.getChatRooms();
          if (response.rooms) {
            set({ rooms: response.rooms });
          } else {
            // Fallback to default rooms if backend doesn't have any
            const defaultRooms: ChatRoom[] = [
              { id: 'general', name: '🌟 General Chat', is_active: true, participant_count: 12, is_member: true },
              { id: 'study', name: '📚 Study Group', is_active: true, participant_count: 8, is_member: false },
              { id: 'games', name: '🎮 Game Zone', is_active: true, participant_count: 15, is_member: false },
              { id: 'support', name: '💙 Support Circle', is_active: true, participant_count: 6, is_member: false }
            ];
            set({ rooms: defaultRooms });
          }
        } catch (error) {
          console.error('Failed to load chat rooms:', error);
          // Use default rooms on error
          const defaultRooms: ChatRoom[] = [
            { id: 'general', name: '🌟 General Chat', is_active: true, participant_count: 12, is_member: true },
            { id: 'study', name: '📚 Study Group', is_active: true, participant_count: 8, is_member: false },
            { id: 'games', name: '🎮 Game Zone', is_active: true, participant_count: 15, is_member: false },
            { id: 'support', name: '💙 Support Circle', is_active: true, participant_count: 6, is_member: false }
          ];
          set({ rooms: defaultRooms });
        } finally {
          set({ isLoading: false });
        }
      },

      loadMessages: async (roomId: string) => {
        try {
          // First try to load from localStorage
          const savedMessages = localStorage.getItem(`chat-messages-${roomId}`);
          if (savedMessages) {
            const messages = JSON.parse(savedMessages);
            set(state => ({
              messages: {
                ...state.messages,
                [roomId]: messages
              }
            }));
            return;
          }

          // Try to load from API
          const response = await apiClient.getChatMessages(roomId);
          if (response.messages) {
            set(state => ({
              messages: {
                ...state.messages,
                [roomId]: response.messages
              }
            }));
          } else {
            // Initialize with welcome message if no messages exist
            const welcomeMessage: ChatMessage = {
              id: `welcome-${roomId}`,
              content: `Welcome to ${get().rooms.find(r => r.id === roomId)?.name || 'this room'}! 🎉`,
              username: 'MindSpark Bot',
              user_id: 'system',
              room_id: roomId,
              created_at: new Date().toISOString()
            };
            
            set(state => ({
              messages: {
                ...state.messages,
                [roomId]: [welcomeMessage]
              }
            }));
            
            // Save welcome message to localStorage
            localStorage.setItem(`chat-messages-${roomId}`, JSON.stringify([welcomeMessage]));
          }
        } catch (error) {
          console.error('Failed to load messages:', error);
          
          // Check localStorage as fallback
          const savedMessages = localStorage.getItem(`chat-messages-${roomId}`);
          if (savedMessages) {
            const messages = JSON.parse(savedMessages);
            set(state => ({
              messages: {
                ...state.messages,
                [roomId]: messages
              }
            }));
          } else {
            // Initialize with welcome message on error
            const welcomeMessage: ChatMessage = {
              id: `welcome-${roomId}`,
              content: `Welcome to ${get().rooms.find(r => r.id === roomId)?.name || 'this room'}! 🎉`,
              username: 'MindSpark Bot',
              user_id: 'system',
              room_id: roomId,
              created_at: new Date().toISOString()
            };
            
            set(state => ({
              messages: {
                ...state.messages,
                [roomId]: [welcomeMessage]
              }
            }));
            
            localStorage.setItem(`chat-messages-${roomId}`, JSON.stringify([welcomeMessage]));
          }
        }
      },

      sendMessage: async (roomId: string, content: string) => {
        // Create a message with proper user info and unique ID
        const message: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content,
          username: 'You',
          user_id: 'demo-user',
          room_id: roomId,
          created_at: new Date().toISOString()
        };

        // Add message to local state immediately
        get().addMessage(message);

        try {
          // Save to localStorage for persistence
          const currentMessages = get().messages[roomId] || [];
          const updatedMessages = [...currentMessages, message];
          
          // Update localStorage
          localStorage.setItem(`chat-messages-${roomId}`, JSON.stringify(updatedMessages));
          
          console.log('Message sent:', content);
        } catch (error) {
          console.error('Failed to send message:', error);
        }
      },

      addMessage: (message: ChatMessage) => {
        set(state => ({
          messages: {
            ...state.messages,
            [message.room_id]: [
              ...(state.messages[message.room_id] || []),
              message
            ]
          }
        }));
      },

      joinRoom: async (roomId: string) => {
        try {
          await apiClient.joinChatRoom(roomId);
          
          // Update room membership status
          set(state => ({
            rooms: state.rooms.map(room => 
              room.id === roomId 
                ? { ...room, is_member: true, participant_count: room.participant_count + 1 }
                : room
            )
          }));
        } catch (error) {
          console.error('Failed to join room:', error);
          // Update locally even if backend fails
          set(state => ({
            rooms: state.rooms.map(room => 
              room.id === roomId 
                ? { ...room, is_member: true }
                : room
            )
          }));
        }
      }
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        messages: state.messages,
        rooms: state.rooms,
        currentRoom: state.currentRoom
      })
    }
  )
);