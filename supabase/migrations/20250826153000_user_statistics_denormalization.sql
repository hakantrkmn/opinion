-- User Statistics Denormalization Migration
-- This migration creates a user_stats table to store precalculated user statistics
-- and implements triggers to keep the statistics up-to-date automatically

-- Create user_stats table
CREATE TABLE user_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_pins INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  total_likes_received INTEGER DEFAULT 0,
  total_dislikes_received INTEGER DEFAULT 0,
  total_votes_given INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_user_stats_total_pins ON user_stats(total_pins DESC);
CREATE INDEX idx_user_stats_total_comments ON user_stats(total_comments DESC);
CREATE INDEX idx_user_stats_last_activity ON user_stats(last_activity_at DESC);

-- Function to update user_stats updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_stats updated_at
CREATE TRIGGER update_user_stats_updated_at_trigger
    BEFORE UPDATE ON user_stats
    FOR EACH ROW EXECUTE FUNCTION update_user_stats_updated_at();

-- Function to initialize user stats when a new user is created
CREATE OR REPLACE FUNCTION initialize_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_stats (user_id, total_pins, total_comments, total_likes_received, total_dislikes_received, total_votes_given, last_activity_at)
    VALUES (NEW.id, 0, 0, 0, 0, 0, NOW())
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to initialize stats when user is created
CREATE TRIGGER initialize_user_stats_trigger
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION initialize_user_stats();

-- Function to update pin statistics
CREATE OR REPLACE FUNCTION update_pin_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment pin count
        INSERT INTO user_stats (user_id, total_pins, last_activity_at)
        VALUES (NEW.user_id, 1, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            total_pins = user_stats.total_pins + 1,
            last_activity_at = NOW();
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement pin count
        UPDATE user_stats 
        SET total_pins = GREATEST(0, total_pins - 1),
            updated_at = NOW()
        WHERE user_id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for pin statistics
CREATE TRIGGER update_pin_stats_insert_trigger
    AFTER INSERT ON pins
    FOR EACH ROW EXECUTE FUNCTION update_pin_stats();

CREATE TRIGGER update_pin_stats_delete_trigger
    AFTER DELETE ON pins
    FOR EACH ROW EXECUTE FUNCTION update_pin_stats();

-- Function to update comment statistics
CREATE OR REPLACE FUNCTION update_comment_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment comment count for the comment author
        INSERT INTO user_stats (user_id, total_comments, last_activity_at)
        VALUES (NEW.user_id, 1, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            total_comments = user_stats.total_comments + 1,
            last_activity_at = NOW();
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement comment count for the comment author
        UPDATE user_stats 
        SET total_comments = GREATEST(0, total_comments - 1),
            updated_at = NOW()
        WHERE user_id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for comment statistics
CREATE TRIGGER update_comment_stats_insert_trigger
    AFTER INSERT ON comments
    FOR EACH ROW EXECUTE FUNCTION update_comment_stats();

CREATE TRIGGER update_comment_stats_delete_trigger
    AFTER DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_comment_stats();

-- Function to update vote statistics
CREATE OR REPLACE FUNCTION update_vote_stats()
RETURNS TRIGGER AS $$
DECLARE
    comment_author_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Get the comment author
        SELECT user_id INTO comment_author_id 
        FROM comments 
        WHERE id = NEW.comment_id;
        
        -- Update vote giver stats
        INSERT INTO user_stats (user_id, total_votes_given, last_activity_at)
        VALUES (NEW.user_id, 1, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            total_votes_given = user_stats.total_votes_given + 1,
            last_activity_at = NOW();
        
        -- Update vote receiver stats
        IF comment_author_id IS NOT NULL THEN
            IF NEW.value = 1 THEN
                -- Like received
                INSERT INTO user_stats (user_id, total_likes_received)
                VALUES (comment_author_id, 1)
                ON CONFLICT (user_id) DO UPDATE SET
                    total_likes_received = user_stats.total_likes_received + 1,
                    updated_at = NOW();
            ELSE
                -- Dislike received
                INSERT INTO user_stats (user_id, total_dislikes_received)
                VALUES (comment_author_id, 1)
                ON CONFLICT (user_id) DO UPDATE SET
                    total_dislikes_received = user_stats.total_dislikes_received + 1,
                    updated_at = NOW();
            END IF;
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Get the comment author
        SELECT user_id INTO comment_author_id 
        FROM comments 
        WHERE id = OLD.comment_id;
        
        -- Update vote giver stats
        UPDATE user_stats 
        SET total_votes_given = GREATEST(0, total_votes_given - 1),
            updated_at = NOW()
        WHERE user_id = OLD.user_id;
        
        -- Update vote receiver stats
        IF comment_author_id IS NOT NULL THEN
            IF OLD.value = 1 THEN
                -- Like removed
                UPDATE user_stats 
                SET total_likes_received = GREATEST(0, total_likes_received - 1),
                    updated_at = NOW()
                WHERE user_id = comment_author_id;
            ELSE
                -- Dislike removed
                UPDATE user_stats 
                SET total_dislikes_received = GREATEST(0, total_dislikes_received - 1),
                    updated_at = NOW()
                WHERE user_id = comment_author_id;
            END IF;
        END IF;
        
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle vote changes (like to dislike or vice versa)
        SELECT user_id INTO comment_author_id 
        FROM comments 
        WHERE id = NEW.comment_id;
        
        IF comment_author_id IS NOT NULL AND OLD.value != NEW.value THEN
            -- Remove old vote
            IF OLD.value = 1 THEN
                UPDATE user_stats 
                SET total_likes_received = GREATEST(0, total_likes_received - 1)
                WHERE user_id = comment_author_id;
            ELSE
                UPDATE user_stats 
                SET total_dislikes_received = GREATEST(0, total_dislikes_received - 1)
                WHERE user_id = comment_author_id;
            END IF;
            
            -- Add new vote
            IF NEW.value = 1 THEN
                UPDATE user_stats 
                SET total_likes_received = total_likes_received + 1
                WHERE user_id = comment_author_id;
            ELSE
                UPDATE user_stats 
                SET total_dislikes_received = total_dislikes_received + 1
                WHERE user_id = comment_author_id;
            END IF;
            
            -- Update timestamp
            UPDATE user_stats 
            SET updated_at = NOW()
            WHERE user_id = comment_author_id;
        END IF;
        
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for vote statistics
CREATE TRIGGER update_vote_stats_insert_trigger
    AFTER INSERT ON comment_votes
    FOR EACH ROW EXECUTE FUNCTION update_vote_stats();

CREATE TRIGGER update_vote_stats_delete_trigger
    AFTER DELETE ON comment_votes
    FOR EACH ROW EXECUTE FUNCTION update_vote_stats();

CREATE TRIGGER update_vote_stats_update_trigger
    AFTER UPDATE ON comment_votes
    FOR EACH ROW EXECUTE FUNCTION update_vote_stats();

-- Function to populate existing user statistics (for migration)
CREATE OR REPLACE FUNCTION populate_user_stats()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    pin_count INTEGER;
    comment_count INTEGER;
    likes_received INTEGER;
    dislikes_received INTEGER;
    votes_given INTEGER;
    last_activity TIMESTAMP;
BEGIN
    -- Loop through all users
    FOR user_record IN SELECT id FROM users LOOP
        -- Count pins
        SELECT COUNT(*) INTO pin_count
        FROM pins
        WHERE user_id = user_record.id;
        
        -- Count comments
        SELECT COUNT(*) INTO comment_count
        FROM comments
        WHERE user_id = user_record.id;
        
        -- Count likes received on user's comments
        SELECT COUNT(*) INTO likes_received
        FROM comment_votes cv
        JOIN comments c ON cv.comment_id = c.id
        WHERE c.user_id = user_record.id AND cv.value = 1;
        
        -- Count dislikes received on user's comments
        SELECT COUNT(*) INTO dislikes_received
        FROM comment_votes cv
        JOIN comments c ON cv.comment_id = c.id
        WHERE c.user_id = user_record.id AND cv.value = -1;
        
        -- Count votes given by user
        SELECT COUNT(*) INTO votes_given
        FROM comment_votes
        WHERE user_id = user_record.id;
        
        -- Get last activity (latest between pin creation, comment creation, or vote)
        SELECT GREATEST(
            COALESCE((SELECT MAX(created_at) FROM pins WHERE user_id = user_record.id), '1970-01-01'::timestamp),
            COALESCE((SELECT MAX(created_at) FROM comments WHERE user_id = user_record.id), '1970-01-01'::timestamp),
            COALESCE((SELECT MAX(created_at) FROM comment_votes WHERE user_id = user_record.id), '1970-01-01'::timestamp)
        ) INTO last_activity;
        
        -- Insert or update user stats
        INSERT INTO user_stats (
            user_id, 
            total_pins, 
            total_comments, 
            total_likes_received, 
            total_dislikes_received, 
            total_votes_given,
            last_activity_at
        )
        VALUES (
            user_record.id, 
            pin_count, 
            comment_count, 
            likes_received, 
            dislikes_received, 
            votes_given,
            last_activity
        )
        ON CONFLICT (user_id) DO UPDATE SET
            total_pins = EXCLUDED.total_pins,
            total_comments = EXCLUDED.total_comments,
            total_likes_received = EXCLUDED.total_likes_received,
            total_dislikes_received = EXCLUDED.total_dislikes_received,
            total_votes_given = EXCLUDED.total_votes_given,
            last_activity_at = EXCLUDED.last_activity_at,
            updated_at = NOW();
    END LOOP;
    
    RAISE NOTICE 'User statistics populated successfully';
END;
$$ LANGUAGE plpgsql;

-- Execute the population function
SELECT populate_user_stats();

-- Add RLS policies for user_stats table
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Users can view their own stats
CREATE POLICY "Users can view own stats" ON user_stats
    FOR SELECT USING (auth.uid() = user_id);

-- Admin can view all stats
CREATE POLICY "Admin can view all stats" ON user_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.email = current_setting('app.admin_email', true)
        )
    );

-- Users can update their own stats (through triggers only)
CREATE POLICY "System can update stats" ON user_stats
    FOR ALL USING (true);

-- Add comments to document the optimization
COMMENT ON TABLE user_stats IS 'Denormalized user statistics table for performance optimization. Updated automatically through database triggers.';
COMMENT ON FUNCTION update_pin_stats() IS 'Updates user pin statistics when pins are created or deleted';
COMMENT ON FUNCTION update_comment_stats() IS 'Updates user comment statistics when comments are created or deleted';
COMMENT ON FUNCTION update_vote_stats() IS 'Updates user vote statistics when votes are created, updated, or deleted';
COMMENT ON FUNCTION populate_user_stats() IS 'One-time function to populate existing user statistics during migration';