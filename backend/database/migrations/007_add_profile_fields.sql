-- Add profile fields for mentors and NGOs
-- Migration 007: Add bio, specialization, certifications, experience_years

-- Add columns to profiles table if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS specialization VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS certifications TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience_years INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_name VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_type VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;

-- Create index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Update existing mentor/NGO users with default values if needed
UPDATE profiles SET bio = 'Professional mentor dedicated to helping students with ADHD succeed.' 
WHERE role = 'mentor' AND (bio IS NULL OR bio = '');

UPDATE profiles SET bio = 'Non-profit organization committed to supporting students with ADHD through workshops and programs.' 
WHERE role = 'ngo' AND (bio IS NULL OR bio = '');
