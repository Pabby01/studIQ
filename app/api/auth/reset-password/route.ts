import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { createHash } from 'crypto';
import { z } from 'zod';
import { AuthErrorHandler, AuthLogger, safeExecute, AuthErrorType } from '@/lib/auth-error-handler';

// Validation schemas
const verifyTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
});

async function validateToken(token: string) {
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    console.error('Failed to initialize Supabase client in validateToken');
    throw new Error('Database connection failed');
  }
  
  const tokenHash = createHash('sha256').update(token).digest('hex');

  // Find the token in database
  const { data: tokenData, error: tokenError } = await supabase
    .from('password_reset_tokens')
    .select('id, user_id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .single();

  if (tokenError || !tokenData) {
    console.warn('Invalid password reset token attempted');
    return { valid: false, error: 'Invalid or expired token' };
  }

  // Check if token is already used
  if (tokenData.used_at) {
    console.warn(`Attempt to reuse password reset token: ${tokenData.id}`);
    return { valid: false, error: 'Token has already been used' };
  }

  // Check if token is expired
  const now = new Date();
  const expiresAt = new Date(tokenData.expires_at);
  
  if (now > expiresAt) {
    console.warn(`Expired password reset token attempted: ${tokenData.id}`);
    return { valid: false, error: 'Token has expired' };
  }

  return { 
    valid: true, 
    tokenData: {
      id: tokenData.id,
      userId: tokenData.user_id,
    }
  };
}

async function markTokenAsUsed(tokenId: string) {
  const supabase = getSupabaseAdmin();
  
  if (!supabase) {
    console.error('Failed to initialize Supabase client in markTokenAsUsed');
    throw new Error('Database connection failed');
  }
  
  const { error } = await supabase
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokenId);

  if (error) {
    console.error('Error marking token as used:', error);
    throw new Error('Failed to mark token as used');
  }
}

// GET - Verify reset token
export async function GET(request: NextRequest) {
  const endpoint = '/api/auth/reset-password [GET]';
  
  try {
    AuthLogger.info('Token verification request initiated', { endpoint });

    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return AuthErrorHandler.handleTokenError('Token is required', endpoint);
    }

    AuthLogger.info('Token extracted from request', { endpoint, tokenLength: token.length });

    const validationResult = verifyTokenSchema.safeParse({ token });
    if (!validationResult.success) {
      return AuthErrorHandler.handleTokenError('Invalid token format', endpoint);
    }

    AuthLogger.info('Token validation passed', { endpoint, tokenLength: token.length });

    const tokenValidation = await safeExecute(
      () => validateToken(token),
      endpoint,
      AuthErrorType.TOKEN_ERROR
    );
    
    if (!tokenValidation.success) {
      return tokenValidation.error!;
    }

    if (!tokenValidation.data!.valid) {
      AuthLogger.warn('Token validation failed', { endpoint, error: tokenValidation.data!.error });
      return NextResponse.json(
        { error: tokenValidation.data!.error },
        { status: 400 }
      );
    }

    AuthLogger.info('Token verification successful', { endpoint });

    return NextResponse.json(
      { valid: true, message: 'Token is valid' },
      { status: 200 }
    );

  } catch (error) {
    AuthLogger.critical('Unexpected error in token verification', error, { endpoint });
    return AuthErrorHandler.handleInternalError(error, endpoint);
  }
}

// POST - Reset password with token
export async function POST(request: NextRequest) {
  const endpoint = '/api/auth/reset-password [POST]';
  
  try {
    AuthLogger.info('Password reset request initiated', { endpoint });

    // Parse and validate request body
    const parseResult = await safeExecute(
      () => request.json(),
      endpoint,
      AuthErrorType.VALIDATION_ERROR
    );

    if (!parseResult.success) {
      return parseResult.error!;
    }

    const validation = resetPasswordSchema.safeParse(parseResult.data);
    
    if (!validation.success) {
      return AuthErrorHandler.handleValidationError(
        validation.error.errors[0]?.message || 'Invalid input',
        endpoint,
        validation.error.errors
      );
    }

    const { token, password } = validation.data;
    AuthLogger.info('Request validation successful', { endpoint, tokenLength: token.length });

    // Validate token
    const tokenValidationResult = await safeExecute(
      () => validateToken(token),
      endpoint,
      AuthErrorType.TOKEN_ERROR
    );

    if (!tokenValidationResult.success) {
      return tokenValidationResult.error!;
    }
    
    if (!tokenValidationResult.data!.valid) {
      AuthLogger.warn('Invalid token for password reset', { endpoint, error: tokenValidationResult.data!.error });
      return NextResponse.json(
        { error: tokenValidationResult.data!.error },
        { status: 400 }
      );
    }

    const { tokenData } = tokenValidationResult.data!;
    const supabase = getSupabaseAdmin();
    
    if (!supabase) {
      AuthLogger.error('Failed to initialize Supabase client', null, { endpoint });
      return AuthErrorHandler.handleInternalError(new Error('Database connection failed'), endpoint);
    }

    AuthLogger.info('Token validated, retrieving user data', { endpoint });

    // Get user details
    const userLookupResult = await safeExecute(
      () => supabase.auth.admin.getUserById(tokenData!.userId),
      endpoint,
      AuthErrorType.DATABASE_ERROR
    );

    if (!userLookupResult.success) {
      return userLookupResult.error!;
    }

    const { data: user, error: userError } = userLookupResult.data!;
    
    if (userError || !user) {
      AuthLogger.error('User lookup failed', userError, { endpoint, userId: tokenData!.userId });
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    AuthLogger.info('User found, updating password', { endpoint, userId: tokenData!.userId });

    // Update user password
    const passwordUpdateResult = await safeExecute(
      () => supabase.auth.admin.updateUserById(
        tokenData!.userId,
        { password }
      ),
      endpoint,
      AuthErrorType.DATABASE_ERROR
    );

    if (!passwordUpdateResult.success) {
      return passwordUpdateResult.error!;
    }

    const { error: updateError } = passwordUpdateResult.data!;

    if (updateError) {
      AuthLogger.error('Password update failed', updateError, { endpoint, userId: tokenData!.userId });
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }

    // Mark token as used
    const markTokenResult = await safeExecute(
      () => markTokenAsUsed(tokenData!.id),
      endpoint,
      AuthErrorType.DATABASE_ERROR
    );

    if (!markTokenResult.success) {
      AuthLogger.warn('Failed to mark token as used, but password was updated', { 
        endpoint, 
        userId: tokenData!.userId,
        error: markTokenResult.error
      });
      // Don't fail the request since password was successfully updated
    } else {
      AuthLogger.info('Token marked as used successfully', { endpoint, userId: tokenData!.userId });
    }

    // Clean up all other tokens for this user
    try {
      const { error: cleanupError } = await supabase
        .from('password_reset_tokens')
        .delete()
        .eq('user_id', tokenData!.userId)
        .neq('id', tokenData!.id);

      if (cleanupError) {
        AuthLogger.warn('Error cleaning up other tokens', { 
          endpoint, 
          userId: tokenData!.userId,
          error: cleanupError 
        });
        // Don't fail the request since password was successfully updated
      } else {
        AuthLogger.info('Other tokens cleaned up successfully', { endpoint, userId: tokenData!.userId });
      }
    } catch (cleanupError) {
      AuthLogger.warn('Failed to cleanup other tokens, but password was updated', {
        endpoint,
        userId: tokenData!.userId,
        error: cleanupError
      });
      // Don't fail the request since password was successfully updated
    }

    AuthLogger.info('Password reset completed successfully', { 
      endpoint, 
      userId: tokenData!.userId, 
      userEmail: user.user?.email || 'unknown'
    });

    return NextResponse.json(
      { 
        message: 'Password has been successfully reset. You can now sign in with your new password.'
      },
      { status: 200 }
    );

  } catch (error) {
    AuthLogger.critical('Unexpected error in password reset', error, { endpoint });
    return AuthErrorHandler.handleInternalError(error, endpoint);
  }
}

// PATCH endpoint to invalidate token (optional, for security)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = verifyTokenSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid token format',
          details: validationResult.error.errors.map(e => e.message).join(', ')
        },
        { status: 400 }
      );
    }

    const { token } = validationResult.data;
    const tokenValidation = await validateToken(token);
    
    if (!tokenValidation.valid) {
      return NextResponse.json(
        { error: tokenValidation.error },
        { status: 400 }
      );
    }

    // Mark token as used to invalidate it
    await markTokenAsUsed(tokenValidation.tokenData!.id);

    console.info(`Password reset token invalidated: ${tokenValidation.tokenData!.id}`);

    return NextResponse.json(
      { message: 'Token has been invalidated' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Unexpected error in token invalidation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}