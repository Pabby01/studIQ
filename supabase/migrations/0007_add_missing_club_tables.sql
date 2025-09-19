-- Migration: Add missing club tables for club space functionality
-- This migration adds club_events and club_resources tables that the frontend expects

-- =======================
-- 1) CREATE CLUB_EVENTS TABLE
-- =======================

-- Create club_events table (separate from general events)
CREATE TABLE IF NOT EXISTS public.club_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  location text,
  max_attendees integer DEFAULT 100,
  is_virtual boolean DEFAULT false,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  attendee_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create club_event_members table for RSVPs
CREATE TABLE IF NOT EXISTS public.club_event_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.club_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'attending', -- 'attending', 'maybe', 'not_attending'
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- =======================
-- 2) CREATE CLUB_RESOURCES TABLE
-- =======================

-- Create club_resources table
CREATE TABLE IF NOT EXISTS public.club_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  resource_type text NOT NULL DEFAULT 'link', -- 'link', 'file', 'note'
  resource_url text,
  content text,
  category text NOT NULL DEFAULT 'general',
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =======================
-- 3) CREATE INDEXES FOR PERFORMANCE
-- =======================

-- Club events indexes
CREATE INDEX IF NOT EXISTS idx_club_events_club_id ON public.club_events(club_id);
CREATE INDEX IF NOT EXISTS idx_club_events_event_date ON public.club_events(event_date);
CREATE INDEX IF NOT EXISTS idx_club_events_created_by ON public.club_events(created_by);

-- Club event members indexes
CREATE INDEX IF NOT EXISTS idx_club_event_members_event_id ON public.club_event_members(event_id);
CREATE INDEX IF NOT EXISTS idx_club_event_members_user_id ON public.club_event_members(user_id);

-- Club resources indexes
CREATE INDEX IF NOT EXISTS idx_club_resources_club_id ON public.club_resources(club_id);
CREATE INDEX IF NOT EXISTS idx_club_resources_created_by ON public.club_resources(created_by);
CREATE INDEX IF NOT EXISTS idx_club_resources_category ON public.club_resources(category);
CREATE INDEX IF NOT EXISTS idx_club_resources_created_at ON public.club_resources(created_at);

-- =======================
-- 4) ENABLE ROW LEVEL SECURITY
-- =======================

ALTER TABLE public.club_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_event_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_resources ENABLE ROW LEVEL SECURITY;

-- =======================
-- 5) CREATE RLS POLICIES
-- =======================

-- Club events policies
CREATE POLICY "club_events_select_members" ON public.club_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_members cm
      JOIN public.users u ON u.id = cm.user_id
      WHERE cm.club_id = club_events.club_id 
      AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "club_events_insert_members" ON public.club_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.club_members cm
      JOIN public.users u ON u.id = cm.user_id
      WHERE cm.club_id = club_events.club_id 
      AND u.auth_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "club_events_update_creator_or_admin" ON public.club_events
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = created_by AND u.auth_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.club_members cm
      JOIN public.users u ON u.id = cm.user_id
      WHERE cm.club_id = club_events.club_id 
      AND u.auth_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

-- Club event members policies
CREATE POLICY "club_event_members_select_all" ON public.club_event_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_events ce
      JOIN public.club_members cm ON cm.club_id = ce.club_id
      JOIN public.users u ON u.id = cm.user_id
      WHERE ce.id = club_event_members.event_id
      AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "club_event_members_insert_own" ON public.club_event_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = user_id AND u.auth_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM public.club_events ce
      JOIN public.club_members cm ON cm.club_id = ce.club_id
      WHERE ce.id = event_id AND cm.user_id = user_id
    )
  );

-- Club resources policies
CREATE POLICY "club_resources_select_members" ON public.club_resources
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_members cm
      JOIN public.users u ON u.id = cm.user_id
      WHERE cm.club_id = club_resources.club_id 
      AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "club_resources_insert_members" ON public.club_resources
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.club_members cm
      JOIN public.users u ON u.id = cm.user_id
      WHERE cm.club_id = club_resources.club_id 
      AND u.auth_id = auth.uid()
    )
  );

CREATE POLICY "club_resources_update_creator_or_admin" ON public.club_resources
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = created_by AND u.auth_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.club_members cm
      JOIN public.users u ON u.id = cm.user_id
      WHERE cm.club_id = club_resources.club_id 
      AND u.auth_id = auth.uid()
      AND cm.role IN ('admin', 'moderator')
    )
  );

-- =======================
-- 6) CREATE FUNCTIONS FOR ATTENDEE COUNT
-- =======================

-- Function to update attendee count when someone RSVPs
CREATE OR REPLACE FUNCTION update_club_event_attendee_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.club_events 
    SET attendee_count = (
      SELECT COUNT(*) 
      FROM public.club_event_members 
      WHERE event_id = NEW.event_id AND status = 'attending'
    )
    WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.club_events 
    SET attendee_count = (
      SELECT COUNT(*) 
      FROM public.club_event_members 
      WHERE event_id = OLD.event_id AND status = 'attending'
    )
    WHERE id = OLD.event_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.club_events 
    SET attendee_count = (
      SELECT COUNT(*) 
      FROM public.club_event_members 
      WHERE event_id = NEW.event_id AND status = 'attending'
    )
    WHERE id = NEW.event_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for attendee count
DROP TRIGGER IF EXISTS trigger_update_club_event_attendee_count ON public.club_event_members;
CREATE TRIGGER trigger_update_club_event_attendee_count
  AFTER INSERT OR UPDATE OR DELETE ON public.club_event_members
  FOR EACH ROW EXECUTE FUNCTION update_club_event_attendee_count();

-- =======================
-- 7) GRANT PERMISSIONS
-- =======================

-- Grant permissions on new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_event_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_resources TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Club tables migration completed successfully!';
    RAISE NOTICE 'Created tables: club_events, club_event_members, club_resources';
    RAISE NOTICE 'Added proper RLS policies and indexes';
    RAISE NOTICE 'Created attendee count update function and trigger';
END $$;