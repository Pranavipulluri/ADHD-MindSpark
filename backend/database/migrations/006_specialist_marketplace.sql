-- Specialist Marketplace Tables
-- For booking appointments, student registration, and ratings

-- Add role column to profiles if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'mentor', 'ngo'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialization VARCHAR(100);

-- Specialist Appointments Table
CREATE TABLE IF NOT EXISTS specialist_appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    specialist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Specialist Student Assignments Table
CREATE TABLE IF NOT EXISTS specialist_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    specialist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, specialist_id)
);

-- Specialist Ratings Table
CREATE TABLE IF NOT EXISTS specialist_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    specialist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, specialist_id)
);

-- Workshops Table (for tracking workshops conducted by specialists)
CREATE TABLE IF NOT EXISTS workshops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_date TIMESTAMP NOT NULL,
    location VARCHAR(255),
    max_participants INTEGER DEFAULT 30,
    status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workshop Participants Table (for tracking student registrations)
CREATE TABLE IF NOT EXISTS workshop_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workshop_id, student_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_student ON specialist_appointments(student_id);
CREATE INDEX IF NOT EXISTS idx_appointments_specialist ON specialist_appointments(specialist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON specialist_appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_assignments_student ON specialist_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_specialist ON specialist_assignments(specialist_id);
CREATE INDEX IF NOT EXISTS idx_ratings_specialist ON specialist_ratings(specialist_id);
CREATE INDEX IF NOT EXISTS idx_workshops_organizer ON workshops(organizer_id);
CREATE INDEX IF NOT EXISTS idx_workshops_scheduled_date ON workshops(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_workshop_participants_workshop ON workshop_participants(workshop_id);
CREATE INDEX IF NOT EXISTS idx_workshop_participants_student ON workshop_participants(student_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_specialist_appointments_updated_at BEFORE UPDATE
    ON specialist_appointments FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
