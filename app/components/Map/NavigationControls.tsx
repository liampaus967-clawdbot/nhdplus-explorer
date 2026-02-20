'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Minus, Compass, Locate } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import styles from './NavigationControls.module.css';

interface NavigationControlsProps {
  map: mapboxgl.Map | null;
}

export function NavigationControls({ map }: NavigationControlsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const compassIconRef = useRef<HTMLDivElement>(null);
  const [bearing, setBearing] = useState(0);

  useEffect(() => {
    if (!map || !containerRef.current) return;

    const handleZoomIn = () => {
      map.zoomIn();
    };

    const handleZoomOut = () => {
      map.zoomOut();
    };

    const handleCompass = () => {
      map.resetNorthPitch();
    };

    const handleLocate = () => {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }

      // Show loading indicator
      const locateBtn = containerRef.current?.querySelector('[data-action="locate"]') as HTMLButtonElement;
      if (locateBtn) {
        locateBtn.disabled = true;
        locateBtn.style.opacity = '0.6';
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lng = position.coords.longitude;
          const lat = position.coords.latitude;
          
          // Log the coordinates for debugging
          console.log('Location retrieved:', { longitude: lng, latitude: lat });
          
          // Verify coordinates are valid
          if (isNaN(lng) || isNaN(lat) || lng === 0 || lat === 0) {
            console.error('Invalid coordinates received:', { lng, lat });
            alert('Invalid location data received. Please try again.');
            if (locateBtn) {
              locateBtn.disabled = false;
              locateBtn.style.opacity = '1';
            }
            return;
          }

          // Fly to the actual location
          map.flyTo({
            center: [lng, lat],
            zoom: 14,
            duration: 1500,
          });

          if (locateBtn) {
            locateBtn.disabled = false;
            locateBtn.style.opacity = '1';
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          let errorMessage = 'Unable to get your location. ';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Please allow location access in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location information is unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage += 'Location request timed out. Please try again.';
              break;
            default:
              errorMessage += 'An unknown error occurred.';
              break;
          }
          
          alert(errorMessage);
          
          if (locateBtn) {
            locateBtn.disabled = false;
            locateBtn.style.opacity = '1';
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0, // Always get fresh location, don't use cache
        }
      );
    };

    // Update compass rotation based on map bearing
    const updateCompass = () => {
      const currentBearing = map.getBearing();
      setBearing(-currentBearing); // Negative because we want to rotate compass opposite to map rotation
    };

    // Listen to map rotation events
    map.on('rotate', updateCompass);
    map.on('moveend', updateCompass);
    
    // Initial update
    updateCompass();

    const zoomInBtn = containerRef.current.querySelector('[data-action="zoom-in"]');
    const zoomOutBtn = containerRef.current.querySelector('[data-action="zoom-out"]');
    const compassBtn = containerRef.current.querySelector('[data-action="compass"]');
    const locateBtn = containerRef.current.querySelector('[data-action="locate"]');

    zoomInBtn?.addEventListener('click', handleZoomIn);
    zoomOutBtn?.addEventListener('click', handleZoomOut);
    compassBtn?.addEventListener('click', handleCompass);
    locateBtn?.addEventListener('click', handleLocate);

    return () => {
      map.off('rotate', updateCompass);
      map.off('moveend', updateCompass);
      zoomInBtn?.removeEventListener('click', handleZoomIn);
      zoomOutBtn?.removeEventListener('click', handleZoomOut);
      compassBtn?.removeEventListener('click', handleCompass);
      locateBtn?.removeEventListener('click', handleLocate);
    };
  }, [map]);

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.zoomControls}>
        <button className={styles.zoomBtn} data-action="zoom-in" title="Zoom In">
          <Plus size={18} />
        </button>
        <button className={styles.zoomBtn} data-action="zoom-out" title="Zoom Out">
          <Minus size={18} />
        </button>
      </div>
      <button className={styles.controlBtn} data-action="compass" title="Reset North">
        <div ref={compassIconRef} className={styles.compassIcon} style={{ transform: `rotate(${bearing}deg)` }}>
          <Compass size={18} />
        </div>
      </button>
      <button className={styles.controlBtn} data-action="locate" title="My Location">
        <Locate size={18} />
      </button>
    </div>
  );
}
