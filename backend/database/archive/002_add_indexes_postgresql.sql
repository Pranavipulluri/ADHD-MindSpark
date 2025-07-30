-- Migration: 002_add_indexes.sql
-- Description: Add database indexes for better performance
-- Created: 2024-01-02

-- Indexes for profiles table
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_last_activity ON profiles(last_activity);

-- Indexes for mood_entries table
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id ON mood_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_entries_created_at ON mood_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_date ON mood_entries(user_id, created_at);

-- Indexes for tasks table
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);

-- Indexes for game_scores table
CREATE INDEX IF NOT EXISTS idx_game_scores_user_id ON game_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_game_scores_game_id ON game_scores(game_id);
CREATE INDEX IF NOT EXISTS idx_game_scores_score ON game_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_created_at ON game_scores(created_at);

-- Indexes for documents table
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_category_id ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

-- Indexes for chat_messages table
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_date ON chat_messages(room_id, created_at);

-- Indexes for chat_participants table
CREATE INDEX IF NOT EXISTS idx_chat_participants_room_id ON chat_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);

-- Indexes for appointments table
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_specialist_id ON appointments(specialist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Indexes for focus_sessions table
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_created_at ON focus_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_completed ON focus_sessions(completed);

-- Indexes for progress_records table
CREATE INDEX IF NOT EXISTS idx_progress_records_user_id ON progress_records(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_records_activity_type ON progress_records(activity_type);
CREATE INDEX IF NOT EXISTS idx_progress_records_created_at ON progress_records(created_at);

-- Indexes for user_achievements table
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);

-- Indexes for specialists table
CREATE INDEX IF NOT EXISTS idx_specialists_is_available ON specialists(is_available);
CREATE INDEX IF NOT EXISTS idx_specialists_specialization ON specialists(specialization);
CREATE INDEX IF NOT EXISTS idx_specialists_rating ON specialists(rating DESC);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_documents_title_search ON documents USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_documents_content_search ON documents USING gin(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_specialists_search ON specialists USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || specialization));