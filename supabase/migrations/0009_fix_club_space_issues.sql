-- Migration: Fix Club Space Issues
-- This migration addresses critical issues with club space functionality:
-- 1. Creates missing message_reactions table
-- 2. Fixes foreign key relationships
-- 3. Implements real-time member count synchronization
-- 4. Adds proper indexes for performance
-- 5. Updates RLS policies

-- =======================
-- 1) CREATE MESSAGE_REACTIONS TABLE
-- =======================

-- Create message_reactions table for club chat functionality
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.club_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON public.message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_emoji ON public.message_reactions(emoji);

-- =======================
-- 2) UPDATE CLUB_MESSAGES TABLE STRUCTURE
-- =======================

-- Add missing columns to club_messages if they don't exist
DO $$
BEGIN
  -- Add reply_to column for threaded conversations
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'club_messages' AND column_name = 'reply_to') THEN
    ALTER TABLE public.club_messages ADD COLUMN reply_to uuid REFERENCES public.club_messages(id) ON DELETE SET NULL;
  END IF;
  
  -- Add type column if it doesn't exist (rename message_type to type for consistency)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'club_messages' AND column_name = 'type') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'club_messages' AND column_name = 'message_type') THEN
      ALTER TABLE public.club_messages RENAME COLUMN message_type TO type;
    ELSE
      ALTER TABLE public.club_messages ADD COLUMN type text DEFAULT 'text';
    END IF;
  END IF;
  
  -- Add metadata column for rich content
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'club_messages' AND column_name = 'metadata') THEN
    ALTER TABLE public.club_messages ADD COLUMN metadata jsonb DEFAULT '{}';
  END IF;
END $$;

-- Add indexes for club_messages
CREATE INDEX IF NOT EXISTS idx_club_messages_club_id ON public.club_messages(club_id);
CREATE INDEX IF NOT EXISTS idx_club_messages_user_id ON public.club_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_club_messages_created_at ON public.club_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_club_messages_reply_to ON public.club_messages(reply_to);
CREATE INDEX IF NOT EXISTS idx_club_messages_type ON public.club_messages(type);

-- =======================
-- 3) CREATE MEMBER COUNT SYNCHRONIZATION FUNCTIONS
-- =======================

-- Function to update club member count
CREATE OR REPLACE FUNCTION update_club_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.clubs 
    SET member_count = (
      SELECT COUNT(*) 
      FROM public.club_members 
      WHERE club_id = NEW.club_id
    )
    WHERE id = NEW.club_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.clubs 
    SET member_count = (
      SELECT COUNT(*) 
      FROM public.club_members 
      WHERE club_id = OLD.club_id
    )
    WHERE id = OLD.club_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for member count updates
DROP TRIGGER IF EXISTS trigger_update_club_member_count ON public.club_members;
CREATE TRIGGER trigger_update_club_member_count
  AFTER INSERT OR DELETE ON public.club_members
  FOR EACH ROW
  EXECUTE FUNCTION update_club_member_count();

-- =======================
-- 4) ENABLE RLS AND CREATE POLICIES
-- =======================

-- Enable RLS on message_reactions
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Message reactions policies
DROP POLICY IF EXISTS "message_reactions_select_club_members" ON public.message_reactions;
CREATE POLICY "message_reactions_select_club_members" ON public.message_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_messages cm
      JOIN public.club_members cmem ON cmem.club_id = cm.club_id
      JOIN public.users u ON u.id = cmem.user_id
      WHERE cm.id = message_reactions.message_id
      AND u.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "message_reactions_insert_own" ON public.message_reactions;
CREATE POLICY "message_reactions_insert_own" ON public.message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = user_id AND u.auth_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM public.club_messages cm
      JOIN public.club_members cmem ON cmem.club_id = cm.club_id
      WHERE cm.id = message_id AND cmem.user_id = user_id
    )
  );

DROP POLICY IF EXISTS "message_reactions_delete_own" ON public.message_reactions;
CREATE POLICY "message_reactions_delete_own" ON public.message_reactions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = user_id AND u.auth_id = auth.uid()
    )
  );

-- =======================
-- 5) UPDATE EXISTING CLUB POLICIES
-- =======================

-- Update club_messages policies to handle new columns
DROP POLICY IF EXISTS "club_messages_select_members" ON public.club_messages;
CREATE POLICY "club_messages_select_members" ON public.club_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_members cm
      JOIN public.users u ON u.id = cm.user_id
      WHERE cm.club_id = club_messages.club_id 
      AND u.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "club_messages_insert_members" ON public.club_messages;
CREATE POLICY "club_messages_insert_members" ON public.club_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = user_id AND u.auth_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM public.club_members cm
      WHERE cm.club_id = club_id AND cm.user_id = user_id
    )
  );

DROP POLICY IF EXISTS "club_messages_update_own" ON public.club_messages;
CREATE POLICY "club_messages_update_own" ON public.club_messages
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = user_id AND u.auth_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "club_messages_delete_own_or_admin" ON public.club_messages;
CREATE POLICY "club_messages_delete_own_or_admin" ON public.club_messages
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = user_id AND u.auth_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.club_members cm
      JOIN public.users u ON u.id = cm.user_id
      WHERE cm.club_id = club_messages.club_id 
      AND u.auth_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

-- =======================
-- 6) INITIALIZE MEMBER COUNTS FOR EXISTING CLUBS
-- =======================

-- Update member counts for all existing clubs
UPDATE public.clubs 
SET member_count = (
  SELECT COUNT(*) 
  FROM public.club_members 
  WHERE club_id = clubs.id
);

-- =======================
-- 7) CREATE REAL-TIME FUNCTIONS FOR CLUB UPDATES
-- =======================

-- Function to notify club updates
CREATE OR REPLACE FUNCTION notify_club_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'club_update',
    json_build_object(
      'club_id', COALESCE(NEW.club_id, OLD.club_id),
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'timestamp', extract(epoch from now())
    )::text
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for real-time notifications
DROP TRIGGER IF EXISTS trigger_notify_club_members_update ON public.club_members;
CREATE TRIGGER trigger_notify_club_members_update
  AFTER INSERT OR UPDATE OR DELETE ON public.club_members
  FOR EACH ROW
  EXECUTE FUNCTION notify_club_update();

DROP TRIGGER IF EXISTS trigger_notify_club_messages_update ON public.club_messages;
CREATE TRIGGER trigger_notify_club_messages_update
  AFTER INSERT OR UPDATE OR DELETE ON public.club_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_club_update();

DROP TRIGGER IF EXISTS trigger_notify_message_reactions_update ON public.message_reactions;
CREATE TRIGGER trigger_notify_message_reactions_update
  AFTER INSERT OR UPDATE OR DELETE ON public.message_reactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_club_update();

-- =======================
-- 8) CREATE HELPER FUNCTIONS
-- =======================

-- Function to get club member count
CREATE OR REPLACE FUNCTION get_club_member_count(club_id_param uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM public.club_members
    WHERE club_id = club_id_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is club member
CREATE OR REPLACE FUNCTION is_club_member(club_id_param uuid, user_auth_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.club_members cm
    JOIN public.users u ON u.id = cm.user_id
    WHERE cm.club_id = club_id_param
    AND u.auth_id = user_auth_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================
-- 9) COMPLETION MESSAGE
-- =======================

DO $$
BEGIN
  RAISE NOTICE '=== CLUB SPACE ISSUES MIGRATION COMPLETED ===';
  RAISE NOTICE '✓ Created message_reactions table with proper foreign keys';
  RAISE NOTICE '✓ Updated club_messages table structure';
  RAISE NOTICE '✓ Implemented real-time member count synchronization';
  RAISE NOTICE '✓ Added performance indexes';
  RAISE NOTICE '✓ Updated RLS policies for security';
  RAISE NOTICE '✓ Created real-time notification triggers';
  RAISE NOTICE '✓ Added helper functions for club operations';
  RAISE NOTICE '✓ Initialized member counts for existing clubs';
  RAISE NOTICE 'All club space functionality should now work properly!';
END $$;