/**
 * Centralized logging utility
 * In production, these could be sent to a logging service
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  /** Debug logs - only in development */
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.log('[DEBUG]', ...args);
    }
  },

  /** Info logs */
  info: (...args: unknown[]) => {
    if (isDev) {
      console.log('[INFO]', ...args);
    }
  },

  /** Warning logs - always shown */
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args);
  },

  /** Error logs - always shown */
  error: (message: string, error?: unknown) => {
    console.error('[ERROR]', message, error);
    
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production' && error instanceof Error) {
      // TODO: Send to Sentry, LogRocket, etc.
      // captureException(error);
    }
  },

  /** API request logging */
  api: (method: string, path: string, duration?: number) => {
    if (isDev) {
      const durationStr = duration ? ` (${duration}ms)` : '';
      console.log(`[API] ${method} ${path}${durationStr}`);
    }
  },
};
