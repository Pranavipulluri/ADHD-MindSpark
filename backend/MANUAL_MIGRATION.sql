-- Run this SQL in Render's SQL console or any PostgreSQL client
-- This adds the profile fields needed for mentor/NGO profiles

-- Check if columns already exist before adding
DO $$ 
BEGIN
    -- Add bio column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'bio'
    ) THEN
        ALTER TABLE profiles ADD COLUMN bio TEXT;
        RAISE NOTICE 'Added bio column';
    ELSE
        RAISE NOTICE 'bio column already exists';
    END IF;

    -- Add specialization column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'specialization'
    ) THEN
        ALTER TABLE profiles ADD COLUMN specialization VARCHAR(255);
        RAISE NOTICE 'Added specialization column';
    ELSE
        RAISE NOTICE 'specialization column already exists';
    END IF;

    -- Add experience_years column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'experience_years'
    ) THEN
        ALTER TABLE profiles ADD COLUMN experience_years INTEGER;
        RAISE NOTICE 'Added experience_years column';
    ELSE
        RAISE NOTICE 'experience_years column already exists';
    END IF;

    -- Add certifications column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'certifications'
    ) THEN
        ALTER TABLE profiles ADD COLUMN certifications TEXT;
        RAISE NOTICE 'Added certifications column';
    ELSE
        RAISE NOTICE 'certifications column already exists';
    END IF;
END $$;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('bio', 'specialization', 'experience_years', 'certifications')
ORDER BY column_name;
