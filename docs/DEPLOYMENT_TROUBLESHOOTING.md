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

## Vercel Deployment

Similar to Netlify, Vercel serverless functions have execution timeouts that can affect long-running AI image processing tasks.

### Vercel Timeout Limits
- **Hobby plan**: 10 seconds
- **Pro plan**: 60 seconds
- **Enterprise plan**: 900 seconds

The 10-second limit on the Hobby plan is very likely to be exceeded by image generation and editing APIs, leading to errors.

### Configuration for Vercel

A `vercel.json` file has been added to the project root to ensure smooth deployment on Vercel. This file configures:
- **Install Command**: Sets the package installation command to `npm ci --legacy-peer-deps` to handle peer dependency resolution correctly.
- **Environment Variables**: Includes necessary environment variables for the `sharp` image processing library.

```json
{
  "builds": [
    {
      "src": "next.config.js",
      "use": "@vercel/next",
      "config": {
        "installCommand": "npm ci --legacy-peer-deps"
      }
    }
  ],
  "env": {
    "SHARP_IGNORE_GLOBAL_LIBVIPS": "1",
    "SHARP_FORCE_GLOBAL_LIBVIPS": "false"
  }
}
```

### Best Practices for Vercel

1.  **Plan Upgrade**: For reliable image generation, it is highly recommended to use the **Pro plan** on Vercel to get a 60-second function timeout.
2.  **Environment Variables**: Ensure the same environment variables listed for Netlify are also set in your Vercel project settings.
3.  **Monitoring**: Use the Vercel dashboard to monitor function logs, execution times, and error rates.

## Image Fetching Issues (API Works but Images Don't Display)

### Symptoms
- API returns 200 status and successful response
- Images don't appear in the frontend after editing
- Console shows successful API response but images fail to load

### Debugging Steps

1. **Check Console Logs** - Added comprehensive logging:
   ```javascript
   console.log('Edit Image API Response:', { status: response.status, data })
   console.log('Successfully received edited image URL:', data.image.image_url)
   console.log('Image loaded successfully:', img.src)
   console.error('Image failed to load:', img.src)
   ```

2. **Visual Debug Panel** (Development Mode):
   - Shows original/edited image status
   - Shows current mode and before/after state
   - Visible in top-left corner when in edit mode

3. **Check Network Tab**:
   - Verify API call succeeds (200 status)
   - Check if image URL requests fail
   - Look for CORS errors or 403/404 responses

### Common Causes & Solutions

1. **CORS Issues** - fal.ai URLs may have CORS restrictions
   - Solution: Implement image proxy through your domain
   
2. **CDN/Cache Issues** - Images may be cached incorrectly
   - Solution: Add cache-busting parameters or headers
   
3. **Network Timeouts** - Large images may fail to load
   - Solution: Add loading states and retry logic
   
4. **URL Format Issues** - Check if URLs are properly formatted
   - Solution: Validate and sanitize URLs before use

### Implementation Notes

The debugging code includes:
- Response structure validation
- Image load/error event handlers  
- Visual debug panel for development
- Comprehensive console logging

This should help identify exactly where the image fetching fails. 