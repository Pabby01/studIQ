/**
 * Comprehensive Error Handling Utility for StudiQ
 * Provides standardized error handling, logging, and user feedback
 */

import { toast } from '@/hooks/use-toast';

// Error types for categorization
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  DATABASE = 'DATABASE',
  FILE_UPLOAD = 'FILE_UPLOAD',
  PAYMENT = 'PAYMENT',
  API = 'API',
  BLOCKCHAIN = 'BLOCKCHAIN',
  UNKNOWN = 'UNKNOWN'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Structured error interface
export interface AppError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  code?: string;
  details?: any;
  timestamp: Date;
  context?: string;
}

// Error handler class
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: AppError[] = [];

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Main error handling method
  public handleError(error: any, context?: string): AppError {
    const appError = this.parseError(error, context);
    this.logError(appError);
    this.showUserFeedback(appError);
    return appError;
  }

  // Parse different error types into structured format
  public parseError(error: any, context?: string): AppError {
    const timestamp = new Date();

    // Handle fetch/network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: error.message,
        userMessage: 'Network connection failed. Please check your internet connection.',
        timestamp,
        context
      };
    }

    // Handle HTTP response errors
    if (error.status) {
      switch (error.status) {
        case 401:
          return {
            type: ErrorType.AUTHENTICATION,
            severity: ErrorSeverity.HIGH,
            message: error.message || 'Authentication failed',
            userMessage: 'Please log in again to continue.',
            code: '401',
            timestamp,
            context
          };
        case 403:
          return {
            type: ErrorType.AUTHORIZATION,
            severity: ErrorSeverity.HIGH,
            message: error.message || 'Access denied',
            userMessage: 'You don\'t have permission to perform this action.',
            code: '403',
            timestamp,
            context
          };
        case 400:
          return {
            type: ErrorType.VALIDATION,
            severity: ErrorSeverity.MEDIUM,
            message: error.message || 'Invalid request',
            userMessage: 'Please check your input and try again.',
            code: '400',
            timestamp,
            context
          };
        case 500:
          return {
            type: ErrorType.DATABASE,
            severity: ErrorSeverity.CRITICAL,
            message: error.message || 'Server error',
            userMessage: 'Something went wrong on our end. Please try again later.',
            code: '500',
            timestamp,
            context
          };
      }
    }

    // Handle validation errors (Zod)
    if (error.name === 'ZodError') {
      return {
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        message: 'Validation failed',
        userMessage: 'Please check your input and try again.',
        details: error.errors,
        timestamp,
        context
      };
    }

    // Handle file upload errors
    if (context?.includes('upload') || error.message?.includes('upload')) {
      return {
        type: ErrorType.FILE_UPLOAD,
        severity: ErrorSeverity.MEDIUM,
        message: error.message || 'File upload failed',
        userMessage: 'Failed to upload file. Please try again with a different file.',
        timestamp,
        context
      };
    }

    // Handle payment/transaction errors
    if (context?.includes('payment') || context?.includes('transaction')) {
      return {
        type: ErrorType.PAYMENT,
        severity: ErrorSeverity.HIGH,
        message: error.message || 'Payment failed',
        userMessage: 'Transaction failed. Please check your wallet and try again.',
        timestamp,
        context
      };
    }

    // Default unknown error
    return {
      type: ErrorType.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      message: error.message || 'Unknown error occurred',
      userMessage: 'Something went wrong. Please try again.',
      timestamp,
      context
    };
  }

  // Log error for debugging and monitoring
  private logError(error: AppError): void {
    // Add to in-memory log
    this.errorLog.push(error);
    
    // Keep only last 100 errors to prevent memory issues
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-100);
    }

    // Console logging with appropriate level
    const logMessage = `[${error.type}] ${error.message}`;
    const logDetails = {
      severity: error.severity,
      context: error.context,
      timestamp: error.timestamp,
      details: error.details
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error(logMessage, logDetails);
        break;
      case ErrorSeverity.HIGH:
        console.error(logMessage, logDetails);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(logMessage, logDetails);
        break;
      case ErrorSeverity.LOW:
        console.info(logMessage, logDetails);
        break;
    }

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production' && error.severity === ErrorSeverity.CRITICAL) {
      this.sendToMonitoring(error);
    }
  }

  // Show appropriate user feedback
  private showUserFeedback(error: AppError): void {
    const variant = error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH 
      ? 'destructive' 
      : 'default';

    toast({
      title: this.getErrorTitle(error.type),
      description: error.userMessage,
      variant: variant as any
    });
  }

  // Get user-friendly error titles
  private getErrorTitle(type: ErrorType): string {
    switch (type) {
      case ErrorType.NETWORK:
        return 'Connection Error';
      case ErrorType.AUTHENTICATION:
        return 'Authentication Required';
      case ErrorType.AUTHORIZATION:
        return 'Access Denied';
      case ErrorType.VALIDATION:
        return 'Invalid Input';
      case ErrorType.DATABASE:
        return 'Server Error';
      case ErrorType.FILE_UPLOAD:
        return 'Upload Failed';
      case ErrorType.PAYMENT:
        return 'Transaction Failed';
      default:
        return 'Error';
    }
  }

  // Send critical errors to monitoring service
  private sendToMonitoring(error: AppError): void {
    // Implement monitoring service integration (e.g., Sentry, LogRocket)
    // This is a placeholder for production monitoring
    console.error('CRITICAL ERROR - Send to monitoring:', error);
  }

  // Get recent errors for debugging
  public getRecentErrors(count: number = 10): AppError[] {
    return this.errorLog.slice(-count);
  }

  // Clear error log
  public clearErrorLog(): void {
    this.errorLog = [];
  }
}

// Utility functions for common error handling patterns

// Async operation wrapper with error handling
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context?: string,
  fallback?: T
): Promise<{ success: boolean; data?: T; error?: AppError }> {
  const errorHandler = ErrorHandler.getInstance();
  
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const appError = errorHandler.handleError(error, context);
    return { success: false, error: appError, data: fallback };
  }
}

// API call wrapper with standardized error handling
export async function apiCall<T>(
  url: string,
  options: RequestInit = {},
  context?: string
): Promise<{ success: boolean; data?: T; error?: AppError }> {
  const errorHandler = ErrorHandler.getInstance();
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        message: errorData.error || `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    const appError = errorHandler.handleError(error, context || `API call to ${url}`);
    return { success: false, error: appError };
  }
}

// Form validation wrapper
export function validateForm<T>(
  data: any,
  schema: any,
  context?: string
): { success: boolean; data?: T; error?: AppError } {
  const errorHandler = ErrorHandler.getInstance();
  
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    const appError = errorHandler.handleError(error, context || 'Form validation');
    return { success: false, error: appError };
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Aliases for backward compatibility
export const handleAsyncOperation = safeAsync;
export const handleApiCall = apiCall;