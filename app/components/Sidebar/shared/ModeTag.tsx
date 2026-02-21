'use client';

import { House, Waves, Compass, LifeBuoy, Anchor } from 'lucide-react';
import { PersonaMode } from '../../../types';
import styles from './shared.module.css';

const MODE_CONFIG: Record<PersonaMode, { label: string; icon: React.ReactNode; variant?: 'cyan' }> = {
  home: { label: 'Explore', icon: <House size={16} /> },
  whitewater: { label: 'Whitewater', icon: <Waves size={16} /> },
  explorer: { label: 'Explorer', icon: <Compass size={16} /> },
  floater: { label: 'Floater', icon: <LifeBuoy size={16} /> },
  lake: { label: 'Lake Mode', icon: <Anchor size={16} />, variant: 'cyan' },
};

export function ModeTag({ mode }: { mode: PersonaMode }) {
  const config = MODE_CONFIG[mode];
  const className = config.variant === 'cyan'
    ? `${styles.modeTag} ${styles.modeTagCyan}`
    : styles.modeTag;
  return (
    <div className={className}>
      {config.icon}
      <span className={styles.modeTagText}>{config.label}</span>
    </div>
  );
}
