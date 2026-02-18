'use client';

import { MapPin, Search, ChevronRight, Navigation } from 'lucide-react';
import { PersonaMode } from '../../types';
import styles from './WelcomeSidebar.module.css';

interface WelcomeSidebarProps {
  onModeSelect: (mode: PersonaMode) => void;
}

const MODE_CARDS: { key: PersonaMode; emoji: string; name: string; desc: string }[] = [
  { key: 'whitewater', emoji: '\u{1F30A}', name: 'Whitewater', desc: 'Rapids, gauge data, difficulty ratings' },
  { key: 'explorer', emoji: '\u{1F6F6}', name: 'Explorer', desc: 'Scenic routes, campsites, wildlife' },
  { key: 'floater', emoji: '\u{1F37A}', name: 'Floater', desc: 'Casual floats, tubing, beer runs' },
];

const NEARBY_RIVERS = [
  { name: 'James River', dist: '12 mi away', flow: 'Normal flow' },
  { name: 'Rivanna River', dist: '18 mi away', flow: 'Low flow' },
  { name: 'Shenandoah River', dist: '34 mi away', flow: 'High flow' },
];

export function WelcomeSidebar({ onModeSelect }: WelcomeSidebarProps) {
  return (
    <div className={styles.container}>
      <div className={`${styles.card} ${styles.welcome}`}>
        <MapPin size={32} color="var(--accent)" />
        <span className={styles.welcomeTitle}>Explore Waterways</span>
        <span className={styles.welcomeDesc}>
          Search for a river or click the map to start exploring
        </span>
      </div>

      <div className={styles.searchBar}>
        <Search size={18} color="var(--text-dim)" />
        <span className={styles.searchText}>Search rivers, streams, lakes...</span>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionLabel}>Choose Your Mode</div>
        <div className={styles.modeCards}>
          {MODE_CARDS.map((m) => (
            <button
              key={m.key}
              className={styles.modeCard}
              onClick={() => onModeSelect(m.key)}
            >
              <span className={styles.modeEmoji}>{m.emoji}</span>
              <div className={styles.modeInfo}>
                <div className={styles.modeName}>{m.name}</div>
                <div className={styles.modeDesc}>{m.desc}</div>
              </div>
              <ChevronRight size={16} color="var(--text-dim)" />
            </button>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionLabel}>Nearby Waterways</div>
        <div className={styles.riverCards}>
          {NEARBY_RIVERS.map((r) => (
            <div key={r.name} className={styles.riverCard}>
              <Navigation size={14} color="var(--river)" />
              <div className={styles.riverInfo}>
                <div className={styles.riverName}>{r.name}</div>
                <div className={styles.riverDist}>{r.dist} &middot; {r.flow}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
