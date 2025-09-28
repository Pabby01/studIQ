-- Migration: Add Password Reset Tokens Table
-- This migration creates the password_reset_tokens table for handling password reset functionality

-- =======================
-- 1) CREATE PASSWORD_RESET_TOKENS TABLE
-- =======================

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  used_at timestamptz,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =======================
-- 2) CREATE INDEXES FOR PERFORMANCE
-- =======================

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON public.password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);

-- =======================
-- 3) ENABLE ROW LEVEL SECURITY
-- =======================

ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- =======================
-- 4) CREATE RLS POLICIES
-- =======================

-- Only authenticated users can verify their own tokens
CREATE POLICY "password_reset_tokens_select_own" ON public.password_reset_tokens
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Only the system can insert/update/delete tokens (using service_role key)
CREATE POLICY "password_reset_tokens_all_service_role" ON public.password_reset_tokens
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- =======================
-- 5) GRANT PERMISSIONS
-- =======================

-- Grant access to authenticated users (for verification only)
GRANT SELECT ON public.password_reset_tokens TO authenticated;

-- Grant all access to service role (for system operations)
GRANT ALL ON public.password_reset_tokens TO service_role;

-- =======================
-- 6) ADD HELPFUL FUNCTIONS
-- =======================

-- Function to validate a password reset token
CREATE OR REPLACE FUNCTION public.validate_password_reset_token(p_token_hash text)
RETURNS TABLE (
  is_valid boolean,
  user_id uuid,
  error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token RECORD;
BEGIN
  -- Get token record
  SELECT * INTO v_token
  FROM public.password_reset_tokens
  WHERE token_hash = p_token_hash
  AND used_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  -- Check if token exists
  IF v_token.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Invalid or expired token'::text;
    RETURN;
  END IF;

  -- Check if token is expired
  IF v_token.expires_at < NOW() THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Token has expired'::text;
    RETURN;
  END IF;

  -- Token is valid
  RETURN QUERY SELECT true, v_token.user_id, NULL::text;
END;
$$;

-- Function to mark a token as used
CREATE OR REPLACE FUNCTION public.mark_token_used(p_token_hash text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.password_reset_tokens
  SET used_at = NOW()
  WHERE token_hash = p_token_hash
  AND used_at IS NULL
  AND expires_at > NOW();

  RETURN FOUND;
END;
$$;

-- =======================
-- 7) COMPLETION MESSAGE
-- =======================

DO $$
BEGIN
  RAISE NOTICE 'Successfully created password_reset_tokens table with RLS policies and helper functions';
END $$;