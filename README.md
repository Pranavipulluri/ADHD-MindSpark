# MindSpark - ADHD Management Platform

A comprehensive full-stack application designed to help individuals with ADHD manage their daily tasks, improve focus, and track their progress through gamification and evidence-based techniques.

## 🌟 Features

### Core Functionality
- **Task Management**: Create, organize, and prioritize tasks with ADHD-friendly interfaces
- **Focus Sessions**: Pomodoro timer with customizable intervals and break reminders
- **Progress Tracking**: Visual analytics and achievement system
- **Gamification**: Points, levels, and rewards to maintain motivation
- **Real-time Updates**: WebSocket-powered live notifications and updates

### Technical Features
- **Authentication**: Secure JWT-based user authentication
- **Real-time Communication**: WebSocket integration for live updates
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Database**: PostgreSQL with comprehensive migration system
- **Testing**: Jest test suite for backend API endpoints
- **Docker Support**: Containerized deployment ready

## 🏗️ Architecture

### Backend (Node.js + Express)
```
backend/
├── server.js              # Main server entry point
├── config/                # Database and app configuration
├── middleware/            # Security, auth, and error handling
├── models/               # Database models and schemas
├── routes/               # API endpoints
├── services/             # Business logic layer
├── utils/                # Utilities and helpers
├── tests/                # Jest test suites
└── scripts/              # Setup and migration scripts
```

### Frontend (React + TypeScript)
```
frontend/
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/           # Page components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # API client and utilities
│   ├── stores/          # Zustand state management
│   └── styles/          # Global styles and themes
├── public/              # Static assets
└── dist/               # Production build output
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- PostgreSQL 14+
- Git

### Installation

1. **Clone and setup the project:**
   ```bash
   git clone <your-repo-url>
   cd ADHD-MindSpark
   npm run setup
   ```

2. **Database setup:**
   ```bash
   # Create database
   createdb mindspark_db
   
   # Update backend/.env with your database credentials
   # Then run migrations and seed data
   cd backend
   npm run migrate
   npm run seed
   ```

3. **Start development servers:**
   ```bash
   # Option 1: Start both servers
   npm run dev
   
   # Option 2: Start individually
   npm run dev:backend    # Backend on http://localhost:3000
   npm run dev:frontend   # Frontend on http://localhost:5173
   ```

4. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - API Documentation: http://localhost:3000/api-docs

### Docker Deployment

```bash
cd backend
npm run docker:up
cd ../frontend
npm run dev
```

## 🔧 Configuration

### Backend Environment (.env)
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://username:password@localhost:5432/mindspark_db
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
FRONTEND_URL=http://localhost:5173
```

### Frontend Environment (.env)
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## 📚 API Documentation

### Authentication Endpoints
```
POST /api/auth/register    # User registration
POST /api/auth/login       # User login
POST /api/auth/logout      # User logout
GET  /api/auth/profile     # Get user profile
PUT  /api/auth/profile     # Update user profile
```

### Task Management
```
GET    /api/tasks          # List user tasks
POST   /api/tasks          # Create new task
GET    /api/tasks/:id      # Get specific task
PUT    /api/tasks/:id      # Update task
DELETE /api/tasks/:id      # Delete task
POST   /api/tasks/:id/complete  # Complete task
```

### Focus Sessions
```
GET    /api/focus-sessions      # List sessions
POST   /api/focus-sessions      # Start session
PUT    /api/focus-sessions/:id  # Update session
POST   /api/focus-sessions/:id/complete  # Complete session
```

### Analytics
```
GET /api/analytics/dashboard    # Dashboard statistics
GET /api/analytics/progress     # Progress over time
GET /api/analytics/achievements # User achievements
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report

# Frontend linting
cd frontend
npm run lint
npm run lint:fix
```

## 🔒 Security Features

- JWT-based authentication with secure httpOnly cookies
- Rate limiting on all API endpoints
- Input validation using Joi schemas
- SQL injection protection with parameterized queries
- XSS protection with helmet middleware
- CORS configured for frontend domain

## 🎮 Gamification System

- **Points**: Earned for completing tasks and focus sessions
- **Levels**: Progress through levels based on total points
- **Achievements**: Unlock badges for various milestones
- **Streaks**: Track consecutive days of activity
- **Leaderboards**: Compare progress with other users (optional)

## 📱 Mobile Responsiveness

The application is built with a mobile-first approach:
- Responsive grid layouts
- Touch-friendly interface elements
- Optimized for various screen sizes
- Progressive Web App (PWA) capabilities

## 🚢 Deployment

### Production Build
```bash
npm run build
```

### Docker Production
```bash
cd backend
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Setup
- Set `NODE_ENV=production`
- Configure production database
- Set secure JWT secrets
- Configure email service
- Set up SSL certificates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the API documentation at `/api-docs` when running

## 🙏 Acknowledgments

- ADHD community for insights and feedback
- Open source libraries that made this possible
- Contributors and testers who helped improve the platform

---

**Made with ❤️ for the ADHD community**
