'use client';

import { House, Waves, Compass, LifeBuoy, Anchor } from 'lucide-react';
import { PersonaMode } from '../../types';
import styles from './IconRail.module.css';

interface IconRailProps {
  mode: PersonaMode;
  onModeChange: (mode: PersonaMode) => void;
}

const MODES: { key: PersonaMode; icon: React.ReactNode; label: string }[] = [
  { key: 'home', icon: <House size={22} />, label: 'Home' },
  { key: 'whitewater', icon: <Waves size={22} />, label: 'Whitewater' },
  { key: 'explorer', icon: <Compass size={22} />, label: 'Explorer' },
  { key: 'floater', icon: <LifeBuoy size={22} />, label: 'Floater' },
  { key: 'lake', icon: <Anchor size={22} />, label: 'Lake' },
];

export function IconRail({ mode, onModeChange }: IconRailProps) {
  return (
    <div className={styles.rail}>
      {MODES.map((m) => (
        <button
          key={m.key}
          className={`${styles.railBtn} ${mode === m.key ? styles.railBtnActive : ''}`}
          onClick={() => onModeChange(m.key)}
          title={m.label}
        >
          {mode === m.key && <span className={styles.activeIndicator} />}
          <span className={styles.icon}>{m.icon}</span>
        </button>
      ))}
    </div>
  );
}
