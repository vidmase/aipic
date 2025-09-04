import * as Sentry from "@sentry/nextjs";

export function initSentryServer() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      // Filter sensitive data
      if (event.user) {
        delete event.user.email;
      }
      return event;
    },
  });
}

// Utility function for capturing custom events
export function captureEvent(message: string, level: Sentry.SeverityLevel = 'info', extra?: any) {
  Sentry.captureMessage(message, {
    level,
    extra,
    tags: {
      source: 'custom_event'
    }
  });
}

// User feedback function
export function captureUserFeedback(email: string, name: string, comments: string) {
  Sentry.captureFeedback({
    email,
    name,
    message: comments
  });
} 