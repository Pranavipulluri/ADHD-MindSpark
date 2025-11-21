-- Migration: 004_add_roles_and_mentors.sql
-- Description: Add role-based access control, mentors, NGOs, and workshops
-- Created: 2025-11-05

-- Add role column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'mentor', 'ngo', 'admin'));

-- Mentors table (extended from specialists)
CREATE TABLE IF NOT EXISTS mentors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    title VARCHAR(100),
    specialization VARCHAR(100) NOT NULL,
    bio TEXT,
    expertise TEXT[],
    hourly_rate DECIMAL(10,2),
    is_available BOOLEAN DEFAULT TRUE,
    total_sessions INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NGO organizations table
CREATE TABLE IF NOT EXISTS ngos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    organization_name VARCHAR(255) NOT NULL,
    description TEXT,
    mission TEXT,
    website_url VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    address TEXT,
    logo_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student-Mentor assignments
CREATE TABLE IF NOT EXISTS student_mentors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    mentor_id UUID REFERENCES mentors(id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
    UNIQUE(student_id, mentor_id)
);

-- Workshops table
CREATE TABLE IF NOT EXISTS workshops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    organizer_type VARCHAR(10) NOT NULL CHECK (organizer_type IN ('mentor', 'ngo')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    max_participants INTEGER DEFAULT 50,
    current_participants INTEGER DEFAULT 0,
    location VARCHAR(255),
    session_type VARCHAR(20) DEFAULT 'online' CHECK (session_type IN ('online', 'in_person', 'hybrid')),
    meeting_link TEXT,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workshop participants
CREATE TABLE IF NOT EXISTS workshop_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attendance_status VARCHAR(20) DEFAULT 'registered' CHECK (attendance_status IN ('registered', 'attended', 'absent', 'cancelled')),
    feedback TEXT,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    UNIQUE(workshop_id, user_id)
);

-- Update appointments to support mentor scheduling
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS mentor_id UUID REFERENCES mentors(id) ON DELETE CASCADE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS request_status VARCHAR(20) DEFAULT 'pending' CHECK (request_status IN ('pending', 'accepted', 'rejected'));
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Student progress snapshots for mentor view
CREATE TABLE IF NOT EXISTS student_progress_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    snapshot_date DATE NOT NULL,
    tasks_completed INTEGER DEFAULT 0,
    focus_sessions INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    mood_average DECIMAL(3,2),
    games_played INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, snapshot_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_mentors_user_id ON mentors(user_id);
CREATE INDEX IF NOT EXISTS idx_ngos_user_id ON ngos(user_id);
CREATE INDEX IF NOT EXISTS idx_student_mentors_student ON student_mentors(student_id);
CREATE INDEX IF NOT EXISTS idx_student_mentors_mentor ON student_mentors(mentor_id);
CREATE INDEX IF NOT EXISTS idx_workshops_organizer ON workshops(organizer_id);
CREATE INDEX IF NOT EXISTS idx_workshops_start_time ON workshops(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_mentor ON appointments(mentor_id);

-- Update triggers for new tables
CREATE TRIGGER update_mentors_updated_at 
    BEFORE UPDATE ON mentors 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ngos_updated_at 
    BEFORE UPDATE ON ngos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workshops_updated_at 
    BEFORE UPDATE ON workshops 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
