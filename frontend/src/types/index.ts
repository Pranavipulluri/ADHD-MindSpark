export interface NavItem {
  name: string;
  path: string;
  icon: string;
}

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  date_of_birth?: string;
  parent_email: string;
  points: number;
  level: number;
  streak_days: number;
  last_activity: string;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// API response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: any;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  token: string;
}

// Task types
export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category: 'daily' | 'academic' | 'chores' | 'health' | 'social' | 'creative';
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: string;
  estimated_duration?: number;
  points_reward: number;
  assigned_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

// Game types
export interface Game {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty_level: number;
  points_per_completion: number;
  created_at: string;
}

export interface GameScore {
  id: string;
  user_id: string;
  game_id: string;
  score: number;
  completion_time?: number;
  accuracy_percentage?: number;
  level_reached?: number;
  points_earned: number;
  played_at: string;
}

export interface GameCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconBgColor: string;
  comingSoon?: boolean;
  category: string;
  difficulty_level: number;
}

// Mood types
export interface MoodEntry {
  id: string;
  user_id: string;
  mood_type: 'happy' | 'excited' | 'calm' | 'worried' | 'angry' | 'sad' | 'frustrated';
  mood_intensity: number; // 1-5
  notes?: string;
  triggers?: string[];
  created_at: string;
}

export interface MoodOption {
  emoji: string;
  label: string;
  color: string;
  selected?: boolean;
}

// Focus Session types
export interface FocusSession {
  id: string;
  user_id: string;
  type: 'breathing' | 'meditation' | 'concentration' | 'mindfulness';
  duration_minutes: number;
  background: 'nature' | 'ocean' | 'rain' | 'silence' | 'music';
  status: 'active' | 'completed' | 'cancelled';
  quality_rating?: number; // 1-5
  points_earned?: number;
  created_at: string;
  completed_at?: string;
}

// Chat types
export interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  content: string;
  type: 'text' | 'image' | 'emoji';
  room_id?: string;
  created_at: string;
}

// Document types
export interface Document {
  id: string;
  user_id?: string;
  name: string;
  title?: string;
  description?: string;
  content?: string;
  filename?: string;
  file_url?: string;
  url?: string;
  file_size?: number;
  mime_type?: string;
  type?: 'file' | 'note';
  category?: string;
  categoryId?: string;
  tags?: string[];
  uploaded_at?: string;
  createdAt?: Date;
  created_at?: string;
  aiSummary?: any;
  aiProcessedAt?: string;
}

// Specialist types
export interface Specialist {
  id: string;
  name: string;
  specialization: string;
  email: string;
  phone: string;
  bio: string;
  availability: Record<string, string[]>;
  created_at: string;
}

// Appointment types
export interface Appointment {
  id: string;
  user_id: string;
  specialist_id: string;
  specialist_name: string;
  scheduled_at: string;
  type: 'consultation' | 'therapy' | 'assessment' | 'follow_up';
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes?: string;
  created_at: string;
}

// Progress types
export interface Progress {
  timeframe: string;
  overallScore: number;
  taskCompletion: {
    rate: number;
    totalTasks: number;
    completedTasks: number;
    avgCompletionTime: number;
  };
  gamePerformance: {
    score: number;
    gamesPlayed: number;
    avgScore: number;
    avgAccuracy: number;
    maxLevel: number;
    totalPoints: number;
  };
  moodTracking: {
    consistency: number;
    trackingDays: number;
    avgIntensity: number;
    mostCommonMood: string;
  };
  focusSessions: {
    consistency: number;
    totalSessions: number;
    totalMinutes: number;
    avgDuration: number;
    avgQuality: number;
  };
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T = any> extends APIResponse<T[]> {
  pagination: PaginationInfo;
}

// WebSocket types
export interface WSMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'achievement' | 'reminder';
  timestamp: string;
  read: boolean;
  action?: {
    type: string;
    url: string;
  };
}