# Deployment Troubleshooting Guide

## 502 Bad Gateway Error on Netlify

### Problem
Image editing and generation features work locally but fail with 502 errors on Netlify deployment.

### Root Cause
Netlify serverless functions have timeout limits:
- **Free plan**: 10 seconds
- **Pro/Business plan**: 26 seconds

AI image processing operations (especially with fal.ai) can take longer than these limits, causing timeouts.

### Solution Implemented

#### 1. Timeout Handling in API Routes
- Added timeout wrapper function that respects Netlify limits
- Graceful error handling with user-friendly messages
- Environment detection for appropriate timeout values

#### 2. Netlify Configuration Updates
```toml
# Function timeout and memory cannot be configured via netlify.toml
# These must be requested from Netlify support for paid plans

[[headers]]
  for = "/api/*"
  [headers.values]
    "Cache-Control" = "no-cache, no-store, must-revalidate"
    "X-Content-Type-Options" = "nosniff"
```

**Important**: Function timeout and memory allocation cannot be configured in `netlify.toml`. You need to:
1. Contact Netlify support to request timeout increase (up to 26 seconds for Pro plans)
2. The timeout fixes in the API code will still prevent 502 errors by handling timeouts gracefully

#### 3. Frontend Error Handling
- Specific error messages for timeout scenarios
- Network error detection and handling
- User guidance for retry strategies

### Environment Variables Required

Ensure these are set in your Netlify environment:

```bash
FAL_KEY=your-fal-ai-api-key
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Best Practices for Deployment

1. **Plan Upgrade**: Consider upgrading to Netlify Pro for longer timeout limits
2. **Error Monitoring**: Monitor function logs in Netlify dashboard
3. **Prompt Optimization**: Guide users to use simpler prompts for faster processing
4. **Retry Logic**: Implement exponential backoff for failed requests

### Testing the Fix

1. Deploy the updated code to Netlify
2. Test image editing with a simple prompt
3. Monitor function execution time in Netlify logs
4. Verify error messages are user-friendly when timeouts occur

### Alternative Solutions

If 502 errors persist:

1. **Background Processing**: Implement job queue system
2. **Webhooks**: Use fal.ai webhooks for async processing
3. **Direct Client Integration**: Process images client-side where possible
4. **CDN Optimization**: Use Netlify's CDN for faster image delivery

### Monitoring

Check these in Netlify dashboard:
- Function execution time
- Memory usage
- Error rates
- Timeout frequency

If functions consistently timeout, consider architectural changes or plan upgrades. 