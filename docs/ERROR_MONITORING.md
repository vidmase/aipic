# Error Monitoring System

## Overview

This document describes the comprehensive error monitoring system implemented for the AI Image Studio platform. The system provides real-time error tracking, user-friendly error messages, and detailed analytics for debugging and improving user experience.

## Architecture

### Components

1. **Sentry Integration** (`/lib/monitoring/sentry.ts`)
   - Error boundary component for React errors
   - Sentry initialization and configuration
   - User feedback collection

2. **Error Utilities** (`/lib/monitoring/error-utils.ts`)
   - Error classification and mapping
   - User-friendly error message generation
   - Standardized API error responses
   - Context-aware error logging

3. **Error Feedback Dialog** (`/components/ui/error-feedback-dialog.tsx`)
   - User interface for reporting errors
   - Direct integration with Sentry feedback API

## Features

### Error Classification

The system automatically classifies errors into specific types:

- **GENERATION_TIMEOUT**: Image generation taking too long
- **QUOTA_EXCEEDED**: User has reached generation limits
- **INVALID_PROMPT**: Prompt content issues
- **NETWORK_ERROR**: Connection problems
- **AUTHENTICATION_ERROR**: User authentication failures
- **MODEL_UNAVAILABLE**: AI model is temporarily unavailable
- **IMAGE_PROCESSING_ERROR**: Image upload/processing failures
- **INTERNAL_ERROR**: Server-side errors
- **UNKNOWN_ERROR**: Fallback for unclassified errors

### User-Friendly Messages

Each error type has corresponding user-friendly messages:

```typescript
const ERROR_MESSAGES = {
  GENERATION_TIMEOUT: 'Image generation is taking longer than expected. Please try with a simpler prompt or different settings.',
  QUOTA_EXCEEDED: 'You have reached your generation limit. Please upgrade your plan or wait for the quota to reset.',
  // ... more messages
};
```

### Retry Logic

Certain errors include automatic retry suggestions:

- **Timeout errors**: 60-second retry delay
- **Network errors**: 30-second retry delay  
- **Model unavailable**: 5-minute retry delay

## Implementation

### 1. API Error Handling

Enhanced API routes now use standardized error handling:

```typescript
import { createErrorResponse, ERROR_CODES } from '@/lib/monitoring/error-utils';

export async function POST(request: NextRequest) {
  try {
    // API logic...
  } catch (error) {
    return createErrorResponse(error as Error, {
      endpoint: 'generate-image',
      userId: user?.id,
      model: requestBody?.model,
      prompt: requestBody?.prompt
    });
  }
}
```

### 2. React Error Boundaries

The application is wrapped with error boundaries to catch React component errors:

```typescript
import { ErrorBoundary } from '@/lib/monitoring/sentry';

// In layout.tsx
<ErrorBoundary>
  <YourApp />
</ErrorBoundary>
```

### 3. User Feedback Collection

Users can report errors directly through the feedback dialog:

```typescript
import { ErrorFeedbackDialog } from '@/components/ui/error-feedback-dialog';

<ErrorFeedbackDialog error={error}>
  <Button variant="outline">Report Issue</Button>
</ErrorFeedbackDialog>
```

## Configuration

### Environment Variables

Add to your `.env.local` file:

```bash
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
```

### Sentry Setup

1. Create a Sentry account and project
2. Copy the DSN from your Sentry dashboard
3. Add the DSN to your environment variables
4. The system automatically initializes Sentry on app startup

## Error Response Format

All API errors follow a consistent format:

```typescript
interface ErrorResponse {
  error: string;        // User-friendly message
  code: string;         // Error classification code
  retryAfter?: number;  // Seconds to wait before retry
  details?: any;        // Technical details (dev only)
}
```

Example response:

```json
{
  "error": "Image generation is taking longer than expected. Please try with a simpler prompt or different settings.",
  "code": "GENERATION_TIMEOUT",
  "retryAfter": 60
}
```

## Monitoring & Analytics

### Sentry Dashboard

Monitor errors in real-time through the Sentry dashboard:

- Error frequency and trends
- User impact analysis
- Performance monitoring
- Release health tracking

### Custom Events

Log custom events for additional insights:

```typescript
import { captureEvent } from '@/lib/monitoring/sentry';

captureEvent('Image generation started', 'info', {
  model: 'flux-pro',
  userTier: 'premium'
});
```

## Testing

Run the error monitoring tests:

```bash
npm test __tests__/error-monitoring.test.ts
```

Tests cover:
- Error classification accuracy
- User-friendly message generation
- Sentry integration
- API response formatting

## Development vs Production

### Development Mode
- Includes technical error details in responses
- Console logging enabled
- Full error stack traces

### Production Mode
- Sanitized error messages only
- Error details filtered out
- Optimized Sentry sampling (10%)

## Best Practices

### 1. Error Context

Always provide context when logging errors:

```typescript
logError(error, {
  endpoint: 'generate-image',
  userId: user.id,
  model: selectedModel,
  prompt: userPrompt
});
```

### 2. Graceful Degradation

Design UI to handle errors gracefully:

```typescript
if (isError) {
  return <ErrorState onRetry={handleRetry} />;
}
```

### 3. User Communication

Use clear, actionable error messages:

✅ "Image generation failed. Please try again or use a simpler prompt."
❌ "Error 500: Internal server error"

## Troubleshooting

### Common Issues

1. **Sentry not capturing errors**
   - Verify DSN is correctly set
   - Check Sentry project configuration
   - Ensure error boundary is properly wrapped

2. **Error messages not user-friendly**
   - Check error classification logic
   - Verify error message mappings
   - Test with various error scenarios

3. **Missing error context**
   - Ensure context is passed to error handlers
   - Check user authentication state
   - Verify request body parsing

## Future Enhancements

1. **Error Analytics Dashboard**
   - Custom analytics for error patterns
   - User impact metrics
   - Model-specific error rates

2. **Automatic Recovery**
   - Auto-retry for transient errors
   - Fallback model selection
   - Progressive error handling

3. **Proactive Monitoring**
   - Performance degradation alerts
   - Quota utilization warnings
   - Model availability monitoring

## Support

For issues with the error monitoring system:

1. Check Sentry dashboard for recent errors
2. Review application logs
3. Test error scenarios in development
4. Contact the development team with error IDs from Sentry 