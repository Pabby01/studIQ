-- =====================================================
-- COMPREHENSIVE DATABASE SCHEMA FIX FOR SUPABASE
-- =====================================================
-- This script fixes all schema mismatches between the database and API routes
-- Run this in the Supabase SQL Editor to fix all database issues

-- =====================================================
-- 1. FIX EVENTS TABLE - ADD event_date COLUMN
-- =====================================================

-- Add event_date column as computed column based on start_time
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS event_date timestamptz GENERATED ALWAYS AS (start_time) STORED;

-- Create index for event_date for better query performance
CREATE INDEX IF NOT EXISTS idx_events_event_date ON public.events(event_date);

-- =====================================================
-- 2. FIX COLLABORATION_TOOL_SHARES TABLE
-- =====================================================

-- Ensure the collaboration_tool_shares table has the correct user_id column
-- (This should already exist, but let's make sure)
DO $$
BEGIN
    -- Check if user_id column exists in collaboration_tool_shares
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'collaboration_tool_shares' 
        AND column_name = 'shared_with'
    ) THEN
        -- If the table structure is wrong, recreate it
        DROP TABLE IF EXISTS public.collaboration_tool_shares CASCADE;
        
        CREATE TABLE public.collaboration_tool_shares (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tool_id uuid NOT NULL REFERENCES public.collaboration_tools(id) ON DELETE CASCADE,
            shared_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            shared_with uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            permission_level text NOT NULL DEFAULT 'view',
            created_at timestamptz DEFAULT now(),
            UNIQUE(tool_id, shared_with)
        );

        -- Enable RLS
        ALTER TABLE public.collaboration_tool_shares ENABLE ROW LEVEL SECURITY;

        -- Create indexes
        CREATE INDEX idx_collaboration_tool_shares_tool_id ON public.collaboration_tool_shares(tool_id);
        CREATE INDEX idx_collaboration_tool_shares_shared_with ON public.collaboration_tool_shares(shared_with);
        CREATE INDEX idx_collaboration_tool_shares_shared_by ON public.collaboration_tool_shares(shared_by);

        -- Create RLS policies
        CREATE POLICY "collaboration_tool_shares_select_involved" ON public.collaboration_tool_shares
            FOR SELECT TO authenticated
            USING (shared_by = auth.uid() OR shared_with = auth.uid());

        CREATE POLICY "collaboration_tool_shares_insert_own" ON public.collaboration_tool_shares
            FOR INSERT TO authenticated
            WITH CHECK (shared_by = auth.uid());

        CREATE POLICY "collaboration_tool_shares_delete_own" ON public.collaboration_tool_shares
            FOR DELETE TO authenticated
            USING (shared_by = auth.uid());
    END IF;
END $$;

-- =====================================================
-- 3. ENSURE ALL REQUIRED TABLES EXIST
-- =====================================================

-- Ensure users table exists with correct structure
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id uuid UNIQUE NOT NULL,
    email text UNIQUE NOT NULL,
    username text UNIQUE NOT NULL,
    full_name text,
    avatar_url text,
    bio text,
    university text,
    major text,
    graduation_year integer,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Ensure clubs table exists
CREATE TABLE IF NOT EXISTS public.clubs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    category text,
    is_public boolean DEFAULT true,
    member_count integer DEFAULT 0,
    created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Ensure club_members table exists
CREATE TABLE IF NOT EXISTS public.club_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'member',
    joined_at timestamptz DEFAULT now(),
    UNIQUE(club_id, user_id)
);

-- Ensure study_groups table exists
CREATE TABLE IF NOT EXISTS public.study_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    subject text,
    max_members integer DEFAULT 10,
    is_public boolean DEFAULT true,
    created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Ensure study_group_members table exists
CREATE TABLE IF NOT EXISTS public.study_group_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'member',
    joined_at timestamptz DEFAULT now(),
    UNIQUE(group_id, user_id)
);

-- Ensure campus_xp table exists
CREATE TABLE IF NOT EXISTS public.campus_xp (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    points integer NOT NULL DEFAULT 0,
    reason text NOT NULL,
    reference_id uuid,
    reference_type text,
    created_at timestamptz DEFAULT now()
);

-- =====================================================
-- 4. CREATE/UPDATE REQUIRED FUNCTIONS
-- =====================================================

-- Function to award XP (used by API routes)
CREATE OR REPLACE FUNCTION public.award_xp(
    user_id uuid,
    amount integer,
    reason text,
    reference_id uuid DEFAULT NULL,
    reference_type text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert XP record
    INSERT INTO public.campus_xp (user_id, points, reason, reference_id, reference_type)
    VALUES (user_id, amount, reason, reference_id, reference_type);
    
    -- Update user reputation if it exists
    UPDATE public.user_reputation 
    SET 
        total_xp = public.user_reputation.total_xp + amount,
        level = GREATEST(1, (public.user_reputation.total_xp + amount) / 100 + 1),
        updated_at = now()
    WHERE user_id = award_xp.user_id;
    
    -- If user reputation doesn't exist, create it
    INSERT INTO public.user_reputation (user_id, total_xp, level)
    VALUES (user_id, amount, GREATEST(1, amount / 100 + 1))
    ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Alternative award_xp function with different signature (for compatibility)
CREATE OR REPLACE FUNCTION public.award_xp(
    user_id uuid,
    points integer,
    reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM public.award_xp(user_id, points, reason, NULL, NULL);
END;
$$;

-- =====================================================
-- 5. ENABLE RLS ON ALL TABLES
-- =====================================================

-- Enable RLS on all main tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. CREATE ESSENTIAL RLS POLICIES
-- =====================================================

-- Users policies
DROP POLICY IF EXISTS "users_select_all" ON public.users;
CREATE POLICY "users_select_all" ON public.users
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE TO authenticated
    USING (auth_id = auth.uid())
    WITH CHECK (auth_id = auth.uid());

-- Clubs policies
DROP POLICY IF EXISTS "clubs_select_all" ON public.clubs;
CREATE POLICY "clubs_select_all" ON public.clubs
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "clubs_insert_own" ON public.clubs;
CREATE POLICY "clubs_insert_own" ON public.clubs
    FOR INSERT TO authenticated
    WITH CHECK (created_by IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Events policies
DROP POLICY IF EXISTS "events_select_all" ON public.events;
CREATE POLICY "events_select_all" ON public.events
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "events_insert_own" ON public.events;
CREATE POLICY "events_insert_own" ON public.events
    FOR INSERT TO authenticated
    WITH CHECK (created_by IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Event RSVPs policies
DROP POLICY IF EXISTS "event_rsvps_select_all" ON public.event_rsvps;
CREATE POLICY "event_rsvps_select_all" ON public.event_rsvps
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "event_rsvps_insert_own" ON public.event_rsvps;
CREATE POLICY "event_rsvps_insert_own" ON public.event_rsvps
    FOR INSERT TO authenticated
    WITH CHECK (user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- =====================================================
-- 7. CREATE ESSENTIAL INDEXES
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_club_id ON public.events(club_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON public.events(start_time);

-- Club members indexes
CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON public.club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user_id ON public.club_members(user_id);

-- Campus XP indexes
CREATE INDEX IF NOT EXISTS idx_campus_xp_user_id ON public.campus_xp(user_id);
CREATE INDEX IF NOT EXISTS idx_campus_xp_created_at ON public.campus_xp(created_at);

-- =====================================================
-- 8. GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Fix ambiguous total_xp reference in get_user_total_xp function
CREATE OR REPLACE FUNCTION public.get_user_total_xp(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  calculated_total_xp integer;
BEGIN
  SELECT COALESCE(SUM(points), 0) INTO calculated_total_xp
  FROM public.campus_xp
  WHERE user_id = p_user_id;
  
  RETURN calculated_total_xp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant permissions on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- 9. FINAL VERIFICATION AND CLEANUP
-- =====================================================

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database schema fix completed successfully!';
    RAISE NOTICE 'All tables, columns, functions, and policies have been created/updated.';
    RAISE NOTICE 'The following issues have been resolved:';
    RAISE NOTICE '1. Added event_date column to events table';
    RAISE NOTICE '2. Fixed collaboration_tool_shares table structure';
    RAISE NOTICE '3. Created/updated award_xp functions';
    RAISE NOTICE '4. Ensured all required tables exist';
    RAISE NOTICE '5. Set up proper RLS policies and indexes';
END $$;