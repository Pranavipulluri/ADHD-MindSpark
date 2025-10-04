-- Migration: Extension Support Tables
-- Description: Add tables and columns to support browser extension functionality

-- Add extension preferences column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS extension_preferences JSONB DEFAULT '{}';

-- Create AI usage tracking table
CREATE TABLE IF NOT EXISTS ai_usage (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feature_type VARCHAR(50) NOT NULL, -- 'summarization', 'text_simplification', etc.
  input_length INTEGER,
  source VARCHAR(20) DEFAULT 'web', -- 'web', 'extension', 'mobile'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create page summaries table
CREATE TABLE IF NOT EXISTS page_summaries (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  url TEXT,
  original_content TEXT,
  summary TEXT NOT NULL,
  source VARCHAR(20) DEFAULT 'extension',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user achievements table (simplified version)
CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_name VARCHAR(100) NOT NULL,
  achievement_description TEXT,
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, achievement_name)
);

-- Create extension activity log
CREATE TABLE IF NOT EXISTS extension_activities (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  page_url TEXT,
  duration_seconds INTEGER,
  points_earned INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_id ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_page_summaries_user_id ON page_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_page_summaries_url ON page_summaries(url);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_extension_activities_user_id ON extension_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_extension_activities_created_at ON extension_activities(created_at);

-- Insert some default achievements
INSERT INTO achievements (id, name, description, icon, badge_color, points_required) VALUES
  ('ext-001', 'First Steps', 'Used the extension for the first time', '🚀', '#3b82f6', 0),
  ('ext-002', 'Reading Helper', 'Used dyslexia-friendly mode 5 times', '👁️', '#10b981', 0),
  ('ext-003', 'AI Assistant', 'Summarized 10 pages with AI', '🤖', '#8b5cf6', 0),
  ('ext-004', 'Game Master', 'Played brain games 20 times', '🎮', '#f59e0b', 0),
  ('ext-005', 'Focus Champion', 'Completed 5 focus sessions', '🎯', '#ef4444', 0),
  ('ext-006', 'Century Club', 'Earned 100 points', '💯', '#06b6d4', 100),
  ('ext-007', 'Accessibility Advocate', 'Used accessibility features 50 times', '♿', '#84cc16', 0),
  ('ext-008', 'Learning Streak', 'Used the extension 7 days in a row', '🔥', '#f97316', 0)
ON CONFLICT (id) DO NOTHING;

-- Update existing profiles to have default extension preferences
UPDATE profiles 
SET extension_preferences = '{
  "dyslexiaMode": false,
  "fontSize": "medium",
  "colorScheme": "default",
  "autoSummarize": false,
  "ttsSpeed": 0.8,
  "readingReminders": false,
  "highContrast": false
}'::jsonb
WHERE extension_preferences IS NULL OR extension_preferences = '{}'::jsonb;