'use client';

import React from 'react';

interface ErrorBoundaryWrapperProps {
  children: React.ReactNode;
}

export function ErrorBoundaryWrapper({ children }: ErrorBoundaryWrapperProps) {
  // Temporarily disable Sentry error boundary to test if it's causing the issue
  return <>{children}</>;
} 