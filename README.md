# 🧠 MindSpark - Adaptive Learning Platform for Neurodivergent Learners

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://postgresql.org/)

**MindSpark** is a comprehensive adaptive learning platform specifically designed for neurodivergent learners (ADHD, dyslexia, autism spectrum). It combines AI-powered assistance, gamification, accessibility features, and community support to create an inclusive educational environment.

## 🌟 Key Features

### 🤖 AI Learning Assistant
- **Multi-Provider AI**: Google Gemini Pro, HuggingFace models, and enhanced local responses
- **Neurodivergent-Friendly**: Specialized responses for ADHD, dyslexia, and autism
- **Safety First**: Age-appropriate content with built-in safety filters
- **Context-Aware**: Understands learning disabilities and adapts communication style

### 🎮 Educational Games (6 Total)
- **Tic Tac Toe**: Strategic thinking development
- **Memory Match**: Cognitive training and pattern recognition
- **Breathing Exercise**: Mindfulness and anxiety management
- **Word Scramble**: Vocabulary building with adaptive difficulty
- **Math Challenge**: Timed arithmetic with progressive levels
- **Sliding Puzzle**: Problem-solving skills (3x3 and 4x4 grids)

### 📄 Document Processing System
- **AI-Powered Analysis**: Intelligent summarization using Gemini API
- **Multi-Format Support**: PDF, Word documents, and text files
- **Learning Tools**: Auto-generated flashcards, quizzes, and key points
- **Export Options**: Download processed content for offline study

### ✅ Task Management
- **Priority-Based Points**: High (20pts), Medium (15pts), Low (10pts)
- **Smart Categories**: Daily, Academic, Chores, Health, Social, Creative
- **Workflow Tracking**: Pending → In Progress → Completed
- **Automatic Rewards**: Points awarded on task completion

### 📚 Digital Library
- **Document Storage**: Persistent file management system
- **Note Creation**: Rich text editor for personal notes
- **Organization**: Category-based filing and search
- **Integration**: Seamless connection with document processor

### 💬 Community Chat
- **Safe Spaces**: Moderated rooms (General, Study Group, Game Zone, Support Circle)
- **Persistent Messages**: Chat history saved across sessions
- **Real-Time**: Instant message delivery and notifications
- **Supportive Environment**: Peer interaction with safety measures

### 🏆 Gamification System
- **Points & Levels**: Progressive advancement with milestone rewards
- **Achievements**: Unlock badges for various accomplishments
- **Statistics**: Track games played, tasks completed, learning streaks
- **Visual Progress**: Charts and progress bars for motivation

### 🌐 Browser Extension
- **Accessibility Tools**: Dyslexia mode, font scaling, color adjustments
- **Text-to-Speech**: Web content reading with natural voices
- **Page Summarization**: Right-click AI summarization
- **Focus Tools**: Distraction blocking and content highlighting

## 🏗️ Architecture

### Frontend (React + TypeScript)
```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ai/             # AI chatbot components
│   │   ├── documents/      # Document processing UI
│   │   ├── games/          # Educational games
│   │   └── ui/             # Base UI components
│   ├── pages/              # Main application pages
│   ├── stores/             # Zustand state management
│   ├── services/           # API clients and utilities
│   └── types/              # TypeScript definitions
```

### Backend (Node.js + Express)
```
backend/
├── config/                 # Database and app configuration
├── database/              # Migrations and seeders
├── middleware/            # Authentication and validation
├── models/               # Database models
├── routes/               # API endpoints
├── services/             # Business logic
├── utils/                # Helper functions
└── ai-helpers.js         # AI integration utilities
```

### Browser Extension
```
extension/
├── manifest.json         # Extension configuration
├── background.js         # Service worker
├── content.js           # Page interaction script
├── popup.html/js/css    # Extension popup interface
└── icons/               # Extension icons
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Git

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/mindspark.git
cd mindspark
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install extension dependencies
cd ../extension
npm install
```

### 3. Environment Setup
```bash
# Copy environment template
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your configuration:
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/mindspark
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mindspark
DB_USER=your_username
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# AI APIs (Optional - has fallbacks)
GEMINI_API_KEY=your_gemini_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key

# Server
PORT=3001
NODE_ENV=development
```

### 4. Database Setup
```bash
cd backend
npm run init-db
```

### 5. Start Development Servers
```bash
# Terminal 1: Backend server
cd backend
npm run dev

# Terminal 2: Frontend server
cd frontend
npm run dev

# Terminal 3: Extension build (optional)
cd extension
npm run build
```

### 6. Access the Application
- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:3001
- **Extension**: Load `extension/dist` folder in Chrome Developer Mode

## 🔧 Configuration

### AI API Keys
The system includes multiple AI integration options:

1. **Google Gemini Pro**: API key provided (`AIzaSyD25Qkutz-mjpOz8ELQVWmocw0hBoFAG2A`)
2. **HuggingFace Transformers**: Local Python integration available
3. **RapidAPI**: Alternative API service for additional models

#### Local Transformers Setup (Python)
For enhanced document processing and summarization using local AI:

```bash
# Quick setup (Linux/Mac)
cd backend
chmod +x setup-python-ai.sh
./setup-python-ai.sh

# Quick setup (Windows)
cd backend
setup-python-ai.bat

# Manual setup
pip install transformers torch
pip install -r backend/requirements.txt
```

**Test Local AI:**
```bash
# Test summarization
python3 backend/python-ai/local_ai.py --text "Your long text here" --task summarize

# Test question generation
python3 backend/python-ai/local_ai.py --text "Your content" --task questions

# Test content analysis
python3 backend/python-ai/local_ai.py --text "Your content" --task analyze

# Process everything
python3 backend/python-ai/local_ai.py --text "Your content" --task all
```

**Python Integration Example:**
```python
from transformers import pipeline

# Initialize summarization pipeline
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

# Summarize text
summary = summarizer("Your long text here")[0]['summary_text']
print(summary)
```

### Database Configuration
Default PostgreSQL setup:
```sql
-- Create database
CREATE DATABASE mindspark;

-- Create user (optional)
CREATE USER mindspark_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE mindspark TO mindspark_user;
```

### Browser Extension Installation
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/dist` folder
5. Pin the extension to your toolbar

## 📊 API Documentation

### Authentication Endpoints
```
POST /api/auth/register    # User registration
POST /api/auth/login       # User login
GET  /api/auth/profile     # Get user profile
PUT  /api/auth/profile     # Update user profile
```

### Task Management
```
GET    /api/tasks          # Get user tasks
POST   /api/tasks          # Create new task
PUT    /api/tasks/:id      # Update task
DELETE /api/tasks/:id      # Delete task
POST   /api/tasks/:id/complete  # Mark task complete
```

### AI Integration
```
POST /api/ai/chat          # Chat with AI assistant
POST /api/ai/process-document  # Process uploaded document
GET  /api/ai/models        # Get available AI models
```

### Community Features
```
GET  /api/chat/rooms       # Get chat rooms
GET  /api/chat/messages/:roomId  # Get room messages
POST /api/chat/messages    # Send message
```

## 🎯 Accessibility Features

### Visual Accommodations
- **Dyslexia Support**: OpenDyslexic font, increased spacing
- **High Contrast**: Multiple color schemes for visual clarity
- **Font Scaling**: Adjustable text sizes (12px to 24px)
- **Reduced Motion**: Respect user motion preferences

### Cognitive Support
- **Clear Navigation**: Simple, consistent interface design
- **Progress Indicators**: Visual feedback for all actions
- **Chunked Information**: Bite-sized content presentation
- **Multiple Modalities**: Text, audio, and visual learning options

### Motor Accommodations
- **Large Targets**: Minimum 44px touch targets
- **Keyboard Navigation**: Full keyboard accessibility
- **Voice Input**: Speech-to-text capabilities
- **Reduced Precision**: Forgiving interaction areas

## 🧪 Testing

### Run Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Extension tests
cd extension
npm test
```

### Test Coverage
- Unit tests for all utility functions
- Integration tests for API endpoints
- Component tests for React components
- End-to-end tests for critical user flows

## 🚀 Deployment

### Production Build
```bash
# Build frontend
cd frontend
npm run build

# Build extension
cd extension
npm run build

# Start production server
cd backend
npm start
```

### Environment Variables (Production)
```env
NODE_ENV=production
DATABASE_URL=your_production_database_url
JWT_SECRET=your_production_jwt_secret
GEMINI_API_KEY=your_production_gemini_key
HUGGINGFACE_API_KEY=your_production_hf_key
```

### Docker Deployment (Optional)
```bash
# Build and run with Docker Compose
docker-compose up --build
```

## 📈 Performance Optimization

### Frontend
- Code splitting with React.lazy()
- Image optimization and lazy loading
- Service worker for offline functionality
- Bundle size optimization with Vite

### Backend
- Database query optimization with indexes
- API response caching
- Rate limiting for API endpoints
- Connection pooling for database

### Database
- Proper indexing on frequently queried columns
- Query optimization for complex joins
- Regular maintenance and cleanup
- Backup and recovery procedures

## 🔒 Security

### Authentication
- JWT tokens with secure expiration
- Password hashing with bcrypt
- Rate limiting on auth endpoints
- CORS configuration for API access

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection with Content Security Policy
- Secure headers with helmet.js

### Privacy
- GDPR-compliant data handling
- Minimal data collection principles
- User consent management
- Data retention policies

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- ESLint and Prettier for code formatting
- TypeScript for type safety
- Conventional commits for clear history
- Unit tests for new features

### Issue Reporting
Please use the GitHub issue tracker to report bugs or request features. Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Neurodivergent Community**: For insights and feedback on accessibility needs
- **Open Source Libraries**: React, Node.js, PostgreSQL, and many others
- **AI Providers**: Google Gemini and HuggingFace for AI capabilities
- **Accessibility Guidelines**: WCAG 2.1 AA compliance standards

## 📞 Support

### Documentation
- [Setup Guide](SETUP.md)
- [API Documentation](docs/API.md)
- [Accessibility Guide](docs/ACCESSIBILITY.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

### Community
- [GitHub Discussions](https://github.com/yourusername/mindspark/discussions)
- [Discord Server](https://discord.gg/mindspark)
- [Email Support](mailto:support@mindspark.app)

### Bug Reports
- [GitHub Issues](https://github.com/yourusername/mindspark/issues)
- [Security Issues](mailto:security@mindspark.app)

---

**Made with ❤️ for neurodivergent learners everywhere**

*MindSpark - Empowering every mind to learn, grow, and thrive*