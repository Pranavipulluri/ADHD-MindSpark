// API client for MindSpark backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

class APIClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('token');
    
    // For demo purposes, create a mock token if none exists
    if (!this.token) {
      this.token = 'demo-token-' + Date.now();
      localStorage.setItem('token', this.token);
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}/api${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new APIError(response.status, errorData.error || 'Request failed');
    }

    return response.json();
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    dateOfBirth: string;
    parentEmail: string;
  }) {
    const response = await this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async getCurrentUser() {
    return this.request<any>('/auth/profile');
  }

  // Tasks endpoints
  async getTasks() {
    return this.request<any>('/tasks');
  }

  async createTask(task: {
    title: string;
    description?: string;
    priority: string;
    due_date?: string;
  }) {
    return this.request<any>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateTask(id: string, updates: any) {
    return this.request<any>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteTask(id: string) {
    return this.request<any>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // Mood endpoints
  async addMoodEntry(mood: {
    mood_type: string;
    mood_intensity?: number;
    notes?: string;
  }) {
    return this.request<any>('/mood', {
      method: 'POST',
      body: JSON.stringify(mood),
    });
  }

  async getMoodHistory(days = 30) {
    return this.request<any>(`/mood?days=${days}`);
  }

  // Games endpoints
  async getGames() {
    return this.request<any>('/games');
  }

  async submitGameScore(gameId: string, scoreData: {
    score: number;
    completion_time?: number;
    accuracy_percentage?: number;
    level_reached?: number;
  }) {
    return this.request<any>(`/games/${gameId}/scores`, {
      method: 'POST',
      body: JSON.stringify(scoreData),
    });
  }

  async getGameScores() {
    return this.request<any>('/games/scores');
  }

  // Focus sessions
  async startFocusSession(sessionData: {
    session_type: string;
    duration_minutes: number;
  }) {
    return this.request<any>('/focus-sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  }

  async completeFocusSession(id: string, data: {
    interruptions?: number;
    notes?: string;
  }) {
    return this.request<any>(`/focus-sessions/${id}/complete`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Documents endpoints
  async getDocuments() {
    return this.request<any>('/documents');
  }

  async getDocumentCategories() {
    return this.request<any>('/documents/categories');
  }

  async createNote(noteData: {
    title: string;
    content: string;
    category_name?: string;
    tags?: string[];
  }) {
    return this.request<any>('/ai/create-note', {
      method: 'POST',
      body: JSON.stringify(noteData),
    });
  }

  async uploadDocument(formData: FormData) {
    const url = `${API_BASE_URL}/api/documents`;
    
    const headers: HeadersInit = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new APIError(response.status, errorData.error || 'Upload failed');
    }

    return response.json();
  }

  async deleteDocument(id: string) {
    return this.request<any>(`/documents/${id}`, {
      method: 'DELETE',
    });
  }

  // Chat endpoints
  async getChatRooms() {
    return this.request<any>('/chat/rooms');
  }

  async getChatMessages(roomId: string, limit = 50, offset = 0) {
    return this.request<any>(`/chat/rooms/${roomId}/messages?limit=${limit}&offset=${offset}`);
  }

  async joinChatRoom(roomId: string) {
    return this.request<any>(`/chat/rooms/${roomId}/join`, {
      method: 'POST',
    });
  }

  // Progress endpoints
  async getProgress(days = 30) {
    return this.request<any>(`/progress?days=${days}`);
  }

  // Extension endpoints
  async updateExtensionPoints(points: number, activityType: string) {
    return this.request<any>('/extension/points', {
      method: 'POST',
      body: JSON.stringify({
        points,
        activity_type: activityType,
        source: 'website'
      }),
    });
  }

  // AI endpoints
  async chatWithAI(message: string) {
    return this.request<any>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async processDocument(content: string, filename: string) {
    return this.request<any>('/ai/process-document', {
      method: 'POST',
      body: JSON.stringify({ content, filename }),
    });
  }

  async summarizeText(text: string, source = 'web') {
    return this.request<any>('/ai/summarize', {
      method: 'POST',
      body: JSON.stringify({ text, source }),
    });
  }
}

export const apiClient = new APIClient();