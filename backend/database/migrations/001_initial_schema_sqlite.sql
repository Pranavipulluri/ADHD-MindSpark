-- Migration: 001_initial_schema.sql (SQLite version)
-- Description: Create initial database schema for MindSpark application
-- Created: 2024-01-01

-- Users/Profiles table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    date_of_birth DATE,
    parent_email TEXT,
    points INTEGER DEFAULT 0 CHECK (points >= 0),
    level INTEGER DEFAULT 1 CHECK (level >= 1),
    streak_days INTEGER DEFAULT 0 CHECK (streak_days >= 0),
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    preferences TEXT DEFAULT '{}', -- JSON as TEXT in SQLite
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Mood tracking table
CREATE TABLE IF NOT EXISTS mood_entries (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    mood_type TEXT NOT NULL CHECK (mood_type IN ('happy', 'excited', 'calm', 'worried', 'angry', 'sad', 'frustrated')),
    mood_intensity INTEGER CHECK (mood_intensity BETWEEN 1 AND 5),
    notes TEXT,
    triggers TEXT, -- JSON array as TEXT
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Games and scores
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT NOT NULL,
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    points_per_completion INTEGER DEFAULT 10 CHECK (points_per_completion >= 0),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_scores (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    game_id TEXT REFERENCES games(id) ON DELETE CASCADE NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    completion_time INTEGER, -- seconds
    accuracy_percentage REAL CHECK (accuracy_percentage BETWEEN 0 AND 100),
    level_reached INTEGER,
    points_earned INTEGER DEFAULT 0,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('daily', 'academic', 'chores', 'health', 'social', 'creative')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    due_date DATETIME,
    estimated_duration INTEGER, -- minutes
    points_reward INTEGER DEFAULT 10 CHECK (points_reward >= 0),
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Focus sessions table
CREATE TABLE IF NOT EXISTS focus_sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('breathing', 'meditation', 'concentration', 'mindfulness')),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    background TEXT DEFAULT 'nature' CHECK (background IN ('nature', 'ocean', 'rain', 'silence', 'music')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
    points_earned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'emoji')),
    room_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    filename TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('report', 'assignment', 'medical', 'other')),
    tags TEXT, -- JSON array as TEXT
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Specialists table
CREATE TABLE IF NOT EXISTS specialists (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    specialization TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    bio TEXT,
    availability TEXT DEFAULT '{}', -- JSON as TEXT
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    specialist_id TEXT REFERENCES specialists(id) ON DELETE CASCADE NOT NULL,
    specialist_name TEXT NOT NULL,
    scheduled_at DATETIME NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('consultation', 'therapy', 'assessment', 'follow_up')),
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'achievement', 'reminder')),
    read BOOLEAN DEFAULT 0,
    action_type TEXT,
    action_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create update trigger for users table
CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Create update trigger for tasks table
CREATE TRIGGER IF NOT EXISTS update_tasks_updated_at 
    AFTER UPDATE ON tasks
    FOR EACH ROW
    BEGIN
        UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
