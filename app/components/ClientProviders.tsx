"use client";

import { ReactNode } from 'react';
import { AppProvider } from '../contexts';

interface ClientProvidersProps {
  children: ReactNode;
}

/**
 * Client-side providers wrapper for Next.js App Router.
 * Wraps children with all context providers.
 */
export function ClientProviders({ children }: ClientProvidersProps) {
  return <AppProvider>{children}</AppProvider>;
}
