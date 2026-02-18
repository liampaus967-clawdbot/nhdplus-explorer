'use client';

import { Navigation, Waves, Compass, LifeBuoy } from 'lucide-react';
import { PersonaMode } from '../../types';
import styles from './Header.module.css';

interface HeaderProps {
  mode: PersonaMode;
  onModeChange: (mode: PersonaMode) => void;
}

const MODES: { key: PersonaMode; label: string; icon: React.ReactNode }[] = [
  { key: 'whitewater', label: 'Whitewater', icon: <Waves size={14} /> },
  { key: 'explorer', label: 'Explorer', icon: <Compass size={14} /> },
  { key: 'floater', label: 'Floater', icon: <LifeBuoy size={14} /> },
];

export function Header({ mode, onModeChange }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titleGroup}>
        <Navigation size={24} color="var(--accent)" />
        <span className={styles.titleText}>River Router</span>
      </div>

      <div className={styles.personaSelector}>
        {MODES.map((m) => (
          <button
            key={m.key}
            className={`${styles.personaBtn} ${mode === m.key ? styles.personaBtnActive : ''}`}
            onClick={() => onModeChange(m.key)}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
      </div>

      <span className={styles.subtitle}>
        Plan your float trip with real-time water data
      </span>
    </header>
  );
}
