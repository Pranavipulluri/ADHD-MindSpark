-- Migration: 003_add_triggers.sql (PostgreSQL version)
-- Description: Add database triggers for automatic updates
-- Created: 2024-01-01

-- Function to update streak days when user is active
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
BEGIN
    -- Update streak if last activity was yesterday, reset if longer gap
    IF OLD.last_activity::date < CURRENT_DATE - INTERVAL '1 day' THEN
        NEW.streak_days = 1;
    ELSIF OLD.last_activity::date = CURRENT_DATE - INTERVAL '1 day' THEN
        NEW.streak_days = OLD.streak_days + 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user streak on activity
CREATE TRIGGER update_user_streak_trigger
    BEFORE UPDATE OF last_activity ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_streak();

-- Function to update user level based on points
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
BEGIN
    -- Simple level calculation: level = points / 100 + 1
    NEW.level = GREATEST(1, NEW.points / 100 + 1);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user level when points change
CREATE TRIGGER update_user_level_trigger
    BEFORE UPDATE OF points ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_level();
