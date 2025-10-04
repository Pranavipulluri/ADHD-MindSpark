// Background service worker for MindSpark extension
class MindSparkBackground {
  constructor() {
    this.API_BASE = 'http://localhost:3001/api';
    this.userToken = null;
    this.userPoints = 0;
    
    this.init();
  }
  
  async init() {
    // Load user data from storage
    const result = await chrome.storage.local.get(['userToken', 'userPoints', 'userPreferences']);
    this.userToken = result.userToken;
    this.userPoints = result.userPoints || 0;
    
    // Set up context menus
    this.setupContextMenus();
    
    // Listen for messages from content scripts and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
    
    // Set up periodic sync for points and achievements
    this.setupPeriodicSync();
  }
  
  setupContextMenus() {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'summarize-text',
        title: 'Summarize selected text',
        contexts: ['selection']
      });
      
      chrome.contextMenus.create({
        id: 'read-aloud',
        title: 'Read aloud',
        contexts: ['selection']
      });
      
      chrome.contextMenus.create({
        id: 'dyslexia-mode',
        title: 'Toggle dyslexia-friendly mode',
        contexts: ['page']
      });
    });
    
    chrome.contextMenus.onClicked.addListener(this.handleContextMenu.bind(this));
  }
  
  async handleContextMenu(info, tab) {
    switch (info.menuItemId) {
      case 'summarize-text':
        await this.summarizeText(info.selectionText, tab.id);
        break;
      case 'read-aloud':
        await this.readAloud(info.selectionText);
        break;
      case 'dyslexia-mode':
        await this.toggleDyslexiaMode(tab.id);
        break;
    }
  }
  
  async handleMessage(message, sender, sendResponse) {
    try {
      let result;
      switch (message.action) {
        case 'authenticate':
          result = await this.authenticate(message.credentials);
          break;
        case 'getProfile':
          result = await this.getUserProfile();
          break;
        case 'updatePoints':
          result = await this.updatePoints(message.points, message.activity);
          break;
        case 'summarizePage':
          result = await this.summarizePage(message.url, message.content);
          break;
        case 'saveProgress':
          result = await this.saveProgress(message.progressData);
          break;
        case 'getPreferences':
          result = await this.getUserPreferences();
          break;
        case 'updatePreferences':
          result = await this.updateUserPreferences(message.preferences);
          break;
        default:
          result = { error: 'Unknown action' };
      }
      
      // Send response if port is still open
      if (sendResponse) {
        sendResponse(result);
      }
      return true; // Keep message channel open for async response
    } catch (error) {
      console.error('Background script error:', error);
      if (sendResponse) {
        sendResponse({ error: error.message });
      }
      return true;
    }
  }
  
  async authenticate(credentials) {
    try {
      const response = await fetch(`${this.API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.userToken = data.token;
        this.userPoints = data.user.points;
        
        // Store in extension storage
        await chrome.storage.local.set({
          userToken: data.token,
          userPoints: data.user.points,
          userProfile: data.user
        });
        
        return { success: true, user: data.user };
      } else {
        return { error: data.error };
      }
    } catch (error) {
      return { error: 'Authentication failed' };
    }
  }
  
  async getUserProfile() {
    if (!this.userToken) {
      return { error: 'Not authenticated' };
    }
    
    try {
      const response = await fetch(`${this.API_BASE}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${this.userToken}`
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        await chrome.storage.local.set({ userProfile: data.user });
        return { success: true, user: data.user };
      } else {
        return { error: data.error };
      }
    } catch (error) {
      return { error: 'Failed to fetch profile' };
    }
  }
  
  async updatePoints(points, activityType) {
    if (!this.userToken) return { error: 'Not authenticated' };
    
    try {
      // Award points based on activity
      const response = await fetch(`${this.API_BASE}/extension/points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.userToken}`
        },
        body: JSON.stringify({
          points,
          activity_type: activityType,
          source: 'extension'
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.userPoints = data.total_points;
        await chrome.storage.local.set({ userPoints: data.total_points });
        
        // Show achievement notification if earned
        if (data.achievement_earned) {
          this.showAchievementNotification(data.achievement_earned);
        }
        
        return { success: true, points: data.total_points };
      }
      
      return { error: data.error };
    } catch (error) {
      return { error: 'Failed to update points' };
    }
  }
  
  async summarizeText(text, tabId) {
    if (!this.userToken) return;
    
    try {
      const response = await fetch(`${this.API_BASE}/ai/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.userToken}`
        },
        body: JSON.stringify({ text, source: 'extension' })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Send summary to content script
        chrome.tabs.sendMessage(tabId, {
          action: 'showSummary',
          summary: data.summary
        });
        
        // Award points for using AI features
        await this.updatePoints(3, 'ai_summary');
      }
    } catch (error) {
      console.error('Summarization error:', error);
    }
  }
  
  async summarizePage(url, content) {
    if (!this.userToken) return { error: 'Not authenticated' };
    
    try {
      const response = await fetch(`${this.API_BASE}/ai/summarize-page`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.userToken}`
        },
        body: JSON.stringify({ url, content, source: 'extension' })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        await this.updatePoints(5, 'page_summary');
        return { success: true, summary: data.summary };
      }
      
      return { error: data.error };
    } catch (error) {
      return { error: 'Failed to summarize page' };
    }
  }
  
  async readAloud(text) {
    try {
      // Use Chrome's built-in TTS
      chrome.tts.speak(text, {
        rate: 0.8,
        pitch: 1.0,
        volume: 0.8
      });
      
      // Award points for accessibility feature usage
      await this.updatePoints(2, 'tts_usage');
    } catch (error) {
      console.error('TTS error:', error);
    }
  }
  
  async toggleDyslexiaMode(tabId) {
    try {
      chrome.tabs.sendMessage(tabId, {
        action: 'toggleDyslexiaMode'
      });
      
      // Award points for accessibility feature usage
      await this.updatePoints(2, 'accessibility_toggle');
    } catch (error) {
      console.error('Dyslexia mode toggle error:', error);
    }
  }
  
  async getUserPreferences() {
    const result = await chrome.storage.local.get(['userPreferences']);
    return result.userPreferences || {
      dyslexiaMode: false,
      fontSize: 'medium',
      colorScheme: 'default',
      autoSummarize: false,
      ttsSpeed: 0.8
    };
  }
  
  async updateUserPreferences(preferences) {
    await chrome.storage.local.set({ userPreferences: preferences });
    
    // Sync with backend if authenticated
    if (this.userToken) {
      try {
        await fetch(`${this.API_BASE}/extension/preferences`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.userToken}`
          },
          body: JSON.stringify(preferences)
        });
      } catch (error) {
        console.error('Failed to sync preferences:', error);
      }
    }
    
    return { success: true };
  }
  
  async saveProgress(progressData) {
    if (!this.userToken) return { error: 'Not authenticated' };
    
    try {
      const response = await fetch(`${this.API_BASE}/extension/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.userToken}`
        },
        body: JSON.stringify(progressData)
      });
      
      const data = await response.json();
      return response.ok ? { success: true } : { error: data.error };
    } catch (error) {
      return { error: 'Failed to save progress' };
    }
  }
  
  showAchievementNotification(achievement) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Achievement Unlocked! 🎉',
      message: `${achievement.name}: ${achievement.description}`
    });
  }
  
  setupPeriodicSync() {
    // Sync user data every 5 minutes
    setInterval(async () => {
      if (this.userToken) {
        await this.getUserProfile();
      }
    }, 5 * 60 * 1000);
  }
}

// Initialize background service
new MindSparkBackground();