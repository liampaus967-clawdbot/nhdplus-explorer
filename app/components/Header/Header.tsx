'use client';

import { Navigation } from 'lucide-react';
import styles from './Header.module.css';
import { PersonaMode } from '../../types';

interface HeaderProps {
  mode: PersonaMode;
  onModeChange: (mode: PersonaMode) => void;
}

export function Header({ mode, onModeChange }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titleGroup}>
        <Navigation size={24} color="var(--accent)" />
        <span className={styles.titleText}>River Router</span>
      </div>

      <span className={styles.subtitle}>
        Plan your float trip with real-time water data
      </span>
    </header>
  );
}
