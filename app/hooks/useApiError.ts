'use client';

import { useState, useCallback } from 'react';
import { logger } from '../utils/logger';

interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

interface UseApiErrorReturn {
  error: ApiError | null;
  setError: (error: ApiError | null) => void;
  clearError: () => void;
  handleError: (err: unknown, context?: string) => void;
}

/**
 * Custom hook for consistent API error handling
 */
export function useApiError(): UseApiErrorReturn {
  const [error, setError] = useState<ApiError | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((err: unknown, context?: string) => {
    const contextPrefix = context ? `${context}: ` : '';
    
    if (err instanceof Error) {
      logger.error(contextPrefix + err.message, err);
      setError({
        message: err.message,
        code: 'UNKNOWN_ERROR',
      });
    } else if (typeof err === 'object' && err !== null) {
      const apiErr = err as { message?: string; status?: number; code?: string };
      logger.error(contextPrefix + (apiErr.message || 'Unknown error'), err);
      setError({
        message: apiErr.message || 'An unexpected error occurred',
        code: apiErr.code,
        status: apiErr.status,
      });
    } else {
      logger.error(contextPrefix + 'Unknown error', err);
      setError({
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      });
    }
  }, []);

  return {
    error,
    setError,
    clearError,
    handleError,
  };
}
