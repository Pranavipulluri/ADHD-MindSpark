-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    date_of_birth DATE,
    parent_email TEXT,
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    streak_days INTEGER DEFAULT 0,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mood tracking table
CREATE TABLE mood_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    mood_type TEXT NOT NULL CHECK (mood_type IN ('happy', 'excited', 'calm', 'worried', 'angry')),
    mood_intensity INTEGER CHECK (mood_intensity BETWEEN 1 AND 5),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Games and scores
CREATE TABLE games (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    difficulty_level INTEGER DEFAULT 1,
    points_per_completion INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE game_scores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
    score INTEGER NOT NULL,
    completion_time INTERVAL,
    accuracy_percentage DECIMAL(5,2),
    level_reached INTEGER,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks management
CREATE TABLE tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    status TEXT CHECK (status IN ('must-do', 'can-wait', 'done')) DEFAULT 'must-do',
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Progress tracking
CREATE TABLE progress_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('game', 'task', 'mood', 'focus_session', 'breathing')),
    activity_id UUID, -- References the specific activity
    progress_data JSONB DEFAULT '{}', -- Flexible data storage
    points_earned INTEGER DEFAULT 0,
    duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents and notes
CREATE TABLE document_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#8657ED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES document_categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT,
    file_url TEXT,
    file_type TEXT,
    file_size INTEGER,
    tags TEXT[],
    is_shared BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat system
CREATE TABLE chat_rooms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    room_type TEXT CHECK (room_type IN ('public', 'private', 'group')) DEFAULT 'public',
    is_active BOOLEAN DEFAULT TRUE,
    max_participants INTEGER DEFAULT 50,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE chat_messages (
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

CREATE TABLE chat_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    role TEXT CHECK (role IN ('member', 'moderator', 'admin')) DEFAULT 'member',
    UNIQUE(room_id, user_id)
);

-- Specialists/Mentors
CREATE TABLE specialists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    title TEXT NOT NULL,
    specialization TEXT NOT NULL,
    bio TEXT,
    credentials TEXT[],
    experience_years INTEGER,
    rating DECIMAL(3,2) DEFAULT 0.0,
    hourly_rate DECIMAL(10,2),
    is_available BOOLEAN DEFAULT TRUE,
    availability_schedule JSONB DEFAULT '{}',
    contact_email TEXT,
    contact_phone TEXT,
    profile_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    specialist_id UUID REFERENCES specialists(id) ON DELETE CASCADE NOT NULL,
    appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status TEXT CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'no-show')) DEFAULT 'scheduled',
    notes TEXT,
    session_type TEXT CHECK (session_type IN ('video', 'phone', 'in-person')) DEFAULT 'video',
    meeting_link TEXT,
    price DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Focus and breathing sessions
CREATE TABLE focus_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    session_type TEXT CHECK (session_type IN ('focus_timer', 'breathing', 'meditation')) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    interruptions INTEGER DEFAULT 0,
    notes TEXT,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Achievements and badges
CREATE TABLE achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    badge_color TEXT DEFAULT '#8657ED',
    points_required INTEGER DEFAULT 0,
    criteria JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Insert default data
INSERT INTO document_categories (name, description, color) VALUES
    ('Homework', 'School assignments and homework', '#FF6B6B'),
    ('Notes', 'Personal notes and study materials', '#4ECDC4'),
    ('Reading', 'Reading materials and books', '#45B7D1'),
    ('Resources', 'Educational resources and references', '#96CEB4');

INSERT INTO chat_rooms (name, description, room_type) VALUES
    ('General Chat', 'General discussion for everyone', 'public'),
    ('Study Group', 'Study together and share tips', 'public'),
    ('Parents Corner', 'Support group for parents', 'public');

INSERT INTO games (name, description, category, difficulty_level, points_per_completion) VALUES
    ('Tic Tac Toe', 'Classic strategy game', 'strategy', 1, 10),
    ('Memory Match', 'Test your memory skills', 'memory', 2, 15),
    ('Focus Finder', 'Find hidden objects', 'attention', 3, 20);

INSERT INTO achievements (name, description, points_required) VALUES
    ('First Steps', 'Complete your first task', 10),
    ('Game Master', 'Play 10 games', 100),
    ('Mood Tracker', 'Track your mood for 7 days', 50),
    ('Focus Champion', 'Complete 5 focus sessions', 75);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Create policies for Row Level Security
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own mood entries" ON mood_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own game scores" ON game_scores FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own progress" ON progress_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own documents" ON documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own appointments" ON appointments FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own focus sessions" ON focus_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own achievements" ON user_achievements FOR ALL USING (auth.uid() = user_id);

-- Chat policies (more open for community features)
CREATE POLICY "Anyone can read public chat messages" ON chat_messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM chat_rooms 
        WHERE chat_rooms.id = chat_messages.room_id 
        AND chat_rooms.room_type = 'public'
    )
);
CREATE POLICY "Users can send messages to public rooms" ON chat_messages FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM chat_rooms 
        WHERE chat_rooms.id = room_id 
        AND chat_rooms.room_type = 'public'
    )
);

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_specialists_updated_at BEFORE UPDATE ON specialists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();