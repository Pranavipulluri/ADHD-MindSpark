/*
  # Initial Schema Setup

  1. Tables
    - profiles
      - id (uuid, primary key)
      - username (text)
      - avatar_url (text)
      - email (text)
      - website (text)
      - points (integer)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - chat_messages
      - id (uuid, primary key)
      - content (text)
      - user_id (uuid, foreign key)
      - room_id (text)
      - created_at (timestamp)
    
    - chat_rooms
      - id (text, primary key)
      - name (text)
      - description (text)
      - created_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  avatar_url text,
  email text,
  website text,
  points integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  room_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create chat rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Chat messages policies
CREATE POLICY "Chat messages are viewable by everyone"
  ON chat_messages FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own messages"
  ON chat_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Chat rooms policies
CREATE POLICY "Chat rooms are viewable by everyone"
  ON chat_rooms FOR SELECT
  USING (true);

-- Insert default chat rooms
INSERT INTO chat_rooms (id, name, description) VALUES
  ('community', 'Community Chat', 'General discussion for everyone'),
  ('study-buddies', 'Study Buddies', 'Find study partners and share tips'),
  ('creative-corner', 'Creative Corner', 'Share your creative projects'),
  ('parent-support', 'Parent Support', 'Support group for parents');