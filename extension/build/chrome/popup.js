// MindSpark Extension Popup Script
class MindSparkPopup {
  constructor() {
    this.currentUser = null;
    this.currentScreen = 'login';
    
    this.init();
  }
  
  async init() {
    try {
      // Check if user is already logged in
      const result = await chrome.storage.local.get(['userToken', 'userProfile']);
      
      if (result.userToken && result.userProfile) {
        this.currentUser = result.userProfile;
        this.showScreen('dashboard');
        this.loadDashboardData();
      } else {
        this.showScreen('login');
      }
    } catch (error) {
      console.log('Extension initialization error:', error);
      this.showScreen('login');
    }
    
    // Test backend connectivity
    this.testBackendConnection();
    
    this.setupEventListeners();
  }
  
  async testBackendConnection() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch('http://localhost:3001/api/health', {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log('✅ Backend connection successful');
      } else {
        console.warn('⚠️ Backend responded with error:', response.status);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn('⚠️ Backend connection timeout');
      } else {
        console.warn('⚠️ Backend connection failed:', error.message);
      }
    }
  }
  
  setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', this.handleLogin.bind(this));
    }
    
    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', this.handleRegister.bind(this));
    }
    
    // Navigation
    const registerLink = document.getElementById('register-link');
    if (registerLink) {
      registerLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.showScreen('register');
      });
    }
    
    const backToLogin = document.getElementById('back-to-login');
    if (backToLogin) {
      backToLogin.addEventListener('click', () => {
        this.showScreen('login');
      });
    }
    
    // Dashboard actions
    const actionBtns = document.querySelectorAll('.action-btn');
    actionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleAction(btn.dataset.action);
      });
    });
    
    // Game buttons
    const gameBtns = document.querySelectorAll('.game-btn');
    gameBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.startGame(btn.dataset.game);
      });
    });
    
    // Settings
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', this.handleLogout.bind(this));
    }
    
    const openWebsiteBtn = document.getElementById('open-website');
    if (openWebsiteBtn) {
      openWebsiteBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'http://localhost:5173' });
      });
    }
    
    // Preferences
    const preferences = document.querySelectorAll('.preference-item input');
    preferences.forEach(pref => {
      pref.addEventListener('change', this.handlePreferenceChange.bind(this));
    });
  }
  
  showScreen(screenName) {
    // Hide all screens
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
      screen.style.display = 'none';
    });
    
    // Show target screen
    const targetScreen = document.getElementById(`${screenName}-screen`);
    if (targetScreen) {
      targetScreen.style.display = 'flex';
      this.currentScreen = screenName;
    }
  }
  
  async handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');
    
    this.showScreen('loading');
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'authenticate',
        credentials: { email, password }
      });
      
      if (response.success) {
        this.currentUser = response.user;
        this.showScreen('dashboard');
        this.loadDashboardData();
      } else {
        this.showScreen('login');
        errorEl.textContent = response.error || 'Login failed';
        errorEl.style.display = 'block';
      }
    } catch (error) {
      this.showScreen('login');
      errorEl.textContent = 'Connection error. Please try again.';
      errorEl.style.display = 'block';
    }
  }
  
  async handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const dateOfBirth = document.getElementById('date-of-birth').value;
    const parentEmail = document.getElementById('parent-email').value;
    const errorEl = document.getElementById('register-error');
    
    this.showScreen('loading');
    
    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          email,
          password,
          dateOfBirth,
          parentEmail
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Auto-login after successful registration
        await chrome.storage.local.set({
          userToken: data.token,
          userProfile: data.user
        });
        
        this.currentUser = data.user;
        this.showScreen('dashboard');
        this.loadDashboardData();
      } else {
        this.showScreen('register');
        errorEl.textContent = data.error || 'Registration failed';
        errorEl.style.display = 'block';
      }
    } catch (error) {
      this.showScreen('register');
      errorEl.textContent = 'Connection error. Please try again.';
      errorEl.style.display = 'block';
    }
  }
  
  async handleAction(action) {
    console.log('Handling action:', action);
    
    try {
      switch (action) {
        case 'summarize-page':
          await this.summarizePage();
          break;
        case 'dyslexia-mode':
          await this.toggleDyslexiaMode();
          break;
        case 'read-aloud':
          await this.readPageAloud();
          break;
        case 'focus-timer':
          await this.startFocusTimer();
          break;
        default:
          console.log('Unknown action:', action);
      }
    } catch (error) {
      console.error('Action error:', error);
      this.showNotification('Action failed: ' + error.message, 'error');
    }
  }
  
  async summarizePage() {
    this.showNotification('Generating AI summary with BART...', 'info');
    
    try {
      // Get the current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Execute content script to extract page content
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
          // Extract meaningful content from the page
          const content = document.body.innerText || document.body.textContent || '';
          const title = document.title || 'Untitled Page';
          const url = window.location.href;
          
          // Clean up the content
          const cleanContent = content
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 3000); // Limit content size
          
          return { content: cleanContent, title, url };
        }
      });
      
      const pageData = results[0].result;
      
      if (!pageData.content || pageData.content.length < 100) {
        throw new Error('Page content is too short to summarize');
      }
      
      // Send to backend for BART AI processing
      const response = await this.sendToBackend('/api/ai/process', {
        content: pageData.content,
        title: pageData.title,
        url: pageData.url,
        type: 'webpage'
      });
      
      if (response.success) {
        // Store the summary for later access
        await chrome.storage.local.set({
          [`summary_${Date.now()}`]: {
            ...response.data,
            originalUrl: pageData.url,
            timestamp: new Date().toISOString()
          }
        });
        
        // Show summary in a new tab
        await this.displaySummary(response.data, pageData.title);
        this.showNotification('Page summarized with BART AI!', 'success');
        
        // Award points
        await this.awardPoints(15, 'AI Page Summary', 'Summarized a webpage with AI');
        await this.updateTodayStats('pagesRead', 1);
      } else {
        throw new Error(response.message || 'Failed to generate summary');
      }
    } catch (error) {
      console.error('Summarize error:', error);
      this.showNotification('Failed to summarize: ' + error.message, 'error');
    }
  }
  
  async displaySummary(summaryData, originalTitle) {
    // Create a new tab with the AI summary
    const summaryHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>MindSpark AI Summary - ${originalTitle}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
          line-height: 1.6;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
        }
        .container {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 2em;
          font-weight: 600;
        }
        .header p {
          margin: 10px 0 0 0;
          opacity: 0.9;
          font-size: 1.1em;
        }
        .content {
          padding: 30px;
        }
        .summary-section {
          background: #f8fafc;
          padding: 25px;
          border-radius: 12px;
          margin-bottom: 25px;
          border-left: 4px solid #4f46e5;
        }
        .summary-section h3 {
          color: #4f46e5;
          margin-top: 0;
          margin-bottom: 15px;
          font-size: 1.3em;
          font-weight: 600;
        }
        .key-points {
          list-style: none;
          padding: 0;
        }
        .key-points li {
          background: white;
          margin-bottom: 10px;
          padding: 12px 16px;
          border-radius: 8px;
          border-left: 3px solid #10b981;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .flashcard {
          background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%);
          border: 1px solid #0ea5e9;
          padding: 20px;
          margin: 15px 0;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(14, 165, 233, 0.1);
        }
        .flashcard strong {
          color: #0369a1;
        }
        .quiz-question {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 1px solid #f59e0b;
          padding: 20px;
          margin: 15px 0;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.1);
        }
        .quiz-question strong {
          color: #92400e;
        }
        .processed-by {
          text-align: center;
          color: #6b7280;
          font-size: 0.95em;
          margin-top: 30px;
          padding: 20px;
          background: #f3f4f6;
          border-radius: 12px;
          border: 2px dashed #d1d5db;
        }
        .analysis-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin-top: 20px;
        }
        .stat-box {
          background: white;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
          border: 1px solid #e5e7eb;
        }
        .stat-number {
          font-size: 1.5em;
          font-weight: bold;
          color: #4f46e5;
        }
        .stat-label {
          color: #6b7280;
          font-size: 0.9em;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🧠 MindSpark AI Summary</h1>
          <p>Powered by ${summaryData.processedBy || 'BART AI Transformer'}</p>
        </div>
        
        <div class="content">
          <div class="summary-section">
            <h3>📝 AI Summary</h3>
            <p>${summaryData.summary}</p>
          </div>
          
          <div class="summary-section">
            <h3>🔑 Key Points</h3>
            <ul class="key-points">
              ${summaryData.keyPoints.map(point => `<li>${point}</li>`).join('')}
            </ul>
          </div>
          
          ${summaryData.analysis ? `
          <div class="summary-section">
            <h3>📊 Content Analysis</h3>
            <div class="analysis-stats">
              <div class="stat-box">
                <div class="stat-number">${summaryData.analysis.wordCount}</div>
                <div class="stat-label">Words</div>
              </div>
              <div class="stat-box">
                <div class="stat-number">${summaryData.analysis.sentenceCount}</div>
                <div class="stat-label">Sentences</div>
              </div>
              <div class="stat-box">
                <div class="stat-number">${summaryData.analysis.readingLevel}</div>
                <div class="stat-label">Reading Level</div>
              </div>
              <div class="stat-box">
                <div class="stat-number">${summaryData.analysis.estimatedReadingTime}m</div>
                <div class="stat-label">Read Time</div>
              </div>
            </div>
          </div>
          ` : ''}
          
          <div class="summary-section">
            <h3>🧩 Flashcards</h3>
            ${summaryData.flashcards.map(card => `
              <div class="flashcard">
                <strong>Q:</strong> ${card.question}<br><br>
                <strong>A:</strong> ${card.answer}
              </div>
            `).join('')}
          </div>
          
          <div class="summary-section">
            <h3>❓ Quiz Questions</h3>
            ${summaryData.quiz.map((q, i) => `
              <div class="quiz-question">
                <strong>Question ${i + 1}:</strong> ${q.question}<br><br>
                <strong>Options:</strong><br>
                ${q.options.map((opt, j) => `${j === q.correct ? '✅' : '○'} ${opt}`).join('<br>')}<br><br>
                <strong>Correct Answer:</strong> ${q.options[q.correct]}
              </div>
            `).join('')}
          </div>
          
          <div class="processed-by">
            🤖 Processed by <strong>${summaryData.processedBy}</strong><br>
            ⏰ ${new Date().toLocaleString()}<br>
            🧠 Enhanced with MindSpark AI Learning Assistant
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
    
    const blob = new Blob([summaryHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    await chrome.tabs.create({ url });
  }
  
  async sendToBackend(endpoint, data) {
    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo-token-123'
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Backend API Error:', error);
      
      // Provide user-friendly error messages
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please check your connection.');
      } else if (error.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to AI service. Please ensure the backend is running.');
      } else {
        throw error;
      }
    }
  }
  
  async toggleDyslexiaMode() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        // Toggle dyslexia-friendly styling
        const existingStyle = document.getElementById('mindspark-dyslexia-style');
        
        if (existingStyle) {
          existingStyle.remove();
          return false; // Disabled
        } else {
          const style = document.createElement('style');
          style.id = 'mindspark-dyslexia-style';
          style.textContent = `
            * {
              font-family: 'OpenDyslexic', 'Comic Sans MS', Arial, sans-serif !important;
              line-height: 1.8 !important;
              letter-spacing: 0.12em !important;
            }
            p, div, span, li, h1, h2, h3, h4, h5, h6, a {
              background-color: #fefce8 !important;
              color: #1f2937 !important;
              border-radius: 4px !important;
              padding: 4px !important;
              margin: 3px 0 !important;
            }
            input, textarea {
              background-color: #f0fdf4 !important;
              border: 2px solid #16a34a !important;
            }
          `;
          document.head.appendChild(style);
          return true; // Enabled
        }
      }
    });
    
    this.showNotification('Dyslexia-friendly mode toggled', 'success');
  }
  
  async readPageAloud() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        // Stop any ongoing speech
        speechSynthesis.cancel();
        
        // Get readable content (paragraphs, headings, etc.)
        const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li');
        let content = '';
        
        elements.forEach(el => {
          const text = el.innerText.trim();
          if (text && text.length > 10) {
            content += text + '. ';
          }
        });
        
        // Limit content length
        content = content.slice(0, 2000);
        
        if (content) {
          const utterance = new SpeechSynthesisUtterance(content);
          utterance.rate = 0.8;
          utterance.pitch = 1;
          utterance.volume = 0.8;
          
          // Use a clearer voice if available
          const voices = speechSynthesis.getVoices();
          const preferredVoice = voices.find(voice => 
            voice.lang.includes('en') && voice.name.includes('Natural')
          ) || voices.find(voice => voice.lang.includes('en'));
          
          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }
          
          speechSynthesis.speak(utterance);
          return true;
        }
        return false;
      }
    });
    
    if (results[0].result) {
      this.showNotification('Reading page aloud... Click again to stop', 'success');
    } else {
      this.showNotification('No readable content found on this page', 'error');
    }
  }
  
  async awardPoints(points, activity, description) {
    try {
      const response = await this.sendToBackend('/api/progress/award-points', {
        points,
        activity,
        description
      });
      
      if (response.success) {
        // Update local points display
        const pointsElement = document.getElementById('points-value');
        if (pointsElement) {
          const currentPoints = parseInt(pointsElement.textContent) || 0;
          pointsElement.textContent = currentPoints + points;
        }
      }
    } catch (error) {
      console.error('Failed to award points:', error);
      // Don't show error to user for points - it's not critical
    }
  }
  
  async handleLogout() {
    await chrome.storage.local.clear();
    this.currentUser = null;
    this.showScreen('login');
  }
  
  async loadDashboardData() {
    if (!this.currentUser) return;
    
    // Update user info
    document.getElementById('username').textContent = this.currentUser.username;
    document.getElementById('points-value').textContent = this.currentUser.points || 0;
    
    // Load preferences
    const preferences = await chrome.runtime.sendMessage({ action: 'getPreferences' });
    if (preferences) {
      document.getElementById('auto-summarize').checked = preferences.autoSummarize || false;
      document.getElementById('dyslexia-default').checked = preferences.dyslexiaMode || false;
      document.getElementById('reading-reminders').checked = preferences.readingReminders || false;
    }
    
    // Load today's stats (mock data for now)
    this.loadTodayStats();
    
    // Load recent achievements
    this.loadRecentAchievements();
  }
  
  async loadTodayStats() {
    // In a real implementation, this would fetch from the backend
    const stats = await chrome.storage.local.get(['todayStats']);
    const todayStats = stats.todayStats || {
      pagesRead: 0,
      gamesPlayed: 0,
      focusTime: 0
    };
    
    document.getElementById('pages-read').textContent = todayStats.pagesRead;
    document.getElementById('games-played').textContent = todayStats.gamesPlayed;
    document.getElementById('focus-time').textContent = todayStats.focusTime + 'm';
  }
  
  async loadRecentAchievements() {
    const achievementsList = document.getElementById('achievements-list');
    
    // Mock achievements - in real implementation, fetch from backend
    const achievements = [
      { icon: '🎯', text: 'Completed first focus session' },
      { icon: '📚', text: 'Read 5 pages today' },
      { icon: '🧩', text: 'Memory game champion' }
    ];
    
    if (achievements.length === 0) {
      achievementsList.innerHTML = '<div class="no-achievements">Complete activities to earn achievements!</div>';
    } else {
      achievementsList.innerHTML = achievements.map(achievement => `
        <div class="achievement-item">
          <span class="achievement-icon">${achievement.icon}</span>
          <span class="achievement-text">${achievement.text}</span>
        </div>
      `).join('');
    }
  }
  
  async handleAction(action) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    switch (action) {
      case 'summarize-page':
        chrome.tabs.sendMessage(tab.id, { action: 'summarizePage' });
        this.updateTodayStats('pagesRead', 1);
        break;
        
      case 'dyslexia-mode':
        chrome.tabs.sendMessage(tab.id, { action: 'toggleDyslexiaMode' });
        break;
        
      case 'read-aloud':
        chrome.tabs.sendMessage(tab.id, { action: 'readPageAloud' });
        break;
        
      case 'focus-timer':
        this.startFocusTimer();
        break;
    }
    
    // Close popup after action
    window.close();
  }
  
  async startGame(gameType) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, {
      action: 'startGame',
      gameType: gameType
    });
    
    this.updateTodayStats('gamesPlayed', 1);
    window.close();
  }
  
  startFocusTimer() {
    // Create a simple focus timer notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Focus Timer Started',
      message: '25 minutes of focused work time begins now!'
    });
    
    // Set a timer for 25 minutes (Pomodoro technique)
    setTimeout(() => {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Focus Session Complete!',
        message: 'Great job! Take a 5-minute break.'
      });
      
      this.updateTodayStats('focusTime', 25);
    }, 25 * 60 * 1000);
  }
  
  async handlePreferenceChange(e) {
    const preferences = await chrome.runtime.sendMessage({ action: 'getPreferences' });
    
    switch (e.target.id) {
      case 'auto-summarize':
        preferences.autoSummarize = e.target.checked;
        break;
      case 'dyslexia-default':
        preferences.dyslexiaMode = e.target.checked;
        break;
      case 'reading-reminders':
        preferences.readingReminders = e.target.checked;
        break;
    }
    
    await chrome.runtime.sendMessage({
      action: 'updatePreferences',
      preferences: preferences
    });
  }
  
  async updateTodayStats(statType, increment) {
    const stats = await chrome.storage.local.get(['todayStats']);
    const todayStats = stats.todayStats || {
      pagesRead: 0,
      gamesPlayed: 0,
      focusTime: 0
    };
    
    todayStats[statType] += increment;
    
    await chrome.storage.local.set({ todayStats });
    
    // Update display
    const element = document.getElementById(statType.replace(/([A-Z])/g, '-$1').toLowerCase());
    if (element) {
      element.textContent = statType === 'focusTime' ? todayStats[statType] + 'm' : todayStats[statType];
    }
  }
  
  showNotification(message, type = 'info') {
    // Simple notification system for the popup
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 16px;
      border-radius: 6px;
      color: white;
      font-size: 12px;
      z-index: 1000;
      animation: slideDown 0.3s ease;
    `;
    
    switch (type) {
      case 'success':
        notification.style.background = '#10b981';
        break;
      case 'error':
        notification.style.background = '#ef4444';
        break;
      default:
        notification.style.background = '#3b82f6';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new MindSparkPopup();
});