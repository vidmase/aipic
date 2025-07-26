'use client';

import * as Sentry from "@sentry/nextjs";
import React from "react";

export function initSentry() {
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

// Error boundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, { 
      extra: { 
        componentStack: errorInfo.componentStack
      },
      tags: {
        component: 'ErrorBoundary'
      }
    });
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return React.createElement(FallbackComponent, { error: this.state.error! });
    }

    return this.props.children;
  }
}

// Default error fallback component
function DefaultErrorFallback({ error }: { error: Error }) {
  return React.createElement(
    'div',
    { className: "min-h-screen flex items-center justify-center bg-gray-50" },
    React.createElement(
      'div',
      { className: "max-w-md w-full bg-white shadow-lg rounded-lg p-6" },
      React.createElement(
        'div',
        { className: "text-center" },
        React.createElement('div', { className: "text-red-500 text-6xl mb-4" }, "⚠️"),
        React.createElement(
          'h1',
          { className: "text-2xl font-bold text-gray-900 mb-4" },
          "Something went wrong"
        ),
        React.createElement(
          'p',
          { className: "text-gray-600 mb-6" },
          "We've encountered an unexpected error. Our team has been notified and is working on a fix."
        ),
        React.createElement(
          'div',
          { className: "space-y-3" },
          React.createElement(
            'button',
            {
              onClick: () => window.location.reload(),
              className: "w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
            },
            "Reload Page"
          ),
          React.createElement(
            'details',
            { className: "text-left" },
            React.createElement(
              'summary',
              { className: "cursor-pointer text-sm text-gray-500 hover:text-gray-700" },
              "Show error details"
            ),
            React.createElement(
              'div',
              { className: "mt-2 p-3 bg-gray-100 rounded text-xs font-mono" },
              error.message
            )
          )
        )
      )
    )
  );
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