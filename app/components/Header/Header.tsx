'use client';

import { Navigation, Sun, Moon } from 'lucide-react';
import styles from './Header.module.css';

interface HeaderProps {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

export function Header({ theme, onThemeToggle }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titleGroup}>
        <Navigation size={24} color="var(--accent)" />
        <span className={styles.titleText}>River Router</span>
      </div>

      <div className={styles.rightSection}>
        <button
          className={styles.themeToggle}
          onClick={onThemeToggle}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <span className={styles.subtitle}>
          Plan your float trip with real-time water data
        </span>
      </div>
    </header>
  );
}
