'use client';

import { MapPin, Search, Navigation } from 'lucide-react';
import styles from './WelcomeSidebar.module.css';

const NEARBY_RIVERS = [
  { name: 'James River', dist: '12 mi away', flow: 'Normal flow' },
  { name: 'Rivanna River', dist: '18 mi away', flow: 'Low flow' },
  { name: 'Shenandoah River', dist: '34 mi away', flow: 'High flow' },
];

export function WelcomeSidebar() {
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
