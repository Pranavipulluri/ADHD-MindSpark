# ADHD-MindSpark Setup & Run Instructions

## 🎯 Complete Setup Steps

### 1. Initial Setup
Run the automated setup script:
```bash
node setup.js
```

This will:
- Install all backend dependencies
- Install all frontend dependencies  
- Create .env files from examples
- Display next steps

### 2. Database Configuration

#### Option A: Local PostgreSQL
1. **Install PostgreSQL** (if not installed):
   - Download from https://www.postgresql.org/download/
   - Install with default settings

2. **Create Database**:
   ```bash
   createdb mindspark_db
   ```

3. **Update Environment Files**:
   - Edit `backend/.env`:
   ```env
   NODE_ENV=development
   PORT=3000
   DATABASE_URL=postgresql://username:password@localhost:5432/mindspark_db
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   FRONTEND_URL=http://localhost:5173
   ```

4. **Run Database Migrations**:
   ```bash
   cd backend
   npm run migrate
   npm run seed
   ```

#### Option B: Docker (Recommended)
1. **Update Docker Configuration**:
   - Edit `backend/docker-compose.yml` 
   - Set secure passwords for PostgreSQL

2. **Start Services**:
   ```bash
   cd backend
   npm run docker:up
   ```

### 3. Development Setup

#### Start Both Servers (Recommended):
```bash
# From root directory
npm run dev
```

This starts:
- Backend API: http://localhost:3000
- Frontend: http://localhost:5173

#### Start Individually:
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### 4. Access the Application

- **Frontend Application**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health

## 🧪 Testing

### Backend Tests:
```bash
cd backend
npm test                 # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

### Frontend Linting:
```bash
cd frontend
npm run lint            # Check for issues
npm run lint:fix        # Auto-fix issues
```

## 🚀 Production Deployment

### Build for Production:
```bash
npm run build           # Build both frontend and backend
```

### Docker Production:
```bash
cd backend
docker-compose -f docker-compose.prod.yml up -d
```

## 🔧 Troubleshooting

### Common Issues:

1. **Port Already in Use**:
   ```bash
   # Kill process on port 3000
   npx kill-port 3000
   
   # Or change port in backend/.env
   PORT=3001
   ```

2. **Database Connection Failed**:
   - Check PostgreSQL is running
   - Verify DATABASE_URL in backend/.env
   - Ensure database exists: `createdb mindspark_db`

3. **Frontend Build Errors**:
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Backend Dependency Issues**:
   ```bash
   cd backend
   rm -rf node_modules package-lock.json
   npm install
   ```

### Development Tips:

1. **View API Documentation**:
   - Start backend server
   - Visit http://localhost:3000/api-docs

2. **Monitor Logs**:
   ```bash
   # Backend logs
   cd backend && npm run dev
   
   # Docker logs
   cd backend && docker-compose logs -f
   ```

3. **Database Management**:
   ```bash
   # Reset database
   cd backend && npm run db:reset
   
   # Create new migration
   cd backend && npm run migrate:create migration-name
   ```

## 📱 Features Overview

Once running, you can:

### Authentication
- Register new account
- Login with email/password
- JWT-based secure sessions

### Task Management
- Create, edit, delete tasks
- Set priorities and due dates
- Mark tasks complete
- View task analytics

### Focus Sessions
- Start Pomodoro timer sessions
- Track focus time
- Break reminders
- Session analytics

### Gamification
- Earn points for completing tasks
- Level up system
- Achievement badges
- Progress streaks

### Real-time Features
- Live notifications
- Real-time task updates
- WebSocket communication

## 🔒 Security Features

- JWT authentication with httpOnly cookies
- Rate limiting on all endpoints
- Input validation with Joi schemas
- XSS protection with Helmet
- CORS configured for frontend

## 🤝 Support

If you encounter issues:

1. **Check the logs** in terminal where servers are running
2. **Verify environment variables** in .env files
3. **Check database connection** and ensure PostgreSQL is running
4. **Review API documentation** at http://localhost:3000/api-docs
5. **Run tests** to verify functionality: `cd backend && npm test`

## 📋 Development Checklist

- [ ] PostgreSQL installed and running
- [ ] Environment files configured (.env)
- [ ] Database created and migrated
- [ ] Dependencies installed (backend & frontend)
- [ ] Both servers running successfully
- [ ] Can access frontend at http://localhost:5173
- [ ] Can access API at http://localhost:3000
- [ ] Registration/login working
- [ ] Task creation/management working
- [ ] Real-time features functional

---

**Happy coding! 🎉** Your ADHD-MindSpark application is ready for development!
