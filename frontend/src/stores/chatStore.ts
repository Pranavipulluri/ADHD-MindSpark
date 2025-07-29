import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { ChatMessage, ChatRoom } from '../types';

interface ChatState {
  messages: ChatMessage[];
  rooms: ChatRoom[];
  currentRoom: string;
  loading: boolean;
  sendMessage: (content: string) => Promise<void>;
  loadMessages: (roomId: string) => Promise<void>;
  loadRooms: () => Promise<void>;
  setCurrentRoom: (roomId: string) => void;
  subscribeToMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  rooms: [],
  currentRoom: 'community',
  loading: false,

  sendMessage: async (content: string) => {
    const { currentRoom } = get();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('No user logged in');

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        content,
        room_id: currentRoom,
        user_id: user.id,
      });

    if (error) throw error;
  },

  loadMessages: async (roomId: string) => {
    set({ loading: true });

    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        profiles (
          username,
          avatar_url
        )
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    set({ messages: data || [], loading: false });
  },

  loadRooms: async () => {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    set({ rooms: data || [] });
  },

  setCurrentRoom: (roomId: string) => {
    set({ currentRoom: roomId });
    get().loadMessages(roomId);
  },

  subscribeToMessages: () => {
    const { currentRoom } = get();
    
    supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${currentRoom}`,
        },
        async (payload) => {
          const { data: message } = await supabase
            .from('chat_messages')
            .select(`
              *,
              profiles (
                username,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (message) {
            set((state) => ({
              messages: [...state.messages, message],
            }));
          }
        }
      )
      .subscribe();
  },
}));