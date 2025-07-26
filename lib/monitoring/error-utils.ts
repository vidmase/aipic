import * as Sentry from "@sentry/nextjs";

export interface ErrorResponse {
  error: string;
  code: string;
  retryAfter?: number;
  details?: any;
}

export interface APIError extends Error {
  code?: string;
  statusCode?: number;
  retryAfter?: number;
}

// Error type definitions
export const ERROR_CODES = {
  GENERATION_TIMEOUT: 'GENERATION_TIMEOUT',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  INVALID_PROMPT: 'INVALID_PROMPT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  MODEL_UNAVAILABLE: 'MODEL_UNAVAILABLE',
  IMAGE_PROCESSING_ERROR: 'IMAGE_PROCESSING_ERROR',
  UPLOAD_ERROR: 'UPLOAD_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

// User-friendly error messages
const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.GENERATION_TIMEOUT]: 'Image generation is taking longer than expected. Please try with a simpler prompt or different settings.',
  [ERROR_CODES.QUOTA_EXCEEDED]: '🚨 Generation limit reached! Upgrade to Premium for unlimited access or wait for your quota to reset.',
  [ERROR_CODES.INVALID_PROMPT]: 'The prompt contains inappropriate content or formatting. Please revise and try again.',
  [ERROR_CODES.NETWORK_ERROR]: 'Network connection error. Please check your internet connection and try again.',
  [ERROR_CODES.AUTHENTICATION_ERROR]: 'Authentication failed. Please sign in again.',
  [ERROR_CODES.INTERNAL_ERROR]: 'An internal error occurred. Our team has been notified and is working on a fix.',
  [ERROR_CODES.MODEL_UNAVAILABLE]: 'The selected AI model is currently unavailable. Please try a different model.',
  [ERROR_CODES.IMAGE_PROCESSING_ERROR]: 'Failed to process the image. Please try again with a different image.',
  [ERROR_CODES.UPLOAD_ERROR]: 'Failed to upload the image. Please check the file format and size.',
  [ERROR_CODES.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.'
};

/**
 * Convert technical errors to user-friendly messages
 */
export function getUserFriendlyError(error: Error | APIError): ErrorResponse {
  let errorCode: keyof typeof ERROR_CODES = 'UNKNOWN_ERROR';
  let statusCode = 500;
  let retryAfter: number | undefined;

  // Classify error based on message content
  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    errorCode = 'GENERATION_TIMEOUT';
    statusCode = 408;
    retryAfter = 60;
  } else if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
    errorCode = 'QUOTA_EXCEEDED';
    statusCode = 429;
  } else if (errorMessage.includes('prompt') || errorMessage.includes('inappropriate')) {
    errorCode = 'INVALID_PROMPT';
    statusCode = 400;
  } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    errorCode = 'NETWORK_ERROR';
    statusCode = 503;
    retryAfter = 30;
  } else if (errorMessage.includes('auth') || errorMessage.includes('unauthorized')) {
    errorCode = 'AUTHENTICATION_ERROR';
    statusCode = 401;
  } else if (errorMessage.includes('model') || errorMessage.includes('unavailable')) {
    errorCode = 'MODEL_UNAVAILABLE';
    statusCode = 503;
    retryAfter = 300;
  } else if (errorMessage.includes('image') || errorMessage.includes('processing')) {
    errorCode = 'IMAGE_PROCESSING_ERROR';
    statusCode = 422;
  } else if (errorMessage.includes('upload') || errorMessage.includes('file')) {
    errorCode = 'UPLOAD_ERROR';
    statusCode = 400;
  }

  // Use error-specific code and status if available
  if ('code' in error && error.code && error.code in ERROR_CODES) {
    errorCode = error.code as keyof typeof ERROR_CODES;
  }
  if ('statusCode' in error && error.statusCode) {
    statusCode = error.statusCode;
  }
  if ('retryAfter' in error && error.retryAfter) {
    retryAfter = error.retryAfter;
  }

  return {
    error: ERROR_MESSAGES[ERROR_CODES[errorCode]] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
    code: ERROR_CODES[errorCode],
    retryAfter,
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  };
}

/**
 * Enhanced error logging with context
 */
export function logError(
  error: Error,
  context: {
    endpoint?: string;
    userId?: string;
    userTier?: string;
    model?: string;
    prompt?: string;
    [key: string]: any;
  }
) {
  // Log to Sentry with context
  Sentry.captureException(error, {
    tags: {
      endpoint: context.endpoint,
      model: context.model,
      user_tier: context.userTier
    },
    extra: {
      prompt: context.prompt,
      timestamp: new Date().toISOString(),
      ...context
    },
    user: context.userId ? { id: context.userId } : undefined
  });

  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error occurred:', {
      error: error.message,
      stack: error.stack,
      context
    });
  }
}

/**
 * Create standardized API error response
 */
export function createErrorResponse(
  error: Error | APIError,
  context: any = {}
): Response {
  const errorResponse = getUserFriendlyError(error);
  
  // Log the error with context
  logError(error, context);

  const statusCode = ('statusCode' in error && error.statusCode) || 500;

  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };

  if (errorResponse.retryAfter) {
    headers['Retry-After'] = errorResponse.retryAfter.toString();
  }

  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers
  });
}

/**
 * Wrap async functions with error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: Partial<{ endpoint: string; [key: string]: any }> = {}
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error as Error, context);
      throw error;
    }
  };
} 