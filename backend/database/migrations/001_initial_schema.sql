-- Migration: 001_initial_schema.sql
-- Description: Create initial database schema for MindSpark application
-- Created: 2024-01-01

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    avatar_url TEXT,
    date_of_birth DATE,
    parent_email TEXT,
    points INTEGER DEFAULT 0 CHECK (points >= 0),
    level INTEGER DEFAULT 1 CHECK (level >= 1),
    streak_days INTEGER DEFAULT 0 CHECK (streak_days >= 0),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mood tracking table
CREATE TABLE IF NOT EXISTS mood_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    mood_type TEXT NOT NULL CHECK (mood_type IN ('happy', 'excited', 'calm', 'worried', 'angry')),
    mood_intensity INTEGER CHECK (mood_intensity BETWEEN 1 AND 5),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Games and scores
CREATE TABLE IF NOT EXISTS games (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT NOT NULL,
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    points_per_completion INTEGER DEFAULT 10 CHECK (points_per_completion >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_scores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 0),
    completion_time INTERVAL,
    accuracy_percentage DECIMAL(5,2) CHECK (accuracy_percentage BETWEEN 0 AND 100),
    level_reached INTEGER CHECK (level_reached >= 1),
    points_earned INTEGER DEFAULT 0 CHECK (points_earned >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks management
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    status TEXT CHECK (status IN ('must-do', 'can-wait', 'done')) DEFAULT 'must-do',
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    points_earned INTEGER DEFAULT 0 CHECK (points_earned >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Progress tracking
CREATE TABLE IF NOT EXISTS progress_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('game', 'task', 'mood', 'focus_session', 'breathing', 'document', 'appointment', 'chat')),
    activity_id UUID,
    progress_data JSONB DEFAULT '{}',
    points_earned INTEGER DEFAULT 0 CHECK (points_earned >= 0),
    duration_minutes INTEGER CHECK (duration_minutes >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document categories
CREATE TABLE IF NOT EXISTS document_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#8657ED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents and notes
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES document_categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT,
    file_url TEXT,
    file_type TEXT,
    file_size INTEGER CHECK (file_size >= 0),
    tags TEXT[],
    is_shared BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat system
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    room_type TEXT CHECK (room_type IN ('public', 'private', 'group')) DEFAULT 'public',
    is_active BOOLEAN DEFAULT TRUE,
    max_participants INTEGER DEFAULT 50 CHECK (max_participants > 0),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT CHECK (message_type IN ('text', 'image', 'file')) DEFAULT 'text',
    reply_to UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    role TEXT CHECK (role IN ('member', 'moderator', 'admin')) DEFAULT 'member',
    UNIQUE(room_id, user_id)
);

-- Specialists/Mentors
CREATE TABLE IF NOT EXISTS specialists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    title TEXT NOT NULL,
    specialization TEXT NOT NULL,
    bio TEXT,
    credentials TEXT[],
    experience_years INTEGER CHECK (experience_years >= 0),
    rating DECIMAL(3,2) DEFAULT 0.0 CHECK (rating BETWEEN 0 AND 5),
    hourly_rate DECIMAL(10,2) CHECK (hourly_rate >= 0),
    is_available BOOLEAN DEFAULT TRUE,
    availability_schedule JSONB DEFAULT '{}',
    contact_email TEXT,
    contact_phone TEXT,
    profile_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    specialist_id UUID REFERENCES specialists(id) ON DELETE CASCADE NOT NULL,
    appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60 CHECK (duration_minutes > 0),
    status TEXT CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'no-show')) DEFAULT 'scheduled',
    notes TEXT,
    session_type TEXT CHECK (session_type IN ('video', 'phone', 'in-person')) DEFAULT 'video',
    meeting_link TEXT,
    price DECIMAL(10,2) CHECK (price >= 0),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Focus and breathing sessions
CREATE TABLE IF NOT EXISTS focus_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    session_type TEXT CHECK (session_type IN ('focus_timer', 'breathing', 'meditation')) NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    actual_duration_minutes INTEGER CHECK (actual_duration_minutes >= 0),
    completed BOOLEAN DEFAULT FALSE,
    interruptions INTEGER DEFAULT 0 CHECK (interruptions >= 0),
    notes TEXT,
    points_earned INTEGER DEFAULT 0 CHECK (points_earned >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Achievements and badges
CREATE TABLE IF NOT EXISTS achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    badge_color TEXT DEFAULT '#8657ED',
    points_required INTEGER DEFAULT 0 CHECK (points_required >= 0),
    criteria JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Email logs for tracking
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT CHECK (status IN ('sent', 'failed', 'pending')) NOT NULL,
    message_id TEXT,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User roles (for future admin features)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('user', 'admin', 'moderator', 'specialist')) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    UNIQUE(user_id, role)
);

-- Comments on tables for documentation
COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth';
COMMENT ON TABLE mood_entries IS 'Daily mood tracking entries';
COMMENT ON TABLE games IS 'Available games for users to play';
COMMENT ON TABLE game_scores IS 'Game scores and statistics';
COMMENT ON TABLE tasks IS 'User task management';
COMMENT ON TABLE progress_records IS 'General progress tracking across all activities';
COMMENT ON TABLE document_categories IS 'Categories for organizing documents';
COMMENT ON TABLE documents IS 'User documents and notes';
COMMENT ON TABLE chat_rooms IS 'Chat rooms for community interaction';
COMMENT ON TABLE chat_messages IS 'Individual chat messages';
COMMENT ON TABLE chat_participants IS 'Chat room membership';
COMMENT ON TABLE specialists IS 'Mental health specialists and mentors';
COMMENT ON TABLE appointments IS 'Appointments with specialists';
COMMENT ON TABLE focus_sessions IS 'Focus timer and meditation sessions';
COMMENT ON TABLE achievements IS 'Available achievements/badges';
COMMENT ON TABLE user_achievements IS 'User-earned achievements';
COMMENT ON TABLE email_logs IS 'Email delivery tracking';
COMMENT ON TABLE user_roles IS 'User role assignments';