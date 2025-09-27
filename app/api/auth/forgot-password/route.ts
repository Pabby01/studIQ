import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';
import { AuthErrorHandler, AuthLogger, safeExecute, AuthErrorType } from '@/lib/auth-error-handler';

// Validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
});

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 3; // Max 3 requests per 15 minutes per email

// Token configuration
const TOKEN_EXPIRY_MINUTES = 15; // 15 minutes expiry
const TOKEN_LENGTH = 32; // 32 bytes = 256 bits

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory rate limiting (in production, use Redis or database)
const rateLimitMap = new Map<string, RateLimitEntry>();

function checkRateLimit(email: string): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(email);

  if (!entry || now > entry.resetTime) {
    // Reset or create new entry
    rateLimitMap.set(email, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, resetTime: entry.resetTime };
  }

  // Increment count
  entry.count++;
  rateLimitMap.set(email, entry);
  return { allowed: true };
}

function generateSecureToken(): { token: string; hash: string } {
  const token = randomBytes(TOKEN_LENGTH).toString('hex');
  const hash = createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

export async function POST(request: NextRequest) {
  const endpoint = '/api/auth/forgot-password';
  
  try {
    AuthLogger.info('Forgot password request initiated', { endpoint });

    // Parse and validate request body
    const parseResult = await safeExecute(
      () => request.json(),
      endpoint,
      AuthErrorType.VALIDATION_ERROR
    );

    if (!parseResult.success) {
      return parseResult.error!;
    }

    const validation = forgotPasswordSchema.safeParse(parseResult.data);
    
    if (!validation.success) {
      return AuthErrorHandler.handleValidationError(
        validation.error.errors[0]?.message || 'Invalid input',
        endpoint,
        validation.error.errors
      );
    }

    const { email } = validation.data;
    AuthLogger.info('Email validation successful', { endpoint, email });

    // Check rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    const rateLimitKey = `forgot_password_${clientIP}_${email}`;
    const now = Date.now();
    
    if (rateLimitMap.has(rateLimitKey)) {
      const entry = rateLimitMap.get(rateLimitKey)!;
      
      if (now < entry.resetTime) {
        if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
          AuthLogger.warn('Rate limit exceeded for forgot password', { 
            endpoint, 
            email, 
            clientIP, 
            attempts: entry.count 
          });
          return AuthErrorHandler.handleRateLimitError(endpoint, email);
        }
        entry.count++;
      } else {
        // Reset the counter
        entry.count = 1;
        entry.resetTime = now + RATE_LIMIT_WINDOW;
      }
    } else {
      rateLimitMap.set(rateLimitKey, {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW
      });
    }

    AuthLogger.info('Rate limit check passed', { endpoint, email, clientIP });

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      AuthLogger.error('Failed to initialize Supabase client', null, { endpoint });
      return AuthErrorHandler.handleInternalError(new Error('Database connection failed'), endpoint);
    }

    // Get user from auth system first
    // Retrieve user by querying the auth.users table directly
    const { data: authUsers, error: authError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', email)
      .single();

    const authUser = authUsers || null;

    if (authError) {
      AuthLogger.error('Error looking up auth user', { endpoint, email, error: authError });
      // Don't reveal if user exists or not for security
      return NextResponse.json(
        { 
          message: 'If an account with this email exists, you will receive password reset instructions.'
        },
        { status: 200 }
      );
    }
    if (!authUser) {
      AuthLogger.info('Password reset requested for non-existent email', { endpoint, email });
      // Don't reveal if user exists or not for security
      return NextResponse.json(
        { 
          message: 'If an account with this email exists, you will receive password reset instructions.'
        },
        { status: 200 }
      );
    }

    AuthLogger.info('User found for password reset', { endpoint, email, userId: authUser.id });

    // Generate secure token
    const { token, hash } = generateSecureToken();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

    AuthLogger.info('Generated password reset token', { 
      endpoint, 
      email, 
      userId: authUser.id,
      expiresAt: expiresAt.toISOString() 
    });

    // Clean up any existing tokens for this user
    const { error: cleanupError } = await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', authUser.id);

    if (cleanupError) {
      console.error('Error cleaning up existing tokens:', cleanupError);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    // Store token hash in database
    try {
      const { data: insertData, error: insertError } = await supabase
        .from('password_reset_tokens')
        .insert({
          user_id: authUser.id,
          token_hash: hash,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        return AuthErrorHandler.handleDatabaseError(insertError, endpoint, email);
      }

      AuthLogger.info('Password reset token stored successfully', { endpoint, email, userId: authUser.id });
    } catch (insertError) {
      AuthLogger.error('Failed to store password reset token', insertError, { endpoint, email, userId: authUser.id });
      return AuthErrorHandler.handleInternalError(new Error('Failed to store reset token'), endpoint);
    }

    // Send password reset email
    const { emailService } = await import('@/lib/email-service');
    
    try {
      await emailService.sendPasswordResetEmail(email, token);
      AuthLogger.info('Password reset email sent successfully', { endpoint, email, userId: authUser.id });
      
      return NextResponse.json(
        { 
          message: 'Password reset instructions have been sent to your email address.'
        },
        { status: 200 }
      );
    } catch (emailError) {
      AuthLogger.error('Failed to send password reset email', emailError, { endpoint, email, userId: authUser.id });
      
      // Even if email fails, don't reveal this to the user for security
      // But log the error for monitoring
      return NextResponse.json(
        { 
          message: 'Password reset instructions have been sent to your email address.'
        },
        { status: 200 }
      );
    }

  } catch (error) {
    AuthLogger.critical('Unexpected error in forgot password endpoint', error, { endpoint });
    return AuthErrorHandler.handleInternalError(error, endpoint);
  }
}

// Clean up expired tokens periodically
export async function DELETE() {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error('Failed to initialize Supabase client for token cleanup');
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }
    
    const { error } = await supabase.rpc('cleanup_expired_password_reset_tokens');
    
    if (error) {
      console.error('Error cleaning up expired tokens:', error);
      return NextResponse.json(
        { error: 'Failed to cleanup expired tokens' },
        { status: 500 }
      );
    }

    console.info('Successfully cleaned up expired password reset tokens');
    return NextResponse.json(
      { message: 'Expired tokens cleaned up successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Unexpected error in token cleanup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}