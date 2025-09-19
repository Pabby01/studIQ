-- Migration to fix ambiguous total_xp column references
-- This migration completely replaces problematic functions to eliminate ambiguity

-- Drop existing trigger first to avoid dependency errors
DROP TRIGGER IF EXISTS update_reputation_on_xp_change ON public.campus_xp;

-- Drop existing functions that cause ambiguous total_xp references
DROP FUNCTION IF EXISTS public.get_user_total_xp(uuid);
DROP FUNCTION IF EXISTS public.award_xp(uuid, text, integer, text);
DROP FUNCTION IF EXISTS public.update_user_reputation_from_xp();

-- Recreate get_user_total_xp function with proper variable naming
CREATE OR REPLACE FUNCTION public.get_user_total_xp(p_user_id uuid)
RETURNS integer AS $$
DECLARE
  user_xp_total integer;
BEGIN
  SELECT COALESCE(SUM(cx.points), 0) INTO user_xp_total
  FROM public.campus_xp cx
  WHERE cx.user_id = p_user_id;
  
  RETURN user_xp_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate award_xp function with explicit table references
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id uuid,
  p_activity_type text,
  p_amount integer,
  p_description text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  current_xp integer;
  new_level integer;
BEGIN
  -- Get current total XP
  SELECT COALESCE(ur.total_xp, 0) INTO current_xp
  FROM public.user_reputation ur
  WHERE ur.user_id = p_user_id;
  
  -- Calculate new level
  new_level := GREATEST(1, (current_xp + p_amount) / 100 + 1);
  
  -- Insert XP record
  INSERT INTO public.campus_xp (user_id, activity_type, points, description, created_at)
  VALUES (p_user_id, p_activity_type, p_amount, p_description, NOW());
  
  -- Update or insert user reputation
  INSERT INTO public.user_reputation (user_id, total_xp, level, updated_at)
  VALUES (p_user_id, current_xp + p_amount, new_level, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_xp = user_reputation.total_xp + p_amount,
    level = GREATEST(1, (user_reputation.total_xp + p_amount) / 100 + 1),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate update_user_reputation_from_xp function with explicit references
CREATE OR REPLACE FUNCTION public.update_user_reputation_from_xp()
RETURNS trigger AS $$
DECLARE
  calculated_xp_total integer;
  new_user_level integer;
BEGIN
  -- Calculate total XP for the user
  SELECT COALESCE(SUM(cx.points), 0) INTO calculated_xp_total
  FROM public.campus_xp cx
  WHERE cx.user_id = COALESCE(NEW.user_id, OLD.user_id);
  
  -- Calculate new level
  new_user_level := GREATEST(1, calculated_xp_total / 100 + 1);
  
  -- Update user reputation
  INSERT INTO public.user_reputation (user_id, total_xp, level, updated_at)
  VALUES (COALESCE(NEW.user_id, OLD.user_id), calculated_xp_total, new_user_level, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_xp = calculated_xp_total,
    level = new_user_level,
    updated_at = NOW();
    
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS update_reputation_on_xp_change ON public.campus_xp;
CREATE TRIGGER update_reputation_on_xp_change
  AFTER INSERT OR UPDATE OR DELETE ON public.campus_xp
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_reputation_from_xp();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_user_total_xp(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_xp(uuid, text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_reputation_from_xp() TO authenticated;

-- Add comments for clarity
COMMENT ON FUNCTION public.get_user_total_xp(uuid) IS 'Returns total XP for a user, avoiding ambiguous column references';
COMMENT ON FUNCTION public.award_xp(uuid, text, integer, text) IS 'Awards XP to a user with explicit table references';
COMMENT ON FUNCTION public.update_user_reputation_from_xp() IS 'Trigger function to update user reputation when XP changes';