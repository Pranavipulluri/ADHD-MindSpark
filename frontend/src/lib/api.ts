// src/lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';

class APIError extends Error {
  constructor(message: string, public status: number, public details?: any) {
    super(message);
    this.name = 'APIError';
  }
}

class APIClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
          errorData.message || 'Request failed',
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError('Network error', 0, error);
    }
  }

  // Auth methods
  async login(email: string, password: string) {
    const response = await this.request<{
      success: boolean;
      user: any;
      token: string;
    }>('/api/auth/login', {
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
    const response = await this.request<{
      success: boolean;
      user: any;
      token: string;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async logout() {
    await this.request('/api/auth/logout', {
      method: 'POST',
    });
    this.setToken(null);
  }

  async getCurrentUser() {
    return this.request<{ success: boolean; user: any }>('/api/auth/me');
  }

  // Task methods
  async getTasks(filters?: {
    status?: string;
    category?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, String(value));
        }
      });
    }
    
    const query = params.toString();
    return this.request<{
      success: boolean;
      tasks: any[];
      pagination: any;
    }>(`/api/tasks${query ? `?${query}` : ''}`);
  }

  async createTask(task: {
    title: string;
    description?: string;
    category: string;
    priority?: string;
    dueDate?: string;
    estimatedDuration?: number;
    pointsReward?: number;
  }) {
    return this.request<{ success: boolean; task: any }>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateTask(taskId: string, updates: any) {
    return this.request<{ success: boolean; task: any }>(`/api/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteTask(taskId: string) {
    return this.request<{ success: boolean }>(`/api/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  async completeTask(taskId: string) {
    return this.request<{ success: boolean; task: any; pointsEarned: number }>(
      `/api/tasks/${taskId}/complete`,
      { method: 'POST' }
    );
  }

  // Game methods
  async getGames() {
    return this.request<{ success: boolean; games: any[] }>('/api/games');
  }

  async submitGameScore(gameId: string, scoreData: {
    score: number;
    accuracy?: number;
    levelReached?: number;
    completionTime?: number;
    difficulty?: string;
  }) {
    return this.request<{ 
      success: boolean; 
      gameScore: any; 
      pointsEarned: number;
      newLevel?: number;
    }>('/api/games/scores', {
      method: 'POST',
      body: JSON.stringify({ gameId, ...scoreData }),
    });
  }

  async getGameScores(gameId?: string) {
    const endpoint = gameId ? `/api/games/${gameId}/scores` : '/api/games/scores';
    return this.request<{ success: boolean; scores: any[] }>(endpoint);
  }

  // Mood methods
  async getMoodEntries(timeframe?: string) {
    const params = timeframe ? `?timeframe=${timeframe}` : '';
    return this.request<{ success: boolean; moods: any[] }>(`/api/mood${params}`);
  }

  async createMoodEntry(mood: {
    moodType: string;
    moodIntensity: number;
    notes?: string;
    triggers?: string[];
  }) {
    return this.request<{ success: boolean; mood: any }>('/api/mood', {
      method: 'POST',
      body: JSON.stringify(mood),
    });
  }

  // Progress methods
  async getProgress(timeframe?: string) {
    const params = timeframe ? `?timeframe=${timeframe}` : '';
    return this.request<{ success: boolean; progress: any }>(`/api/progress${params}`);
  }

  async getProgressTrends(timeframe?: string) {
    const params = timeframe ? `?timeframe=${timeframe}` : '';
    return this.request<{ success: boolean; trends: any }>(`/api/progress/trends${params}`);
  }

  // Focus session methods
  async createFocusSession(session: {
    type: string;
    durationMinutes: number;
    background?: string;
  }) {
    return this.request<{ success: boolean; session: any }>('/api/focus-sessions', {
      method: 'POST',
      body: JSON.stringify(session),
    });
  }

  async completeFocusSession(sessionId: string, qualityRating: number) {
    return this.request<{ success: boolean; session: any; pointsEarned: number }>(
      `/api/focus-sessions/${sessionId}/complete`,
      {
        method: 'POST',
        body: JSON.stringify({ qualityRating }),
      }
    );
  }

  async getFocusSessions() {
    return this.request<{ success: boolean; sessions: any[] }>('/api/focus-sessions');
  }

  // Chat methods
  async getChatMessages(roomId?: string) {
    const params = roomId ? `?roomId=${roomId}` : '';
    return this.request<{ success: boolean; messages: any[] }>(`/api/chat/messages${params}`);
  }

  async sendChatMessage(message: {
    content: string;
    type?: string;
    roomId?: string;
  }) {
    return this.request<{ success: boolean; message: any }>('/api/chat/messages', {
      method: 'POST',
      body: JSON.stringify(message),
    });
  }

  // Document methods
  async getDocuments(category?: string) {
    const params = category ? `?category=${category}` : '';
    return this.request<{ success: boolean; documents: any[] }>(`/api/documents${params}`);
  }

  async uploadDocument(formData: FormData) {
    return this.request<{ success: boolean; document: any }>('/api/documents/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // Don't set Content-Type for FormData
    });
  }

  async deleteDocument(documentId: string) {
    return this.request<{ success: boolean }>(`/api/documents/${documentId}`, {
      method: 'DELETE',
    });
  }

  // Specialist methods
  async getSpecialists() {
    return this.request<{ success: boolean; specialists: any[] }>('/api/specialists');
  }

  async bookAppointment(appointment: {
    specialistId: string;
    scheduledAt: string;
    type: string;
    notes?: string;
  }) {
    return this.request<{ success: boolean; appointment: any }>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(appointment),
    });
  }

  async getAppointments() {
    return this.request<{ success: boolean; appointments: any[] }>('/api/appointments');
  }

  async cancelAppointment(appointmentId: string) {
    return this.request<{ success: boolean }>(`/api/appointments/${appointmentId}/cancel`, {
      method: 'POST',
    });
  }
}

// Create singleton instance
export const apiClient = new APIClient();
export { APIError };
export default apiClient;
