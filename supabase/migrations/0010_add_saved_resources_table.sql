-- Migration: Add Saved Resources Table
-- This migration creates the missing saved_resources table for users to save club resources

-- =======================
-- 1) CREATE SAVED_RESOURCES TABLE
-- =======================

-- Create saved_resources table for users to save resources
CREATE TABLE IF NOT EXISTS public.saved_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.club_resources(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  saved_at timestamptz DEFAULT now(),
  UNIQUE(user_id, resource_id) -- Prevent duplicate saves
);

-- =======================
-- 2) CREATE INDEXES FOR PERFORMANCE
-- =======================

CREATE INDEX IF NOT EXISTS idx_saved_resources_user_id ON public.saved_resources(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_resources_resource_id ON public.saved_resources(resource_id);
CREATE INDEX IF NOT EXISTS idx_saved_resources_club_id ON public.saved_resources(club_id);
CREATE INDEX IF NOT EXISTS idx_saved_resources_saved_at ON public.saved_resources(saved_at);

-- =======================
-- 3) ENABLE ROW LEVEL SECURITY
-- =======================

ALTER TABLE public.saved_resources ENABLE ROW LEVEL SECURITY;

-- =======================
-- 4) CREATE RLS POLICIES
-- =======================

-- Users can only see their own saved resources
DROP POLICY IF EXISTS "saved_resources_select_own" ON public.saved_resources;
CREATE POLICY "saved_resources_select_own" ON public.saved_resources
  FOR SELECT
  USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));

-- Users can only insert their own saved resources
DROP POLICY IF EXISTS "saved_resources_insert_own" ON public.saved_resources;
CREATE POLICY "saved_resources_insert_own" ON public.saved_resources
  FOR INSERT
  WITH CHECK (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));

-- Users can only delete their own saved resources
DROP POLICY IF EXISTS "saved_resources_delete_own" ON public.saved_resources;
CREATE POLICY "saved_resources_delete_own" ON public.saved_resources
  FOR DELETE
  USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = user_id));

-- =======================
-- 5) GRANT PERMISSIONS
-- =======================

GRANT SELECT, INSERT, DELETE ON public.saved_resources TO authenticated;

-- =======================
-- 6) ADD HELPFUL FUNCTIONS
-- =======================

-- Function to check if a resource is saved by a user
CREATE OR REPLACE FUNCTION public.is_resource_saved(p_user_id uuid, p_resource_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.saved_resources 
    WHERE user_id = p_user_id AND resource_id = p_resource_id
  );
END;
$$;

-- Function to get saved resources count for a user
CREATE OR REPLACE FUNCTION public.get_saved_resources_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer 
    FROM public.saved_resources 
    WHERE user_id = p_user_id
  );
END;
$$;

-- =======================
-- 7) COMPLETION MESSAGE
-- =======================

DO $$
BEGIN
  RAISE NOTICE 'Successfully created saved_resources table with RLS policies and helper functions';
END $$;