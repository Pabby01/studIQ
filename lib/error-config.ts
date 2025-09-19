import { ErrorType, ErrorSeverity } from './error-handler';

export interface ErrorConfig {
  enableLogging: boolean;
  enableUserFeedback: boolean;
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  enableReporting: boolean;
  reportingEndpoint?: string;
  enableDevelopmentDetails: boolean;
}

export const DEFAULT_ERROR_CONFIG: ErrorConfig = {
  enableLogging: true,
  enableUserFeedback: true,
  enableRetry: true,
  maxRetries: 3,
  retryDelay: 1000,
  enableReporting: process.env.NODE_ENV === 'production',
  reportingEndpoint: process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT,
  enableDevelopmentDetails: process.env.NODE_ENV === 'development',
};

export const ERROR_MESSAGES: Record<ErrorType, Record<ErrorSeverity, string>> = {
  [ErrorType.NETWORK]: {
    [ErrorSeverity.LOW]: 'Connection issue detected. Please check your internet connection.',
    [ErrorSeverity.MEDIUM]: 'Network error occurred. Retrying automatically...',
    [ErrorSeverity.HIGH]: 'Critical network failure. Please refresh the page.',
    [ErrorSeverity.CRITICAL]: 'Severe network error. Please contact support if this persists.',
  },
  [ErrorType.VALIDATION]: {
    [ErrorSeverity.LOW]: 'Please check your input and try again.',
    [ErrorSeverity.MEDIUM]: 'Invalid data provided. Please correct the highlighted fields.',
    [ErrorSeverity.HIGH]: 'Validation failed. Please review all required fields.',
    [ErrorSeverity.CRITICAL]: 'Critical validation error. Please contact support.',
  },
  [ErrorType.AUTHENTICATION]: {
    [ErrorSeverity.LOW]: 'Please sign in to continue.',
    [ErrorSeverity.MEDIUM]: 'Authentication required. Redirecting to login...',
    [ErrorSeverity.HIGH]: 'Session expired. Please sign in again.',
    [ErrorSeverity.CRITICAL]: 'Authentication system error. Please contact support.',
  },
  [ErrorType.AUTHORIZATION]: {
    [ErrorSeverity.LOW]: 'You don\'t have permission to perform this action.',
    [ErrorSeverity.MEDIUM]: 'Access denied. Please contact your administrator.',
    [ErrorSeverity.HIGH]: 'Insufficient permissions for this operation.',
    [ErrorSeverity.CRITICAL]: 'Critical authorization error. Please contact support.',
  },
  [ErrorType.API]: {
    [ErrorSeverity.LOW]: 'Service temporarily unavailable. Please try again.',
    [ErrorSeverity.MEDIUM]: 'API error occurred. Retrying automatically...',
    [ErrorSeverity.HIGH]: 'Service error. Please refresh the page.',
    [ErrorSeverity.CRITICAL]: 'Critical service failure. Please contact support.',
  },
  [ErrorType.DATABASE]: {
    [ErrorSeverity.LOW]: 'Data sync issue. Please try again.',
    [ErrorSeverity.MEDIUM]: 'Database connection error. Retrying...',
    [ErrorSeverity.HIGH]: 'Data storage error. Please refresh the page.',
    [ErrorSeverity.CRITICAL]: 'Critical database error. Please contact support.',
  },
  [ErrorType.FILE_UPLOAD]: {
    [ErrorSeverity.LOW]: 'File upload failed. Please try again.',
    [ErrorSeverity.MEDIUM]: 'Upload error. Please check file size and format.',
    [ErrorSeverity.HIGH]: 'File processing error. Please try a different file.',
    [ErrorSeverity.CRITICAL]: 'Critical upload system error. Please contact support.',
  },
  [ErrorType.PAYMENT]: {
    [ErrorSeverity.LOW]: 'Payment processing issue. Please try again.',
    [ErrorSeverity.MEDIUM]: 'Payment failed. Please check your payment method.',
    [ErrorSeverity.HIGH]: 'Transaction error. Please contact your bank.',
    [ErrorSeverity.CRITICAL]: 'Critical payment system error. Please contact support.',
  },
  [ErrorType.BLOCKCHAIN]: {
    [ErrorSeverity.LOW]: 'Blockchain network congestion. Please try again.',
    [ErrorSeverity.MEDIUM]: 'Transaction failed. Please check your wallet.',
    [ErrorSeverity.HIGH]: 'Blockchain connection error. Please refresh.',
    [ErrorSeverity.CRITICAL]: 'Critical blockchain error. Please contact support.',
  },
  [ErrorType.UNKNOWN]: {
    [ErrorSeverity.LOW]: 'Something went wrong. Please try again.',
    [ErrorSeverity.MEDIUM]: 'Unexpected error occurred. Retrying...',
    [ErrorSeverity.HIGH]: 'System error. Please refresh the page.',
    [ErrorSeverity.CRITICAL]: 'Critical system error. Please contact support.',
  },
};

export const RETRY_CONFIG = {
  [ErrorType.NETWORK]: { maxRetries: 3, delay: 1000, backoff: true },
  [ErrorType.API]: { maxRetries: 2, delay: 1500, backoff: true },
  [ErrorType.DATABASE]: { maxRetries: 2, delay: 2000, backoff: true },
  [ErrorType.BLOCKCHAIN]: { maxRetries: 1, delay: 3000, backoff: false },
  [ErrorType.FILE_UPLOAD]: { maxRetries: 1, delay: 1000, backoff: false },
  [ErrorType.PAYMENT]: { maxRetries: 0, delay: 0, backoff: false },
  [ErrorType.AUTHENTICATION]: { maxRetries: 0, delay: 0, backoff: false },
  [ErrorType.AUTHORIZATION]: { maxRetries: 0, delay: 0, backoff: false },
  [ErrorType.VALIDATION]: { maxRetries: 0, delay: 0, backoff: false },
  [ErrorType.UNKNOWN]: { maxRetries: 1, delay: 1000, backoff: false },
};

export function getErrorConfig(): ErrorConfig {
  return {
    ...DEFAULT_ERROR_CONFIG,
    // Override with environment-specific settings if needed
  };
}

export function shouldRetry(errorType: ErrorType, attempt: number): boolean {
  const config = RETRY_CONFIG[errorType];
  return attempt < config.maxRetries;
}

export function getRetryDelay(errorType: ErrorType, attempt: number): number {
  const config = RETRY_CONFIG[errorType];
  if (!config.backoff) {
    return config.delay;
  }
  return config.delay * Math.pow(2, attempt);
}