-- Migration: Unified XP and Leaderboard System
-- This migration creates a comprehensive XP system that unifies all XP tracking across hubs
-- and provides leaderboard functionality with real-time updates

-- =======================
-- 1) CREATE UNIFIED XP TABLES
-- =======================

-- Create unified user_xp table (consolidates all XP from different hubs)
CREATE TABLE IF NOT EXISTS public.user_xp (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  total_xp integer NOT NULL DEFAULT 0,
  campus_xp integer NOT NULL DEFAULT 0,
  learning_xp integer NOT NULL DEFAULT 0,
  finance_xp integer NOT NULL DEFAULT 0,
  club_xp integer NOT NULL DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  daily_login_streak integer NOT NULL DEFAULT 0,
  last_login_date date,
  created_at timestamptz DEFAULT now()
);

-- Create comprehensive xp_logs table for all XP transactions
CREATE TABLE IF NOT EXISTS public.xp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  xp_change integer NOT NULL,
  hub_type text NOT NULL DEFAULT 'general', -- 'campus', 'learning', 'finance', 'club', 'general'
  reference_id uuid, -- Can reference any related entity
  reference_type text, -- 'club_message', 'club_resource', 'quiz_result', 'event_rsvp', etc.
  metadata jsonb DEFAULT '{}', -- Additional context data
  created_at timestamptz DEFAULT now()
);

-- =======================
-- 2) CREATE INDEXES FOR PERFORMANCE
-- =======================

-- Indexes for user_xp table
CREATE INDEX IF NOT EXISTS idx_user_xp_total_xp ON public.user_xp(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_campus_xp ON public.user_xp(campus_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_learning_xp ON public.user_xp(learning_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_finance_xp ON public.user_xp(finance_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_club_xp ON public.user_xp(club_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_last_updated ON public.user_xp(last_updated);

-- Indexes for xp_logs table
CREATE INDEX IF NOT EXISTS idx_xp_logs_user_id ON public.xp_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_logs_action ON public.xp_logs(action);
CREATE INDEX IF NOT EXISTS idx_xp_logs_hub_type ON public.xp_logs(hub_type);
CREATE INDEX IF NOT EXISTS idx_xp_logs_created_at ON public.xp_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_logs_reference ON public.xp_logs(reference_id, reference_type);

-- =======================
-- 3) ENABLE ROW LEVEL SECURITY
-- =======================

ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_logs ENABLE ROW LEVEL SECURITY;

-- =======================
-- 4) CREATE RLS POLICIES
-- =======================

-- user_xp policies
CREATE POLICY "user_xp_select_all" ON public.user_xp
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "user_xp_insert_own" ON public.user_xp
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_xp_update_system" ON public.user_xp
  FOR UPDATE TO service_role
  USING (true);

-- xp_logs policies
CREATE POLICY "xp_logs_select_own" ON public.xp_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "xp_logs_select_all_for_leaderboard" ON public.xp_logs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "xp_logs_insert_system" ON public.xp_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

-- =======================
-- 5) CREATE XP MANAGEMENT FUNCTIONS
-- =======================

-- Function to award XP and update all relevant tables
CREATE OR REPLACE FUNCTION public.award_unified_xp(
  p_user_id uuid,
  p_action text,
  p_xp_amount integer,
  p_hub_type text DEFAULT 'general',
  p_reference_id uuid DEFAULT NULL,
  p_reference_type text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert into xp_logs
  INSERT INTO public.xp_logs (
    user_id, action, xp_change, hub_type, reference_id, reference_type, metadata
  ) VALUES (
    p_user_id, p_action, p_xp_amount, p_hub_type, p_reference_id, p_reference_type, p_metadata
  );

  -- Update or insert into user_xp
  INSERT INTO public.user_xp (user_id, total_xp, campus_xp, learning_xp, finance_xp, club_xp)
  VALUES (
    p_user_id,
    p_xp_amount,
    CASE WHEN p_hub_type = 'campus' THEN p_xp_amount ELSE 0 END,
    CASE WHEN p_hub_type = 'learning' THEN p_xp_amount ELSE 0 END,
    CASE WHEN p_hub_type = 'finance' THEN p_xp_amount ELSE 0 END,
    CASE WHEN p_hub_type = 'club' THEN p_xp_amount ELSE 0 END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp = user_xp.total_xp + p_xp_amount,
    campus_xp = user_xp.campus_xp + CASE WHEN p_hub_type = 'campus' THEN p_xp_amount ELSE 0 END,
    learning_xp = user_xp.learning_xp + CASE WHEN p_hub_type = 'learning' THEN p_xp_amount ELSE 0 END,
    finance_xp = user_xp.finance_xp + CASE WHEN p_hub_type = 'finance' THEN p_xp_amount ELSE 0 END,
    club_xp = user_xp.club_xp + CASE WHEN p_hub_type = 'club' THEN p_xp_amount ELSE 0 END,
    last_updated = now();

  -- Update user_reputation table if it exists
  INSERT INTO public.user_reputation (user_id, total_xp, level)
  VALUES (
    p_user_id,
    (SELECT total_xp FROM public.user_xp WHERE user_id = p_user_id),
    GREATEST(1, (SELECT total_xp FROM public.user_xp WHERE user_id = p_user_id) / 100 + 1)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp = (SELECT total_xp FROM public.user_xp WHERE user_id = p_user_id),
    level = GREATEST(1, (SELECT total_xp FROM public.user_xp WHERE user_id = p_user_id) / 100 + 1),
    updated_at = now();
END;
$$;

-- Function to handle daily login XP
CREATE OR REPLACE FUNCTION public.award_daily_login_xp(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_streak integer := 0;
  last_login date;
  today date := CURRENT_DATE;
BEGIN
  -- Get current streak and last login
  SELECT daily_login_streak, last_login_date
  INTO current_streak, last_login
  FROM public.user_xp
  WHERE user_id = p_user_id;

  -- If no record exists or last login was not yesterday, reset streak
  IF last_login IS NULL OR last_login < today - INTERVAL '1 day' THEN
    current_streak := 1;
  ELSIF last_login = today - INTERVAL '1 day' THEN
    current_streak := current_streak + 1;
  ELSIF last_login = today THEN
    -- Already logged in today, no XP
    RETURN;
  END IF;

  -- Update login streak
  INSERT INTO public.user_xp (user_id, daily_login_streak, last_login_date)
  VALUES (p_user_id, current_streak, today)
  ON CONFLICT (user_id) DO UPDATE SET
    daily_login_streak = current_streak,
    last_login_date = today;

  -- Award XP for daily login (5 XP base + bonus for streak)
  PERFORM public.award_unified_xp(
    p_user_id,
    'daily_login',
    5 + LEAST(current_streak - 1, 10), -- Max 15 XP for long streaks
    'general',
    NULL,
    'daily_login',
    jsonb_build_object('streak', current_streak)
  );
END;
$$;

-- Function to get leaderboard data
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_hub_type text DEFAULT 'total',
  p_limit integer DEFAULT 10,
  p_club_id uuid DEFAULT NULL
)
RETURNS TABLE(
  user_id uuid,
  username text,
  avatar_url text,
  xp_amount integer,
  rank_position bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_club_id IS NOT NULL THEN
    -- Club-specific leaderboard
    RETURN QUERY
    SELECT 
      ux.user_id,
      u.username,
      u.avatar_url,
      ux.club_xp as xp_amount,
      ROW_NUMBER() OVER (ORDER BY ux.club_xp DESC) as rank_position
    FROM public.user_xp ux
    JOIN public.users u ON u.id = ux.user_id
    JOIN public.club_members cm ON cm.user_id = ux.user_id AND cm.club_id = p_club_id
    WHERE ux.club_xp > 0
    ORDER BY ux.club_xp DESC
    LIMIT p_limit;
  ELSE
    -- Global leaderboard
    RETURN QUERY
    SELECT 
      ux.user_id,
      u.username,
      u.avatar_url,
      CASE 
        WHEN p_hub_type = 'campus' THEN ux.campus_xp
        WHEN p_hub_type = 'learning' THEN ux.learning_xp
        WHEN p_hub_type = 'finance' THEN ux.finance_xp
        WHEN p_hub_type = 'club' THEN ux.club_xp
        ELSE ux.total_xp
      END as xp_amount,
      ROW_NUMBER() OVER (
        ORDER BY 
          CASE 
            WHEN p_hub_type = 'campus' THEN ux.campus_xp
            WHEN p_hub_type = 'learning' THEN ux.learning_xp
            WHEN p_hub_type = 'finance' THEN ux.finance_xp
            WHEN p_hub_type = 'club' THEN ux.club_xp
            ELSE ux.total_xp
          END DESC
      ) as rank_position
    FROM public.user_xp ux
    JOIN public.users u ON u.id = ux.user_id
    WHERE 
      CASE 
        WHEN p_hub_type = 'campus' THEN ux.campus_xp
        WHEN p_hub_type = 'learning' THEN ux.learning_xp
        WHEN p_hub_type = 'finance' THEN ux.finance_xp
        WHEN p_hub_type = 'club' THEN ux.club_xp
        ELSE ux.total_xp
      END > 0
    ORDER BY 
      CASE 
        WHEN p_hub_type = 'campus' THEN ux.campus_xp
        WHEN p_hub_type = 'learning' THEN ux.learning_xp
        WHEN p_hub_type = 'finance' THEN ux.finance_xp
        WHEN p_hub_type = 'club' THEN ux.club_xp
        ELSE ux.total_xp
      END DESC
    LIMIT p_limit;
  END IF;
END;
$$;

-- =======================
-- 6) CREATE AUTOMATIC XP TRIGGERS
-- =======================

-- Trigger function for club messages
CREATE OR REPLACE FUNCTION public.award_xp_club_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.award_unified_xp(
    NEW.user_id,
    'club_message_post',
    2,
    'club',
    NEW.id,
    'club_message',
    jsonb_build_object('club_id', NEW.club_id)
  );
  RETURN NEW;
END;
$$;

-- Trigger function for club resources
CREATE OR REPLACE FUNCTION public.award_xp_club_resource()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.award_unified_xp(
    NEW.created_by,
    'club_resource_upload',
    15,
    'club',
    NEW.id,
    'club_resource',
    jsonb_build_object('club_id', NEW.club_id, 'resource_type', NEW.resource_type)
  );
  RETURN NEW;
END;
$$;

-- Trigger function for event RSVPs
CREATE OR REPLACE FUNCTION public.award_xp_event_rsvp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'attending' THEN
    PERFORM public.award_unified_xp(
      NEW.user_id,
      'event_rsvp',
      25,
      'campus',
      NEW.event_id,
      'event_rsvp',
      jsonb_build_object('event_id', NEW.event_id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS award_xp_on_club_message ON public.club_messages;
CREATE TRIGGER award_xp_on_club_message
  AFTER INSERT ON public.club_messages
  FOR EACH ROW EXECUTE FUNCTION public.award_xp_club_message();

DROP TRIGGER IF EXISTS award_xp_on_club_resource ON public.club_resources;
CREATE TRIGGER award_xp_on_club_resource
  AFTER INSERT ON public.club_resources
  FOR EACH ROW EXECUTE FUNCTION public.award_xp_club_resource();

DROP TRIGGER IF EXISTS award_xp_on_event_rsvp ON public.club_event_members;
CREATE TRIGGER award_xp_on_event_rsvp
  AFTER INSERT ON public.club_event_members
  FOR EACH ROW EXECUTE FUNCTION public.award_xp_event_rsvp();

-- =======================
-- 7) MIGRATE EXISTING DATA
-- =======================

-- Migrate existing campus_xp data to new unified system
INSERT INTO public.user_xp (user_id, total_xp, campus_xp, last_updated)
SELECT 
  user_id,
  COALESCE(SUM(points), 0) as total_xp,
  COALESCE(SUM(points), 0) as campus_xp,
  MAX(created_at) as last_updated
FROM public.campus_xp
GROUP BY user_id
ON CONFLICT (user_id) DO UPDATE SET
  total_xp = user_xp.total_xp + EXCLUDED.campus_xp,
  campus_xp = EXCLUDED.campus_xp,
  last_updated = EXCLUDED.last_updated;

-- Migrate existing campus_xp logs to new xp_logs table
INSERT INTO public.xp_logs (user_id, action, xp_change, hub_type, reference_id, reference_type, created_at)
SELECT 
  user_id,
  action_type,
  points,
  'campus',
  reference_id,
  reference_type,
  created_at
FROM public.campus_xp;

-- =======================
-- 8) GRANT PERMISSIONS
-- =======================

GRANT SELECT ON public.user_xp TO authenticated;
GRANT SELECT ON public.xp_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_unified_xp(uuid, text, integer, text, uuid, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.award_daily_login_xp(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(text, integer, uuid) TO authenticated;

-- =======================
-- 9) ADD COMMENTS
-- =======================

COMMENT ON TABLE public.user_xp IS 'Unified XP tracking for all users across all hubs';
COMMENT ON TABLE public.xp_logs IS 'Comprehensive log of all XP transactions with context';
COMMENT ON FUNCTION public.award_unified_xp IS 'Awards XP to a user and updates all relevant tracking tables';
COMMENT ON FUNCTION public.award_daily_login_xp IS 'Handles daily login XP with streak bonuses';
COMMENT ON FUNCTION public.get_leaderboard IS 'Returns leaderboard data for global or club-specific rankings';