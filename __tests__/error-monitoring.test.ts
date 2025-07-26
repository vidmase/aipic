import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { getUserFriendlyError, logError, createErrorResponse, ERROR_CODES } from '@/lib/monitoring/error-utils';

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  captureFeedback: jest.fn(),
  init: jest.fn(),
}));

describe('Error Monitoring System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserFriendlyError', () => {
    test('should classify timeout errors correctly', () => {
      const error = new Error('Request timed out');
      const result = getUserFriendlyError(error);
      
      expect(result.code).toBe(ERROR_CODES.GENERATION_TIMEOUT);
      expect(result.error).toContain('taking longer than expected');
      expect(result.retryAfter).toBe(60);
    });

    test('should classify quota errors correctly', () => {
      const error = new Error('Quota limit exceeded');
      const result = getUserFriendlyError(error);
      
      expect(result.code).toBe(ERROR_CODES.QUOTA_EXCEEDED);
      expect(result.error).toContain('generation limit');
    });

    test('should classify prompt errors correctly', () => {
      const error = new Error('Inappropriate prompt content');
      const result = getUserFriendlyError(error);
      
      expect(result.code).toBe(ERROR_CODES.INVALID_PROMPT);
      expect(result.error).toContain('inappropriate content');
    });

    test('should classify network errors correctly', () => {
      const error = new Error('Network connection failed');
      const result = getUserFriendlyError(error);
      
      expect(result.code).toBe(ERROR_CODES.NETWORK_ERROR);
      expect(result.error).toContain('Network connection error');
      expect(result.retryAfter).toBe(30);
    });

    test('should classify authentication errors correctly', () => {
      const error = new Error('Unauthorized access');
      const result = getUserFriendlyError(error);
      
      expect(result.code).toBe(ERROR_CODES.AUTHENTICATION_ERROR);
      expect(result.error).toContain('Authentication failed');
    });

    test('should handle unknown errors with fallback', () => {
      const error = new Error('Unknown error occurred');
      const result = getUserFriendlyError(error);
      
      expect(result.code).toBe(ERROR_CODES.UNKNOWN_ERROR);
      expect(result.error).toContain('unexpected error');
    });

    test('should include error details in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Test error');
      const result = getUserFriendlyError(error);
      
      expect(result.details).toBe('Test error');
      
      process.env.NODE_ENV = originalEnv;
    });

    test('should exclude error details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Test error');
      const result = getUserFriendlyError(error);
      
      expect(result.details).toBeUndefined();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('logError', () => {
    test('should log errors to Sentry with context', () => {
      const mockCaptureException = jest.requireMock('@sentry/nextjs').captureException;
      
      const error = new Error('Test error');
      const context = {
        endpoint: 'generate-image',
        userId: 'user123',
        model: 'test-model',
        prompt: 'test prompt'
      };
      
      logError(error, context);
      
      expect(mockCaptureException).toHaveBeenCalledWith(error, {
        tags: {
          endpoint: 'generate-image',
          model: 'test-model',
          user_tier: undefined
        },
        extra: {
          prompt: 'test prompt',
          timestamp: expect.any(String),
          ...context
        },
        user: { id: 'user123' }
      });
    });

    test('should handle missing userId gracefully', () => {
      const mockCaptureException = jest.requireMock('@sentry/nextjs').captureException;
      
      const error = new Error('Test error');
      const context = {
        endpoint: 'generate-image',
        model: 'test-model'
      };
      
      logError(error, context);
      
      expect(mockCaptureException).toHaveBeenCalledWith(error, {
        tags: {
          endpoint: 'generate-image',
          model: 'test-model',
          user_tier: undefined
        },
        extra: {
          timestamp: expect.any(String),
          ...context
        },
        user: undefined
      });
    });
  });

  describe('createErrorResponse', () => {
    test('should create proper error response with correct status code', () => {
      const error = new Error('Test error');
      (error as any).statusCode = 400;
      
      const response = createErrorResponse(error, {
        endpoint: 'test-endpoint',
        userId: 'user123'
      });
      
      expect(response.status).toBe(400);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    test('should include retry-after header when specified', async () => {
      const error = new Error('Generation timeout');
      
      const response = createErrorResponse(error, {
        endpoint: 'generate-image'
      });
      
      const responseBody = await response.json();
      
      if (responseBody.retryAfter) {
        expect(response.headers.get('Retry-After')).toBe(responseBody.retryAfter.toString());
      }
    });

    test('should default to 500 status code for unknown errors', () => {
      const error = new Error('Unknown error');
      
      const response = createErrorResponse(error, {});
      
      expect(response.status).toBe(500);
    });
  });

  describe('Error Classification', () => {
    test('should handle case-insensitive error messages', () => {
      const error = new Error('REQUEST TIMED OUT');
      const result = getUserFriendlyError(error);
      
      expect(result.code).toBe(ERROR_CODES.GENERATION_TIMEOUT);
    });

    test('should handle partial error message matches', () => {
      const error = new Error('The request has timed out after 30 seconds');
      const result = getUserFriendlyError(error);
      
      expect(result.code).toBe(ERROR_CODES.GENERATION_TIMEOUT);
    });

    test('should prioritize specific error codes when provided', () => {
      const error = new Error('Test error') as any;
      error.code = ERROR_CODES.MODEL_UNAVAILABLE;
      error.statusCode = 503;
      
      const result = getUserFriendlyError(error);
      
      expect(result.code).toBe(ERROR_CODES.MODEL_UNAVAILABLE);
    });
  });
}); 