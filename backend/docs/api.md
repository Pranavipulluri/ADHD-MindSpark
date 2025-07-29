# MindSpark API Documentation

## Base URL
```
Development: http://localhost:3001/api
Production: https://api.mindspark.com/api
```

## Authentication
All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Response Format
All API responses follow this format:
```json
{
  "success": true,
  "data": {},
  "message": "Success message",
  "error": null
}
```

Error responses:
```json
{
  "success": false,
  "data": null,
  "message": null,
  "error": "Error message",
  "details": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

## Authentication Endpoints

### Register User
```http
POST /auth/register
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "username": "unique_username",
  "dateOfBirth": "2010-01-01",
  "parentEmail": "parent@example.com"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "unique_username",
    "points": 0,
    "level": 1
  },
  "token": "jwt_token"
}
```

### Login User
```http
POST /auth/login
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "unique_username",
    "points": 150,
    "level": 2,
    "avatar_url": "https://example.com/avatar.jpg"
  },
  "token": "jwt_token"
}
```

### Get Current User Profile
```http
GET /auth/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "unique_username",
    "avatar_url": "https://example.com/avatar.jpg",
    "points": 150,
    "level": 2,
    "streak_days": 5,
    "preferences": {}
  }
}
```

## Mood Tracking Endpoints

### Add Mood Entry
```http
POST /mood
Authorization: Bearer <token>
```

**Body:**
```json
{
  "mood_type": "happy",
  "mood_intensity": 4,
  "notes": "Had a great day at school!"
}
```

**Response:**
```json
{
  "message": "Mood entry created",
  "mood_entry": {
    "id": "uuid",
    "user_id": "uuid",
    "mood_type": "happy",
    "mood_intensity": 4,
    "notes": "Had a great day at school!",
    "created_at": "2024-01-01T10:00:00Z"
  },
  "points_earned": 2
}
```

### Get Mood History
```http
GET /mood?days=30
Authorization: Bearer <token>
```

**Query Parameters:**
- `days` (optional): Number of days to retrieve (default: 30)

**Response:**
```json
{
  "mood_history": [
    {
      "id": "uuid",
      "mood_type": "happy",
      "mood_intensity": 4,
      "notes": "Had a great day at school!",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

## Task Management Endpoints

### Create Task
```http
POST /tasks
Authorization: Bearer <token>
```

**Body:**
```json
{
  "title": "Complete math homework",
  "description": "Chapter 5 exercises 1-20",
  "priority": "high",
  "due_date": "2024-01-02T18:00:00Z"
}
```

**Response:**
```json
{
  "task": {
    "id": "uuid",
    "title": "Complete math homework",
    "description": "Chapter 5 exercises 1-20",
    "priority": "high",
    "status": "must-do",
    "due_date": "2024-01-02T18:00:00Z",
    "created_at": "2024-01-01T10:00:00Z"
  }
}
```

### Get User Tasks
```http
GET /tasks?status=must-do
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): Filter by status (`must-do`, `can-wait`, `done`)

**Response:**
```json
{
  "tasks": [
    {
      "id": "uuid",
      "title": "Complete math homework",
      "description": "Chapter 5 exercises 1-20",
      "priority": "high",
      "status": "must-do",
      "due_date": "2024-01-02T18:00:00Z",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

### Update Task
```http
PUT /tasks/:id
Authorization: Bearer <token>
```

**Body:**
```json
{
  "status": "done",
  "notes": "Completed all exercises"
}
```

**Response:**
```json
{
  "task": {
    "id": "uuid",
    "title": "Complete math homework",
    "status": "done",
    "completed_at": "2024-01-01T15:00:00Z",
    "updated_at": "2024-01-01T15:00:00Z"
  }
}
```

## Game Endpoints

### Get Available Games
```http
GET /games
```

**Response:**
```json
{
  "games": [
    {
      "id": "uuid",
      "name": "Tic Tac Toe",
      "description": "Classic strategy game",
      "category": "strategy",
      "difficulty_level": 1,
      "points_per_completion": 10
    }
  ]
}
```

### Submit Game Score
```http
POST /games/:gameId/scores
Authorization: Bearer <token>
```

**Body:**
```json
{
  "score": 850,
  "completion_time": "00:02:30",
  "accuracy_percentage": 95.5,
  "level_reached": 3
}
```

**Response:**
```json
{
  "game_score": {
    "id": "uuid",
    "user_id": "uuid",
    "game_id": "uuid",
    "score": 850,
    "completion_time": "00:02:30",
    "accuracy_percentage": 95.5,
    "level_reached": 3,
    "points_earned": 10,
    "created_at": "2024-01-01T10:00:00Z"
  },
  "points_earned": 10
}
```

### Get User Game Scores
```http
GET /games/scores
Authorization: Bearer <token>
```

**Response:**
```json
{
  "scores": [
    {
      "id": "uuid",
      "score": 850,
      "game_name": "Tic Tac Toe",
      "category": "strategy",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

## Document/Library Endpoints

### Get Document Categories
```http
GET /documents/categories
Authorization: Bearer <token>
```

**Response:**
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Homework",
      "description": "School assignments and homework",
      "color": "#FF6B6B"
    }
  ]
}
```

### Upload Document
```http
POST /documents
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `title`: Document title (required)
- `category_id`: Category UUID (optional)
- `content`: Text content (optional)
- `tags`: Comma-separated tags (optional)
- `file`: File upload (optional)

**Response:**
```json
{
  "document": {
    "id": "uuid",
    "title": "Math Worksheet 1",
    "category_id": "uuid",
    "file_url": "/uploads/worksheet-123.pdf",
    "file_type": "application/pdf",
    "file_size": 1024000,
    "tags": ["math", "homework"],
    "created_at": "2024-01-01T10:00:00Z"
  },
  "points_earned": 3
}
```

### Get User Documents
```http
GET /documents?category_id=uuid
Authorization: Bearer <token>
```

**Query Parameters:**
- `category_id` (optional): Filter by category

**Response:**
```json
{
  "documents": [
    {
      "id": "uuid",
      "title": "Math Worksheet 1",
      "category_name": "Homework",
      "category_color": "#FF6B6B",
      "file_url": "/uploads/worksheet-123.pdf",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

## Chat Endpoints

### Get Chat Rooms
```http
GET /chat/rooms
Authorization: Bearer <token>
```

**Response:**
```json
{
  "rooms": [
    {
      "id": "uuid",
      "name": "General Chat",
      "description": "General discussion for everyone",
      "room_type": "public",
      "participant_count": 25,
      "is_member": true
    }
  ]
}
```

### Get Chat Messages
```http
GET /chat/rooms/:roomId/messages?limit=50&offset=0
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional): Number of messages to retrieve (default: 50)
- `offset` (optional): Offset for pagination (default: 0)

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "content": "Hello everyone!",
      "user_id": "uuid",
      "username": "demo_user",
      "avatar_url": "https://example.com/avatar.jpg",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

### Join Chat Room
```http
POST /chat/rooms/:roomId/join
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Joined room successfully"
}
```

## Specialists Endpoints

### Get Specialists
```http
GET /specialists?specialization=psychology
Authorization: Bearer <token>
```

**Query Parameters:**
- `specialization` (optional): Filter by specialization

**Response:**
```json
{
  "specialists": [
    {
      "id": "uuid",
      "first_name": "Emma",
      "last_name": "Johnson",
      "title": "Dr.",
      "specialization": "Child Psychology",
      "bio": "Specialist in ADHD support...",
      "experience_years": 15,
      "hourly_rate": 120.00,
      "avg_rating": 4.8,
      "total_appointments": 150,
      "is_available": true
    }
  ]
}
```

### Book Appointment
```http
POST /appointments
Authorization: Bearer <token>
```

**Body:**
```json
{
  "specialist_id": "uuid",
  "appointment_date": "2024-01-05T14:00:00Z",
  "duration_minutes": 60,
  "session_type": "video",
  "notes": "Need help with focus strategies"
}
```

**Response:**
```json
{
  "appointment": {
    "id": "uuid",
    "specialist_id": "uuid",
    "appointment_date": "2024-01-05T14:00:00Z",
    "duration_minutes": 60,
    "session_type": "video",
    "status": "scheduled",
    "price": 120.00,
    "created_at": "2024-01-01T10:00:00Z"
  }
}
```

### Get User Appointments
```http
GET /appointments
Authorization: Bearer <token>
```

**Response:**
```json
{
  "appointments": [
    {
      "id": "uuid",
      "appointment_date": "2024-01-05T14:00:00Z",
      "first_name": "Emma",
      "last_name": "Johnson",
      "title": "Dr.",
      "specialization": "Child Psychology",
      "status": "scheduled",
      "session_type": "video"
    }
  ]
}
```

## Focus Session Endpoints

### Start Focus Session
```http
POST /focus-sessions
Authorization: Bearer <token>
```

**Body:**
```json
{
  "session_type": "focus_timer",
  "duration_minutes": 25
}
```

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "session_type": "focus_timer",
    "duration_minutes": 25,
    "completed": false,
    "created_at": "2024-01-01T10:00:00Z"
  }
}
```

### Complete Focus Session
```http
PUT /focus-sessions/:id/complete
Authorization: Bearer <token>
```

**Body:**
```json
{
  "interruptions": 2,
  "notes": "Good focus session with minimal distractions"
}
```

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "completed": true,
    "interruptions": 2,
    "notes": "Good focus session with minimal distractions",
    "points_earned": 15
  },
  "points_earned": 15
}
```

## Progress & Analytics Endpoints

### Get User Progress
```http
GET /progress?days=30
Authorization: Bearer <token>
```

**Query Parameters:**
- `days` (optional): Number of days to analyze (default: 30)

**Response:**
```json
{
  "progress_summary": [
    {
      "activity_type": "task",
      "activity_count": 15,
      "total_points": 150,
      "avg_duration": null
    },
    {
      "activity_type": "game",
      "activity_count": 8,
      "total_points": 80,
      "avg_duration": 5.5
    }
  ],
  "daily_activity": [
    {
      "date": "2024-01-01",
      "activities": 5,
      "points": 25
    }
  ],
  "achievements": [
    {
      "id": "uuid",
      "name": "First Steps",
      "description": "Complete your first task",
      "icon": "🎯",
      "badge_color": "#4CAF50",
      "earned_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

## WebSocket Events

### Connection
Connect to WebSocket at `ws://localhost:3001` with authentication:

```javascript
const ws = new WebSocket('ws://localhost:3001');

// Authenticate after connection
ws.send(JSON.stringify({
  type: 'auth',
  token: 'jwt_token'
}));
```

### Send Chat Message
```javascript
ws.send(JSON.stringify({
  type: 'chat_message',
  room_id: 'uuid',
  content: 'Hello everyone!'
}));
```

### Receive New Message
```javascript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'new_message') {
    console.log('New message:', data.message);
  }
};
```

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Bad Request | Invalid request format or missing required fields |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists or scheduling conflict |
| 422 | Validation Error | Request data failed validation |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

## Rate Limits

- Authentication endpoints: 5 requests per minute per IP
- General API endpoints: 100 requests per 15 minutes per user
- File upload endpoints: 10 requests per hour per user
- WebSocket connections: 5 connections per user

## File Upload Limits

- Maximum file size: 10MB
- Allowed file types: JPG, PNG, GIF, PDF, DOC, DOCX, TXT
- Maximum files per request: 1
- Storage location: `/uploads/` directory or cloud storage