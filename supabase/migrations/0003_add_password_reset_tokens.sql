-- Migration: Add password reset tokens table
-- This table stores secure tokens for password reset functionality

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of the actual token
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL, -- Track when token was used
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON public.password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_created_at ON public.password_reset_tokens(created_at);

-- Create RLS policies
-- Only allow service role to access this table (no user access)
CREATE POLICY "password_reset_tokens_service_only" ON public.password_reset_tokens
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create function to clean up expired tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_password_reset_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.password_reset_tokens 
    WHERE expires_at < NOW() OR used_at IS NOT NULL;
END;
$$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_password_reset_tokens_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_password_reset_tokens_updated_at
    BEFORE UPDATE ON public.password_reset_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.update_password_reset_tokens_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.password_reset_tokens IS 'Stores secure tokens for password reset functionality with automatic cleanup';
COMMENT ON COLUMN public.password_reset_tokens.token_hash IS 'SHA-256 hash of the actual reset token for security';
COMMENT ON COLUMN public.password_reset_tokens.expires_at IS 'Token expiration time (typically 15-30 minutes from creation)';
COMMENT ON COLUMN public.password_reset_tokens.used_at IS 'Timestamp when token was used (for one-time use enforcement)';