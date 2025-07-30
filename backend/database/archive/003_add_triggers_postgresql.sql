-- Migration: 003_add_triggers.sql
-- Description: Add database triggers for automated updates
-- Created: 2024-01-03

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update user level based on points
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate level based on points
    NEW.level = CASE
        WHEN NEW.points >= 50000 THEN 10
        WHEN NEW.points >= 20000 THEN 9
        WHEN NEW.points >= 10000 THEN 8
        WHEN NEW.points >= 5000 THEN 7
        WHEN NEW.points >= 2000 THEN 6
        WHEN NEW.points >= 1000 THEN 5
        WHEN NEW.points >= 500 THEN 4
        WHEN NEW.points >= 250 THEN 3
        WHEN NEW.points >= 100 THEN 2
        ELSE 1
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update streak days
CREATE OR REPLACE FUNCTION update_streak_days()
RETURNS TRIGGER AS $$
DECLARE
    last_activity_date DATE;
    today_date DATE := CURRENT_DATE;
BEGIN
    -- Get the date of last activity (excluding today)
    SELECT DATE(last_activity) INTO last_activity_date
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- Update streak based on activity pattern
    UPDATE profiles SET
        streak_days = CASE
            WHEN last_activity_date = today_date - INTERVAL '1 day' THEN streak_days + 1
            WHEN last_activity_date = today_date THEN streak_days -- Same day, no change
            ELSE 1 -- Reset streak
        END,
        last_activity = CURRENT_TIMESTAMP
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_specialists_updated_at 
    BEFORE UPDATE ON specialists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at 
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user level updates
CREATE TRIGGER update_profiles_level 
    BEFORE UPDATE ON profiles
    FOR EACH ROW 
    WHEN (OLD.points IS DISTINCT FROM NEW.points)
    EXECUTE FUNCTION update_user_level();

-- Triggers for streak updates
CREATE TRIGGER update_streak_on_mood_entry
    AFTER INSERT ON mood_entries
    FOR EACH ROW EXECUTE FUNCTION update_streak_days();

CREATE TRIGGER update_streak_on_task_completion
    AFTER UPDATE ON tasks
    FOR EACH ROW 
    WHEN (OLD.status != 'done' AND NEW.status = 'done')
    EXECUTE FUNCTION update_streak_days();

CREATE TRIGGER update_streak_on_focus_session
    AFTER INSERT ON focus_sessions
    FOR EACH ROW EXECUTE FUNCTION update_streak_days();

-- Function to auto-assign achievements
CREATE OR REPLACE FUNCTION check_achievements()
RETURNS TRIGGER AS $$
DECLARE
    user_points INTEGER;
    task_count INTEGER;
    mood_streak INTEGER;
BEGIN
    -- Get user's current points
    SELECT points INTO user_points FROM profiles WHERE id = NEW.user_id;
    
    -- Check point-based achievements
    IF user_points >= 100 AND NOT EXISTS (
        SELECT 1 FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.user_id = NEW.user_id AND a.name = 'Point Collector'
    ) THEN
        INSERT INTO user_achievements (user_id, achievement_id)
        SELECT NEW.user_id, id FROM achievements WHERE name = 'Point Collector';
    END IF;
    
    -- Check task completion achievements
    IF TG_TABLE_NAME = 'tasks' AND NEW.status = 'done' THEN
        SELECT COUNT(*) INTO task_count 
        FROM tasks WHERE user_id = NEW.user_id AND status = 'done';
        
        IF task_count >= 1 AND NOT EXISTS (
            SELECT 1 FROM user_achievements ua
            JOIN achievements a ON ua.achievement_id = a.id
            WHERE ua.user_id = NEW.user_id AND a.name = 'First Steps'
        ) THEN
            INSERT INTO user_achievements (user_id, achievement_id)
            SELECT NEW.user_id, id FROM achievements WHERE name = 'First Steps';
        END IF;
        
        IF task_count >= 10 AND NOT EXISTS (
            SELECT 1 FROM user_achievements ua
            JOIN achievements a ON ua.achievement_id = a.id
            WHERE ua.user_id = NEW.user_id AND a.name = 'Task Master'
        ) THEN
            INSERT INTO user_achievements (user_id, achievement_id)
            SELECT NEW.user_id, id FROM achievements WHERE name = 'Task Master';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for achievement checking
CREATE TRIGGER check_achievements_on_task_update
    AFTER UPDATE ON tasks
    FOR EACH ROW
    WHEN (OLD.status != NEW.status)
    EXECUTE FUNCTION check_achievements();

CREATE TRIGGER check_achievements_on_progress
    AFTER INSERT ON progress_records
    FOR EACH ROW EXECUTE FUNCTION check_achievements();