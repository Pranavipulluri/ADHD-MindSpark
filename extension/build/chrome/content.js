// Content script for MindSpark extension
class MindSparkContent {
  constructor() {
    this.isActive = false;
    this.dyslexiaMode = false;
    this.originalStyles = new Map();
    this.summaryPanel = null;
    this.accessibilityPanel = null;
    this.gameOverlay = null;
    
    this.init();
  }
  
  // Helper function to safely send messages to background script
  safeRuntimeMessage(message, callback = null) {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Extension connection error:', chrome.runtime.lastError.message);
          if (callback) callback(null);
          return;
        }
        if (callback) callback(response);
      });
    } catch (error) {
      console.log('Extension error:', error);
      if (callback) callback(null);
    }
  }
  
  async init() {
    // Load user preferences
    const preferences = await this.getUserPreferences();
    this.dyslexiaMode = preferences.dyslexiaMode;
    
    // Apply saved preferences
    if (this.dyslexiaMode) {
      this.enableDyslexiaMode();
    }
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // Create floating action button
    this.createFloatingButton();
    
    // Auto-summarize if enabled and page has enough content
    if (preferences.autoSummarize && this.shouldAutoSummarize()) {
      setTimeout(() => this.autoSummarizePage(), 3000);
    }
    
    // Track reading time for points
    this.trackReadingTime();
  }
  
  async getUserPreferences() {
    return new Promise((resolve) => {
      this.safeRuntimeMessage({ action: 'getPreferences' }, (response) => {
        resolve(response || {});
      });
    });
  }
  
  handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'toggleDyslexiaMode':
        this.toggleDyslexiaMode();
        break;
      case 'showSummary':
        this.showSummary(message.summary);
        break;
      case 'startGame':
        this.startBrainGame(message.gameType);
        break;
      case 'enableReadingMode':
        this.enableReadingMode();
        break;
    }
  }
  
  createFloatingButton() {
    const button = document.createElement('div');
    button.id = 'mindspark-floating-btn';
    button.innerHTML = `
      <div class="ms-btn-icon">🧠</div>
      <div class="ms-btn-tooltip">MindSpark Assistant</div>
    `;
    
    button.addEventListener('click', () => this.toggleAccessibilityPanel());
    
    document.body.appendChild(button);
    
    // Add styles
    this.addFloatingButtonStyles();
  }
  
  addFloatingButtonStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #mindspark-floating-btn {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
      }
      
      #mindspark-floating-btn:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0,0,0,0.2);
      }
      
      #mindspark-floating-btn .ms-btn-icon {
        font-size: 24px;
        color: white;
      }
      
      #mindspark-floating-btn .ms-btn-tooltip {
        position: absolute;
        right: 60px;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
      
      #mindspark-floating-btn:hover .ms-btn-tooltip {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }
  
  toggleAccessibilityPanel() {
    if (this.accessibilityPanel) {
      this.accessibilityPanel.remove();
      this.accessibilityPanel = null;
    } else {
      this.createAccessibilityPanel();
    }
  }
  
  createAccessibilityPanel() {
    this.accessibilityPanel = document.createElement('div');
    this.accessibilityPanel.id = 'mindspark-accessibility-panel';
    this.accessibilityPanel.innerHTML = `
      <div class="ms-panel-header">
        <h3>🧠 MindSpark Assistant</h3>
        <button class="ms-close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="ms-panel-content">
        <div class="ms-feature-group">
          <h4>🎨 Visual Accessibility</h4>
          <button class="ms-feature-btn" data-action="toggleDyslexia">
            ${this.dyslexiaMode ? '✅' : '⚪'} Dyslexia-Friendly Mode
          </button>
          <button class="ms-feature-btn" data-action="increaseFontSize">🔍 Increase Font Size</button>
          <button class="ms-feature-btn" data-action="decreaseFontSize">🔍 Decrease Font Size</button>
          <button class="ms-feature-btn" data-action="toggleHighContrast">🌓 High Contrast</button>
        </div>
        
        <div class="ms-feature-group">
          <h4>🤖 AI Features</h4>
          <button class="ms-feature-btn" data-action="summarizePage">📝 Summarize Page</button>
          <button class="ms-feature-btn" data-action="readAloud">🔊 Read Aloud</button>
          <button class="ms-feature-btn" data-action="simplifyText">✨ Simplify Text</button>
        </div>
        
        <div class="ms-feature-group">
          <h4>🎮 Brain Games</h4>
          <button class="ms-feature-btn" data-action="memoryGame">🧩 Memory Game</button>
          <button class="ms-feature-btn" data-action="focusGame">🎯 Focus Game</button>
          <button class="ms-feature-btn" data-action="breathingExercise">🫁 Breathing Exercise</button>
        </div>
        
        <div class="ms-points-display">
          <span class="ms-points-label">Points: </span>
          <span class="ms-points-value" id="ms-points-value">0</span>
        </div>
      </div>
    `;
    
    // Add event listeners
    this.accessibilityPanel.addEventListener('click', (e) => {
      if (e.target.classList.contains('ms-feature-btn')) {
        this.handleFeatureClick(e.target.dataset.action);
      }
    });
    
    document.body.appendChild(this.accessibilityPanel);
    this.addAccessibilityPanelStyles();
    this.updatePointsDisplay();
  }
  
  addAccessibilityPanelStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #mindspark-accessibility-panel {
        position: fixed;
        top: 80px;
        right: 20px;
        width: 300px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        z-index: 10001;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        border: 1px solid #e1e5e9;
      }
      
      .ms-panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #e1e5e9;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 12px 12px 0 0;
      }
      
      .ms-panel-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      .ms-close-btn {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .ms-panel-content {
        padding: 20px;
        max-height: 400px;
        overflow-y: auto;
      }
      
      .ms-feature-group {
        margin-bottom: 20px;
      }
      
      .ms-feature-group h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: 600;
        color: #374151;
      }
      
      .ms-feature-btn {
        display: block;
        width: 100%;
        padding: 10px 12px;
        margin-bottom: 8px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        text-align: left;
        transition: all 0.2s ease;
      }
      
      .ms-feature-btn:hover {
        background: #e2e8f0;
        border-color: #cbd5e0;
      }
      
      .ms-points-display {
        text-align: center;
        padding: 12px;
        background: #f0f9ff;
        border-radius: 8px;
        border: 1px solid #bae6fd;
      }
      
      .ms-points-label {
        font-size: 14px;
        color: #0369a1;
        font-weight: 500;
      }
      
      .ms-points-value {
        font-size: 18px;
        font-weight: 700;
        color: #0c4a6e;
      }
    `;
    document.head.appendChild(style);
  }
  
  async handleFeatureClick(action) {
    switch (action) {
      case 'toggleDyslexia':
        this.toggleDyslexiaMode();
        break;
      case 'increaseFontSize':
        this.adjustFontSize(1.2);
        break;
      case 'decreaseFontSize':
        this.adjustFontSize(0.8);
        break;
      case 'toggleHighContrast':
        this.toggleHighContrast();
        break;
      case 'summarizePage':
        await this.summarizePage();
        break;
      case 'readAloud':
        this.readPageAloud();
        break;
      case 'simplifyText':
        await this.simplifyText();
        break;
      case 'memoryGame':
        this.startBrainGame('memory');
        break;
      case 'focusGame':
        this.startBrainGame('focus');
        break;
      case 'breathingExercise':
        this.startBreathingExercise();
        break;
    }
  }
  
  toggleDyslexiaMode() {
    this.dyslexiaMode = !this.dyslexiaMode;
    
    if (this.dyslexiaMode) {
      this.enableDyslexiaMode();
    } else {
      this.disableDyslexiaMode();
    }
    
    // Update preferences
    this.safeRuntimeMessage({
      action: 'updatePreferences',
      preferences: { dyslexiaMode: this.dyslexiaMode }
    });
    
    // Update button text
    const btn = document.querySelector('[data-action="toggleDyslexia"]');
    if (btn) {
      btn.innerHTML = `${this.dyslexiaMode ? '✅' : '⚪'} Dyslexia-Friendly Mode`;
    }
  }
  
  enableDyslexiaMode() {
    const style = document.createElement('style');
    style.id = 'mindspark-dyslexia-styles';
    style.textContent = `
      * {
        font-family: 'OpenDyslexic', 'Comic Sans MS', cursive !important;
        line-height: 1.6 !important;
        letter-spacing: 0.05em !important;
      }
      
      p, div, span, li, td, th {
        background-color: #fefefe !important;
        color: #2d3748 !important;
      }
      
      a {
        color: #3182ce !important;
        text-decoration: underline !important;
      }
      
      h1, h2, h3, h4, h5, h6 {
        color: #1a202c !important;
        font-weight: bold !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  disableDyslexiaMode() {
    const style = document.getElementById('mindspark-dyslexia-styles');
    if (style) {
      style.remove();
    }
  }
  
  adjustFontSize(multiplier) {
    const elements = document.querySelectorAll('p, div, span, li, td, th, h1, h2, h3, h4, h5, h6');
    elements.forEach(el => {
      const currentSize = window.getComputedStyle(el).fontSize;
      const newSize = parseFloat(currentSize) * multiplier;
      el.style.fontSize = newSize + 'px';
    });
    
    // Award points for accessibility usage
    this.safeRuntimeMessage({
      action: 'updatePoints',
      points: 2,
      activity: 'font_adjustment'
    });
  }
  
  toggleHighContrast() {
    const existingStyle = document.getElementById('mindspark-high-contrast');
    
    if (existingStyle) {
      existingStyle.remove();
    } else {
      const style = document.createElement('style');
      style.id = 'mindspark-high-contrast';
      style.textContent = `
        * {
          background-color: #000000 !important;
          color: #ffffff !important;
        }
        
        a {
          color: #ffff00 !important;
        }
        
        img {
          filter: contrast(150%) brightness(150%) !important;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Award points
    chrome.runtime.sendMessage({
      action: 'updatePoints',
      points: 2,
      activity: 'contrast_toggle'
    });
  }
  
  async summarizePage() {
    const content = this.extractPageContent();
    
    chrome.runtime.sendMessage({
      action: 'summarizePage',
      url: window.location.href,
      content: content
    }, (response) => {
      if (response.success) {
        this.showSummary(response.summary);
      } else {
        this.showNotification('Failed to summarize page', 'error');
      }
    });
  }
  
  extractPageContent() {
    // Remove script and style elements
    const clonedDoc = document.cloneNode(true);
    const scripts = clonedDoc.querySelectorAll('script, style, nav, header, footer');
    scripts.forEach(el => el.remove());
    
    // Get main content
    const mainContent = clonedDoc.querySelector('main, article, .content, #content') || clonedDoc.body;
    return mainContent.textContent.trim().substring(0, 5000); // Limit content length
  }
  
  showSummary(summary) {
    if (this.summaryPanel) {
      this.summaryPanel.remove();
    }
    
    this.summaryPanel = document.createElement('div');
    this.summaryPanel.id = 'mindspark-summary-panel';
    this.summaryPanel.innerHTML = `
      <div class="ms-summary-header">
        <h3>📝 Page Summary</h3>
        <button class="ms-close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="ms-summary-content">
        <p>${summary}</p>
        <div class="ms-summary-actions">
          <button class="ms-action-btn" onclick="this.parentElement.parentElement.parentElement.querySelector('.ms-summary-content p').style.fontSize='18px'">🔍 Larger Text</button>
          <button class="ms-action-btn" data-action="readSummary">🔊 Read Aloud</button>
        </div>
      </div>
    `;
    
    this.summaryPanel.addEventListener('click', (e) => {
      if (e.target.dataset.action === 'readSummary') {
        this.readText(summary);
      }
    });
    
    document.body.appendChild(this.summaryPanel);
    this.addSummaryPanelStyles();
  }
  
  addSummaryPanelStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #mindspark-summary-panel {
        position: fixed;
        bottom: 20px;
        left: 20px;
        width: 400px;
        max-width: calc(100vw - 40px);
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15);
        z-index: 10002;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        border: 1px solid #e1e5e9;
      }
      
      .ms-summary-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #e1e5e9;
        background: #f8fafc;
        border-radius: 12px 12px 0 0;
      }
      
      .ms-summary-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #374151;
      }
      
      .ms-summary-content {
        padding: 20px;
        max-height: 300px;
        overflow-y: auto;
      }
      
      .ms-summary-content p {
        margin: 0 0 16px 0;
        line-height: 1.6;
        color: #374151;
        font-size: 14px;
      }
      
      .ms-summary-actions {
        display: flex;
        gap: 8px;
        margin-top: 16px;
      }
      
      .ms-action-btn {
        padding: 8px 12px;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        transition: background 0.2s ease;
      }
      
      .ms-action-btn:hover {
        background: #2563eb;
      }
    `;
    document.head.appendChild(style);
  }
  
  readText(text) {
    chrome.runtime.sendMessage({
      action: 'readAloud',
      text: text
    });
  }
  
  readPageAloud() {
    const content = this.extractPageContent();
    const firstParagraph = content.substring(0, 500) + '...';
    this.readText(firstParagraph);
  }
  
  async simplifyText() {
    const selectedText = window.getSelection().toString();
    if (!selectedText) {
      this.showNotification('Please select some text first', 'info');
      return;
    }
    
    // This would call an AI service to simplify text
    chrome.runtime.sendMessage({
      action: 'simplifyText',
      text: selectedText
    }, (response) => {
      if (response.success) {
        this.showSimplifiedText(response.simplifiedText);
      }
    });
  }
  
  startBrainGame(gameType) {
    if (this.gameOverlay) {
      this.gameOverlay.remove();
    }
    
    this.gameOverlay = document.createElement('div');
    this.gameOverlay.id = 'mindspark-game-overlay';
    
    switch (gameType) {
      case 'memory':
        this.createMemoryGame();
        break;
      case 'focus':
        this.createFocusGame();
        break;
    }
    
    document.body.appendChild(this.gameOverlay);
    this.addGameOverlayStyles();
  }
  
  createMemoryGame() {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];
    const cards = [...colors, ...colors].sort(() => Math.random() - 0.5);
    
    this.gameOverlay.innerHTML = `
      <div class="ms-game-container">
        <div class="ms-game-header">
          <h3>🧩 Memory Game</h3>
          <div class="ms-game-stats">
            <span>Moves: <span id="moves">0</span></span>
            <span>Time: <span id="timer">0</span>s</span>
          </div>
          <button class="ms-close-btn" onclick="this.closest('#mindspark-game-overlay').remove()">×</button>
        </div>
        <div class="ms-memory-grid">
          ${cards.map((color, index) => `
            <div class="ms-memory-card" data-color="${color}" data-index="${index}">
              <div class="ms-card-front"></div>
              <div class="ms-card-back" style="background-color: ${color}"></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    this.initMemoryGame();
  }
  
  initMemoryGame() {
    let flippedCards = [];
    let moves = 0;
    let matches = 0;
    let startTime = Date.now();
    
    const cards = this.gameOverlay.querySelectorAll('.ms-memory-card');
    const movesEl = this.gameOverlay.querySelector('#moves');
    const timerEl = this.gameOverlay.querySelector('#timer');
    
    // Update timer
    const timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      timerEl.textContent = elapsed;
    }, 1000);
    
    cards.forEach(card => {
      card.addEventListener('click', () => {
        if (card.classList.contains('flipped') || flippedCards.length === 2) return;
        
        card.classList.add('flipped');
        flippedCards.push(card);
        
        if (flippedCards.length === 2) {
          moves++;
          movesEl.textContent = moves;
          
          const [card1, card2] = flippedCards;
          if (card1.dataset.color === card2.dataset.color) {
            matches++;
            flippedCards = [];
            
            if (matches === 6) {
              clearInterval(timerInterval);
              const finalTime = Math.floor((Date.now() - startTime) / 1000);
              
              // Award points based on performance
              const points = Math.max(20 - moves, 5) + Math.max(60 - finalTime, 0);
              chrome.runtime.sendMessage({
                action: 'updatePoints',
                points: points,
                activity: 'memory_game'
              });
              
              setTimeout(() => {
                this.showNotification(`Game completed! +${points} points`, 'success');
                this.gameOverlay.remove();
              }, 1000);
            }
          } else {
            setTimeout(() => {
              card1.classList.remove('flipped');
              card2.classList.remove('flipped');
              flippedCards = [];
            }, 1000);
          }
        }
      });
    });
  }
  
  createFocusGame() {
    this.gameOverlay.innerHTML = `
      <div class="ms-game-container">
        <div class="ms-game-header">
          <h3>🎯 Focus Game</h3>
          <div class="ms-game-stats">
            <span>Score: <span id="score">0</span></span>
            <span>Time: <span id="timer">30</span>s</span>
          </div>
          <button class="ms-close-btn" onclick="this.closest('#mindspark-game-overlay').remove()">×</button>
        </div>
        <div class="ms-focus-game">
          <div class="ms-target" id="target"></div>
          <div class="ms-instructions">Click the target as fast as you can!</div>
        </div>
      </div>
    `;
    
    this.initFocusGame();
  }
  
  initFocusGame() {
    let score = 0;
    let timeLeft = 30;
    const target = this.gameOverlay.querySelector('#target');
    const scoreEl = this.gameOverlay.querySelector('#score');
    const timerEl = this.gameOverlay.querySelector('#timer');
    
    const moveTarget = () => {
      const gameArea = this.gameOverlay.querySelector('.ms-focus-game');
      const maxX = gameArea.offsetWidth - 50;
      const maxY = gameArea.offsetHeight - 50;
      
      target.style.left = Math.random() * maxX + 'px';
      target.style.top = Math.random() * maxY + 'px';
    };
    
    target.addEventListener('click', () => {
      score++;
      scoreEl.textContent = score;
      moveTarget();
    });
    
    moveTarget();
    
    const gameTimer = setInterval(() => {
      timeLeft--;
      timerEl.textContent = timeLeft;
      
      if (timeLeft <= 0) {
        clearInterval(gameTimer);
        
        // Award points based on score
        const points = score * 2;
        chrome.runtime.sendMessage({
          action: 'updatePoints',
          points: points,
          activity: 'focus_game'
        });
        
        this.showNotification(`Game over! Score: ${score}, +${points} points`, 'success');
        setTimeout(() => this.gameOverlay.remove(), 2000);
      }
    }, 1000);
  }
  
  addGameOverlayStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #mindspark-game-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0,0,0,0.8);
        z-index: 10003;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .ms-game-container {
        background: white;
        border-radius: 12px;
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        overflow: hidden;
      }
      
      .ms-game-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        background: #f8fafc;
        border-bottom: 1px solid #e1e5e9;
      }
      
      .ms-game-stats {
        display: flex;
        gap: 20px;
        font-size: 14px;
        font-weight: 500;
      }
      
      .ms-memory-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        padding: 20px;
      }
      
      .ms-memory-card {
        aspect-ratio: 1;
        position: relative;
        cursor: pointer;
        border-radius: 8px;
        overflow: hidden;
      }
      
      .ms-card-front, .ms-card-back {
        position: absolute;
        width: 100%;
        height: 100%;
        backface-visibility: hidden;
        transition: transform 0.3s ease;
      }
      
      .ms-card-front {
        background: #e2e8f0;
        border: 2px solid #cbd5e0;
      }
      
      .ms-card-back {
        transform: rotateY(180deg);
      }
      
      .ms-memory-card.flipped .ms-card-front {
        transform: rotateY(180deg);
      }
      
      .ms-memory-card.flipped .ms-card-back {
        transform: rotateY(0deg);
      }
      
      .ms-focus-game {
        position: relative;
        height: 400px;
        background: #f0f9ff;
        margin: 20px;
        border-radius: 8px;
        overflow: hidden;
      }
      
      .ms-target {
        position: absolute;
        width: 50px;
        height: 50px;
        background: #ef4444;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.1s ease;
      }
      
      .ms-target:hover {
        transform: scale(1.1);
      }
      
      .ms-instructions {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 18px;
        color: #64748b;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }
  
  startBreathingExercise() {
    if (this.gameOverlay) {
      this.gameOverlay.remove();
    }
    
    this.gameOverlay = document.createElement('div');
    this.gameOverlay.id = 'mindspark-game-overlay';
    this.gameOverlay.innerHTML = `
      <div class="ms-game-container">
        <div class="ms-game-header">
          <h3>🫁 Breathing Exercise</h3>
          <button class="ms-close-btn" onclick="this.closest('#mindspark-game-overlay').remove()">×</button>
        </div>
        <div class="ms-breathing-container">
          <div class="ms-breathing-circle" id="breathing-circle"></div>
          <div class="ms-breathing-text" id="breathing-text">Get Ready...</div>
          <div class="ms-breathing-counter" id="breathing-counter">0/10</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.gameOverlay);
    this.addBreathingStyles();
    this.initBreathingExercise();
  }
  
  addBreathingStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .ms-breathing-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 400px;
        padding: 40px;
      }
      
      .ms-breathing-circle {
        width: 200px;
        height: 200px;
        border: 3px solid #3b82f6;
        border-radius: 50%;
        margin-bottom: 30px;
        transition: transform 4s ease-in-out;
      }
      
      .ms-breathing-circle.inhale {
        transform: scale(1.3);
        background: rgba(59, 130, 246, 0.1);
      }
      
      .ms-breathing-circle.exhale {
        transform: scale(1);
        background: transparent;
      }
      
      .ms-breathing-text {
        font-size: 24px;
        font-weight: 600;
        color: #374151;
        margin-bottom: 10px;
      }
      
      .ms-breathing-counter {
        font-size: 18px;
        color: #6b7280;
      }
    `;
    document.head.appendChild(style);
  }
  
  initBreathingExercise() {
    const circle = this.gameOverlay.querySelector('#breathing-circle');
    const text = this.gameOverlay.querySelector('#breathing-text');
    const counter = this.gameOverlay.querySelector('#breathing-counter');
    
    let currentCycle = 0;
    const totalCycles = 10;
    
    const breathingCycle = () => {
      if (currentCycle >= totalCycles) {
        // Award points for completing breathing exercise
        chrome.runtime.sendMessage({
          action: 'updatePoints',
          points: 15,
          activity: 'breathing_exercise'
        });
        
        text.textContent = 'Great job! +15 points';
        setTimeout(() => this.gameOverlay.remove(), 2000);
        return;
      }
      
      // Inhale phase
      text.textContent = 'Breathe In...';
      circle.classList.add('inhale');
      circle.classList.remove('exhale');
      
      setTimeout(() => {
        // Hold phase
        text.textContent = 'Hold...';
        
        setTimeout(() => {
          // Exhale phase
          text.textContent = 'Breathe Out...';
          circle.classList.add('exhale');
          circle.classList.remove('inhale');
          
          currentCycle++;
          counter.textContent = `${currentCycle}/${totalCycles}`;
          
          setTimeout(breathingCycle, 4000);
        }, 2000);
      }, 4000);
    };
    
    setTimeout(() => {
      text.textContent = 'Follow the circle...';
      breathingCycle();
    }, 2000);
  }
  
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `ms-notification ms-notification-${type}`;
    notification.textContent = message;
    
    const style = document.createElement('style');
    style.textContent = `
      .ms-notification {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10004;
        animation: slideDown 0.3s ease;
      }
      
      .ms-notification-info { background: #3b82f6; }
      .ms-notification-success { background: #10b981; }
      .ms-notification-error { background: #ef4444; }
      
      @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-100%); }
        to { transform: translateX(-50%) translateY(0); }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 3000);
  }
  
  shouldAutoSummarize() {
    const content = this.extractPageContent();
    return content.length > 1000 && !window.location.href.includes('youtube.com');
  }
  
  async autoSummarizePage() {
    const content = this.extractPageContent();
    if (content.length > 1000) {
      chrome.runtime.sendMessage({
        action: 'summarizePage',
        url: window.location.href,
        content: content
      }, (response) => {
        if (response.success) {
          this.showNotification('Page auto-summarized! Check the summary panel.', 'info');
          setTimeout(() => this.showSummary(response.summary), 1000);
        }
      });
    }
  }
  
  trackReadingTime() {
    let startTime = Date.now();
    let isActive = true;
    
    // Track when user becomes inactive
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        isActive = false;
      } else {
        startTime = Date.now();
        isActive = true;
      }
    });
    
    // Award points for reading time every 5 minutes
    setInterval(() => {
      if (isActive) {
        const readingTime = (Date.now() - startTime) / 1000 / 60; // minutes
        if (readingTime >= 5) {
          chrome.runtime.sendMessage({
            action: 'updatePoints',
            points: 5,
            activity: 'reading_time'
          });
          startTime = Date.now();
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }
  
  async updatePointsDisplay() {
    chrome.runtime.sendMessage({ action: 'getProfile' }, (response) => {
      if (response.success) {
        const pointsEl = document.getElementById('ms-points-value');
        if (pointsEl) {
          pointsEl.textContent = response.user.points || 0;
        }
      }
    });
  }
}

// Initialize content script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new MindSparkContent());
} else {
  new MindSparkContent();
}