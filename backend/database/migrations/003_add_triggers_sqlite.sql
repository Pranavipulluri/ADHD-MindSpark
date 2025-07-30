-- Migration: 003_add_triggers.sql (SQLite version)
-- Description: Add additional triggers and constraints
-- Created: 2024-01-01

-- Trigger to update user points when tasks are completed
CREATE TRIGGER IF NOT EXISTS update_user_points_on_task_completion
    AFTER UPDATE OF status ON tasks
    FOR EACH ROW
    WHEN NEW.status = 'completed' AND OLD.status != 'completed'
    BEGIN
        UPDATE users 
        SET points = points + NEW.points_reward,
            last_activity = CURRENT_TIMESTAMP
        WHERE id = NEW.user_id;
    END;

-- Trigger to update user points when games are played
CREATE TRIGGER IF NOT EXISTS update_user_points_on_game_score
    AFTER INSERT ON game_scores
    FOR EACH ROW
    BEGIN
        UPDATE users 
        SET points = points + NEW.points_earned,
            last_activity = CURRENT_TIMESTAMP
        WHERE id = NEW.user_id;
    END;

-- Trigger to update user points when focus sessions are completed
CREATE TRIGGER IF NOT EXISTS update_user_points_on_focus_completion
    AFTER UPDATE OF status ON focus_sessions
    FOR EACH ROW
    WHEN NEW.status = 'completed' AND OLD.status != 'completed'
    BEGIN
        UPDATE users 
        SET points = points + COALESCE(NEW.points_earned, 0),
            last_activity = CURRENT_TIMESTAMP
        WHERE id = NEW.user_id;
    END;

-- Trigger to automatically calculate user level based on points
CREATE TRIGGER IF NOT EXISTS update_user_level_on_points_change
    AFTER UPDATE OF points ON users
    FOR EACH ROW
    WHEN NEW.points != OLD.points
    BEGIN
        UPDATE users 
        SET level = CASE 
            WHEN NEW.points >= 10000 THEN 10
            WHEN NEW.points >= 8000 THEN 9
            WHEN NEW.points >= 6500 THEN 8
            WHEN NEW.points >= 5000 THEN 7
            WHEN NEW.points >= 3500 THEN 6
            WHEN NEW.points >= 2500 THEN 5
            WHEN NEW.points >= 1500 THEN 4
            WHEN NEW.points >= 800 THEN 3
            WHEN NEW.points >= 300 THEN 2
            ELSE 1
        END
        WHERE id = NEW.id;
    END;

-- Trigger to set completed_at when tasks are marked as completed
CREATE TRIGGER IF NOT EXISTS set_task_completed_at
    AFTER UPDATE OF status ON tasks
    FOR EACH ROW
    WHEN NEW.status = 'completed' AND OLD.status != 'completed'
    BEGIN
        UPDATE tasks 
        SET completed_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
    END;

-- Trigger to set completed_at when focus sessions are completed
CREATE TRIGGER IF NOT EXISTS set_focus_session_completed_at
    AFTER UPDATE OF status ON focus_sessions
    FOR EACH ROW
    WHEN NEW.status = 'completed' AND OLD.status != 'completed'
    BEGIN
        UPDATE focus_sessions 
        SET completed_at = CURRENT_TIMESTAMP
        WHERE id = NEW.id;
    END;
