export interface NavItem {
  name: string;
  path: string;
  icon: string;
}

export interface MoodOption {
  emoji: string;
  label: string;
  color: string;
  selected?: boolean;
}

export interface GameCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconBgColor: string;
  comingSoon?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Must-Do' | 'Can-Wait' | 'Done';
  createdAt: Date;
}

export interface DocumentCategory {
  id: string;
  name: string;
}

export interface Document {
  id: string;
  name: string;
  categoryId: string;
  createdAt: Date;
  url?: string;
}

export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  email?: string;
  website?: string;
  points: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  user_id: string;
  room_id: string;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
}

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}