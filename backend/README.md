# MindSpark Backend API

A comprehensive Node.js backend for the MindSpark ADHD support application, providing RESTful APIs and real-time WebSocket communication for children and families managing ADHD.

## Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Real-time Chat**: WebSocket-powered community chat rooms
- **Task Management**: CRUD operations for task organization and tracking
- **Mood Tracking**: Daily mood logging and analytics
- **Game Integration**: Score tracking and progress monitoring
- **Document Library**: File upload and organization system
- **Specialist Booking**: Appointment scheduling with ADHD specialists
- **Focus Sessions**: Timed focus and breathing exercises
- **Progress Analytics**: Comprehensive user progress tracking
- **Achievement System**: Gamified progress rewards

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL with Row Level Security
- **Authentication**: JWT tokens
- **File Upload**: Multer
- **WebSockets**: ws library
- **Validation**: Joi
- **Email**: Nodemailer
- **Testing**: Jest + Supertest

## Prerequisites

- Node.js 18.0.0 or higher
- PostgreSQL 13+ 
- npm or yarn package manager

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mindspark-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   # Create PostgreSQL database
   createdb mindspark_db
   
   # Run database migrations
   npm run migrate
   
   # Seed initial data
   npm run seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3001`

## Environment Configuration

Create a `.env` file based on `.env.example`:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/mindspark_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## API Documentation

The API documentation is available at `/docs/api.md` or can be accessed via:
- Swagger UI (if configured): `http://localhost:3001/docs`
- Postman collection: Import from `/docs/postman-collection.json`

### Main Endpoints

- **Authentication**: `/api/auth/*`
- **Mood Tracking**: `/api/mood`
- **Task Management**: `/api/tasks`
- **Games**: `/api/games`
- **Documents**: `/api/documents`
- **Chat**: `/api/chat`
- **Specialists**: `/api/specialists`
- **Appointments**: `/api/appointments`
- **Focus Sessions**: `/api/focus-sessions`
- **Progress**: `/api/progress`

## Database Schema

The application uses PostgreSQL with the following main tables:

- `profiles` - User profiles and authentication
- `mood_entries` - Daily mood tracking
- `tasks` - Task management system
- `games` & `game_scores` - Game integration
- `documents` - File storage and organization
- `chat_rooms` & `chat_messages` - Community chat
- `specialists` & `appointments` - Professional support
- `focus_sessions` - Mindfulness and focus tools
- `achievements` & `user_achievements` - Gamification

## Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm start           # Start production server

# Database
npm run migrate     # Run database migrations
npm run seed        # Seed initial data
npm run seed:clear  # Clear and reseed database

# Testing
npm test            # Run all tests
npm run test:watch  # Run tests in watch mode
npm run test:coverage # Run tests with coverage report

# Code Quality
npm run lint        # Run ESLint
npm run format      # Format code with Prettier
```

## Project Structure

```
backend/
├── config/           # Configuration files
├── database/         # Database schemas, migrations, seeds
├── docs/            # API documentation
├── middleware/      # Express middleware
├── models/          # Database models (if using ORM)
├── routes/          # API route handlers
├── services/        # Business logic services
├── tests/           # Test files
├── utils/           # Utility functions
├── uploads/         # File upload directory
└── server.js        # Main application entry point
```

## WebSocket Events

The application supports real-time communication via WebSocket:

### Client Events
- `auth` - Authenticate WebSocket connection
- `join_room` - Join a chat room
- `chat_message` - Send a chat message
- `typing_start/stop` - Typing indicators

### Server Events
- `auth_success` - Authentication confirmed
- `new_message` - New chat message received
- `user_joined/left` - Room membership changes
- `error` - Error notifications

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run specific test files
npm test auth.test.js
npm test tasks.test.js

# Run with coverage
npm run test:coverage

# Run in watch mode during development
npm run test:watch
```

## Deployment

### Development
```bash
npm run dev
```

### Production
```bash
# Build and start
npm start

# Or with PM2
pm2 start ecosystem.config.js
```

### Docker
```bash
# Build image
docker build -t mindspark-backend .

# Run container
docker run -p 3001:3001 mindspark-backend
```

### Environment Variables for Production
- Set `NODE_ENV=production`
- Use strong `JWT_SECRET`
- Configure proper database connection
- Set up email service credentials
- Configure file storage (local or cloud)

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on all endpoints
- Input validation and sanitization
- SQL injection prevention
- CORS configuration
- Security headers (helmet.js)
- Row Level Security (RLS) in database

## Monitoring and Logging

- Request/response logging with Morgan
- Error tracking and reporting
- Performance monitoring
- Health check endpoints
- Database query logging

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Troubleshooting

### Common Issues

1. **Database connection errors**
   - Check PostgreSQL is running
   - Verify DATABASE_URL in .env
   - Ensure database exists

2. **File upload issues**
   - Check uploads/ directory permissions
   - Verify MAX_FILE_SIZE setting
   - Ensure allowed file types are configured

3. **WebSocket connection fails**
   - Check if port 3001 is available
   - Verify CORS settings
   - Check firewall rules

4. **Email service not working**
   - Verify SMTP credentials
   - Check email service provider settings
   - Test with a simple email client

### Support

For support and questions:
- Create an issue in the repository
- Check the documentation in `/docs`
- Review the API documentation

## Changelog

See CHANGELOG.md for version history and updates.