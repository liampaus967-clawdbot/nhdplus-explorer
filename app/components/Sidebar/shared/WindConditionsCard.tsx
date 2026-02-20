'use client';

import { Loader2 } from 'lucide-react';
import { WeatherData, ChopAssessment, getWindDirection } from '../../../services/weather';
import { WindCompass } from './WindCompass';
import styles from './WindConditionsCard.module.css';

interface WindConditionsCardProps {
  windData: WeatherData | null;
  chopAssessment: ChopAssessment | null;
  loading: boolean;
  placeholder?: string;
}

export function WindConditionsCard({ 
  windData, 
  chopAssessment, 
  loading,
  placeholder = 'Draw route for data'
}: WindConditionsCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.label}>WIND CONDITIONS</div>
        <span className={styles.status}>
          {loading ? 'Loading...' : windData ? 'Live' : placeholder}
        </span>
      </div>
      
      {loading ? (
        <div className={styles.loading}>
          <Loader2 size={24} className={styles.spinner} />
          <span>Fetching wind data...</span>
        </div>
      ) : windData ? (
        <div className={styles.content}>
          <WindCompass windDirection={windData.windDirection} />
          
          <div className={styles.info}>
            <div className={styles.speedRow}>
              <span className={styles.speed}>{windData.windSpeed}</span>
              <span className={styles.unit}>mph</span>
            </div>
            <span className={styles.direction}>
              From {getWindDirection(windData.windDirection)}
            </span>
            <span className={styles.degrees}>{Math.round(windData.windDirection)}°</span>
            <span className={styles.gusts}>Gusts to {windData.windGusts} mph</span>
            
            {chopAssessment && (
              <span 
                className={styles.assessment}
                style={{ 
                  background: chopAssessment.level === 'calm' || chopAssessment.level === 'light' 
                    ? 'rgba(34, 197, 94, 0.15)' 
                    : chopAssessment.level === 'moderate'
                    ? 'rgba(251, 191, 36, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
                  color: chopAssessment.color,
                }}
              >
                {chopAssessment.description}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.placeholder}>
          <span>Draw a route to see wind conditions along your path</span>
        </div>
      )}
    </div>
  );
}
