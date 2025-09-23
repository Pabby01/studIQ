import { NextResponse } from 'next/server';
import { getSupabaseFromRequest } from '@/lib/supabase-server';
import { AuthErrorHandler, AuthErrorType } from '@/lib/auth-error-handler';
import { AuthLogger } from '@/lib/auth-logger';

const endpoint = '/api/auth/resend-verification';

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseFromRequest(req);
    if (!supabase) {
      AuthLogger.error('Failed to initialize Supabase client', null, { endpoint });
      return AuthErrorHandler.handleValidationError('Database connection failed', endpoint);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      AuthLogger.warn('Unauthorized request', { endpoint });
      return AuthErrorHandler.handleValidationError('Unauthorized', endpoint);
    }

    if (user.email_confirmed_at) {
      AuthLogger.info('Email already verified', { endpoint, userId: user.id });
      return AuthErrorHandler.handleValidationError('Email is already verified', endpoint);
    }

    AuthLogger.info('Resending verification email', { endpoint, userId: user.id });

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: user.email!,
    });

    if (resendError) {
      AuthLogger.error('Failed to resend verification email', resendError, { endpoint, userId: user.id });
      return AuthErrorHandler.handleValidationError('Failed to generate verification link', endpoint);
    }

    AuthLogger.info('Verification email resent successfully', { endpoint, userId: user.id });

    return NextResponse.json(
      { message: 'Verification email sent successfully' },
      { status: 200 }
    );

  } catch (error) {
    AuthLogger.critical('Unexpected error in resend verification endpoint', error, { endpoint });
    return AuthErrorHandler.handleValidationError('An unexpected error occurred', endpoint);
  }
}