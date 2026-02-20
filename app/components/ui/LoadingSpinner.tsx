'use client';

import { Loader2 } from 'lucide-react';
import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  size?: number;
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ 
  size = 24, 
  message,
  fullScreen = false 
}: LoadingSpinnerProps) {
  const content = (
    <div className={styles.container} role="status" aria-live="polite">
      <Loader2 size={size} className={styles.spinner} aria-hidden="true" />
      {message && <span className={styles.message}>{message}</span>}
      <span className={styles.srOnly}>Loading{message ? `: ${message}` : '...'}</span>
    </div>
  );

  if (fullScreen) {
    return <div className={styles.fullScreen}>{content}</div>;
  }

  return content;
}
