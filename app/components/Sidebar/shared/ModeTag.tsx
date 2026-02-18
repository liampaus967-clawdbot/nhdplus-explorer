'use client';

import { Waves, Compass, LifeBuoy } from 'lucide-react';
import { PersonaMode } from '../../../types';
import styles from './shared.module.css';

const MODE_CONFIG: Record<PersonaMode, { label: string; icon: React.ReactNode }> = {
  whitewater: { label: 'Whitewater', icon: <Waves size={16} color="var(--accent)" /> },
  explorer: { label: 'Explorer', icon: <Compass size={16} color="var(--accent)" /> },
  floater: { label: 'Floater', icon: <LifeBuoy size={16} color="var(--accent)" /> },
};

export function ModeTag({ mode }: { mode: PersonaMode }) {
  const config = MODE_CONFIG[mode];
  return (
    <div className={styles.modeTag}>
      {config.icon}
      <span className={styles.modeTagText}>{config.label}</span>
    </div>
  );
}
