'use client';

import { MapPin, Search, Navigation, Waves, Compass, LifeBuoy, MousePointerClick, Flag } from 'lucide-react';
import { PersonaMode } from '../../types';
import styles from './WelcomeSidebar.module.css';

const NEARBY_RIVERS = [
  { name: 'James River', dist: '12 mi away', flow: 'Normal flow' },
  { name: 'Rivanna River', dist: '18 mi away', flow: 'Low flow' },
  { name: 'Shenandoah River', dist: '34 mi away', flow: 'High flow' },
];

const MODE_CONFIG: Record<'whitewater' | 'explorer' | 'floater', { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  color: string;
}> = {
  whitewater: {
    icon: <Waves size={32} />,
    title: 'Whitewater Mode',
    description: 'Plan your whitewater adventure with rapid classifications and gauge data.',
    color: 'var(--accent)',
  },
  explorer: {
    icon: <Compass size={32} />,
    title: 'Explorer Mode',
    description: 'Discover new waterways with elevation profiles and detailed river data.',
    color: 'var(--accent)',
  },
  floater: {
    icon: <LifeBuoy size={32} />,
    title: 'Floater Mode',
    description: 'Plan a relaxing float trip with time estimates and access points.',
    color: 'var(--accent)',
  },
};

interface WelcomeSidebarProps {
  mode?: PersonaMode;
}

export function WelcomeSidebar({ mode = 'home' }: WelcomeSidebarProps) {
  // River modes (whitewater, explorer, floater) show route setup instructions
  if (mode === 'whitewater' || mode === 'explorer' || mode === 'floater') {
    const config = MODE_CONFIG[mode];
    return (
      <div className={styles.container}>
        <div className={`${styles.card} ${styles.welcome}`}>
          <div style={{ color: config.color }}>{config.icon}</div>
          <span className={styles.welcomeTitle}>{config.title}</span>
          <span className={styles.welcomeDesc}>{config.description}</span>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionLabel}>GET STARTED</div>
          <div className={styles.stepsList}>
            <div className={styles.step}>
              <div className={styles.stepIcon} style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
                <MousePointerClick size={18} color="var(--success)" />
              </div>
              <div className={styles.stepInfo}>
                <div className={styles.stepTitle}>1. Set Put-In Point</div>
                <div className={styles.stepDesc}>Click on a river to mark your starting location</div>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepIcon} style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
                <Flag size={18} color="var(--danger)" />
              </div>
              <div className={styles.stepInfo}>
                <div className={styles.stepTitle}>2. Set Take-Out Point</div>
                <div className={styles.stepDesc}>Click downstream to mark where you&apos;ll exit</div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionLabel}>NEARBY WATERWAYS</div>
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

  // Home mode - general explore view
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
        <div className={styles.sectionLabel}>NEARBY WATERWAYS</div>
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
