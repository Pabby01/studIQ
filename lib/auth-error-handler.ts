import { NextResponse } from 'next/server';

// Error types for authentication
export enum AuthErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EMAIL_ERROR = 'EMAIL_ERROR',
  TOKEN_ERROR = 'TOKEN_ERROR',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Error details interface
export interface AuthError {
  type: AuthErrorType;
  message: string;
  userMessage: string;
  statusCode: number;
  severity: ErrorSeverity;
  details?: any;
  timestamp: string;
  endpoint: string;
  userId?: string;
  email?: string;
}

// Error mapping configuration
const ERROR_CONFIG: Record<AuthErrorType, {
  statusCode: number;
  userMessage: string;
  severity: ErrorSeverity;
}> = {
  [AuthErrorType.VALIDATION_ERROR]: {
    statusCode: 400,
    userMessage: 'Please check your input and try again.',
    severity: ErrorSeverity.LOW
  },
  [AuthErrorType.RATE_LIMIT_ERROR]: {
    statusCode: 429,
    userMessage: 'Too many requests. Please try again later.',
    severity: ErrorSeverity.MEDIUM
  },
  [AuthErrorType.DATABASE_ERROR]: {
    statusCode: 500,
    userMessage: 'A temporary issue occurred. Please try again.',
    severity: ErrorSeverity.HIGH
  },
  [AuthErrorType.EMAIL_ERROR]: {
    statusCode: 500,
    userMessage: 'Failed to send email. Please try again or contact support.',
    severity: ErrorSeverity.HIGH
  },
  [AuthErrorType.TOKEN_ERROR]: {
    statusCode: 400,
    userMessage: 'Invalid or malformed token.',
    severity: ErrorSeverity.MEDIUM
  },
  [AuthErrorType.USER_NOT_FOUND]: {
    statusCode: 404,
    userMessage: 'No account found with this email address.',
    severity: ErrorSeverity.LOW
  },
  [AuthErrorType.INVALID_CREDENTIALS]: {
    statusCode: 401,
    userMessage: 'Invalid email or password.',
    severity: ErrorSeverity.LOW
  },
  [AuthErrorType.EXPIRED_TOKEN]: {
    statusCode: 400,
    userMessage: 'This reset link has expired. Please request a new one.',
    severity: ErrorSeverity.LOW
  },
  [AuthErrorType.NETWORK_ERROR]: {
    statusCode: 503,
    userMessage: 'Network error. Please check your connection and try again.',
    severity: ErrorSeverity.MEDIUM
  },
  [AuthErrorType.INTERNAL_ERROR]: {
    statusCode: 500,
    userMessage: 'An unexpected error occurred. Please try again.',
    severity: ErrorSeverity.CRITICAL
  }
};

// Logger class for structured logging
export class AuthLogger {
  private static formatLog(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const logData = data ? ` | Data: ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] ${message}${logData}`;
  }

  static info(message: string, data?: any): void {
    console.log(this.formatLog('INFO', message, data));
  }

  static warn(message: string, data?: any): void {
    console.warn(this.formatLog('WARN', message, data));
  }

  static error(message: string, error?: any, data?: any): void {
    const errorData = {
      ...data,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    };
    console.error(this.formatLog('ERROR', message, errorData));
  }

  static critical(message: string, error?: any, data?: any): void {
    const errorData = {
      ...data,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error
    };
    console.error(this.formatLog('CRITICAL', message, errorData));
    
    // In production, you might want to send critical errors to an external service
    // await sendToErrorTrackingService(errorData);
  }
}

// Main error handler class
export class AuthErrorHandler {
  static createError(
    type: AuthErrorType,
    endpoint: string,
    originalMessage?: string,
    details?: any,
    userId?: string,
    email?: string
  ): AuthError {
    const config = ERROR_CONFIG[type];
    const timestamp = new Date().toISOString();

    return {
      type,
      message: originalMessage || config.userMessage,
      userMessage: config.userMessage,
      statusCode: config.statusCode,
      severity: config.severity,
      details,
      timestamp,
      endpoint,
      userId,
      email
    };
  }

  static handleError(error: AuthError): NextResponse {
    // Log the error based on severity
    const logData = {
      type: error.type,
      endpoint: error.endpoint,
      userId: error.userId,
      email: error.email,
      details: error.details
    };

    switch (error.severity) {
      case ErrorSeverity.LOW:
        AuthLogger.info(`Auth error: ${error.message}`, logData);
        break;
      case ErrorSeverity.MEDIUM:
        AuthLogger.warn(`Auth warning: ${error.message}`, logData);
        break;
      case ErrorSeverity.HIGH:
        AuthLogger.error(`Auth error: ${error.message}`, error.details, logData);
        break;
      case ErrorSeverity.CRITICAL:
        AuthLogger.critical(`Critical auth error: ${error.message}`, error.details, logData);
        break;
    }

    // Return appropriate response
    return NextResponse.json(
      {
        error: error.userMessage,
        type: error.type,
        timestamp: error.timestamp
      },
      { status: error.statusCode }
    );
  }

  static handleDatabaseError(error: any, endpoint: string, email?: string): NextResponse {
    const authError = this.createError(
      AuthErrorType.DATABASE_ERROR,
      endpoint,
      `Database operation failed: ${error.message}`,
      error,
      undefined,
      email
    );
    return this.handleError(authError);
  }

  static handleValidationError(message: string, endpoint: string, details?: any): NextResponse {
    const authError = this.createError(
      AuthErrorType.VALIDATION_ERROR,
      endpoint,
      message,
      details
    );
    return this.handleError(authError);
  }

  static handleRateLimitError(endpoint: string, email?: string): NextResponse {
    const authError = this.createError(
      AuthErrorType.RATE_LIMIT_ERROR,
      endpoint,
      undefined,
      undefined,
      undefined,
      email
    );
    return this.handleError(authError);
  }

  static handleEmailError(error: any, endpoint: string, email?: string): NextResponse {
    const authError = this.createError(
      AuthErrorType.EMAIL_ERROR,
      endpoint,
      `Email service error: ${error.message}`,
      error,
      undefined,
      email
    );
    return this.handleError(authError);
  }

  static handleTokenError(message: string, endpoint: string, token?: string): NextResponse {
    const authError = this.createError(
      AuthErrorType.TOKEN_ERROR,
      endpoint,
      message,
      { tokenLength: token?.length }
    );
    return this.handleError(authError);
  }

  static handleUserNotFound(endpoint: string, email?: string): NextResponse {
    const authError = this.createError(
      AuthErrorType.USER_NOT_FOUND,
      endpoint,
      undefined,
      undefined,
      undefined,
      email
    );
    return this.handleError(authError);
  }

  static handleExpiredToken(endpoint: string, email?: string): NextResponse {
    const authError = this.createError(
      AuthErrorType.EXPIRED_TOKEN,
      endpoint,
      undefined,
      undefined,
      undefined,
      email
    );
    return this.handleError(authError);
  }

  static handleInternalError(error: any, endpoint: string): NextResponse {
    const authError = this.createError(
      AuthErrorType.INTERNAL_ERROR,
      endpoint,
      `Internal server error: ${error.message}`,
      error
    );
    return this.handleError(authError);
  }
}

// Utility function to safely execute async operations with error handling
export async function safeExecute<T>(
  operation: () => Promise<T>,
  endpoint: string,
  errorType: AuthErrorType = AuthErrorType.INTERNAL_ERROR
): Promise<{ success: boolean; data?: T; error?: NextResponse }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const authError = AuthErrorHandler.createError(
      errorType,
      endpoint,
      error instanceof Error ? error.message : 'Unknown error',
      error
    );
    return { 
      success: false, 
      error: AuthErrorHandler.handleError(authError) 
    };
  }
}