'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import styles from './page.module.css';

// Feature types
const FTYPES: Record<number, string> = {
  361: 'Playa',
  378: 'Ice Mass',
  390: 'Lake/Pond',
  436: 'Reservoir',
  466: 'Swamp/Marsh',
  493: 'Estuary'
};

interface WaterbodyFeature {
  type: 'Feature';
  id: number;
  geometry: GeoJSON.Geometry;
  properties: {
    OBJECTID: number;
    permanent_identifier: string;
    gnis_id: string | null;
    gnis_name: string | null;
    areasqkm: number;
    elevation: number | null;
    ftype: number;
    fcode: number;
    reachcode: string;
  };
}

interface WaterbodiesResponse {
  type: 'FeatureCollection';
  features: WaterbodyFeature[];
  metadata: {
    bbox: number[];
    limit: number;
    returned: number;
  };
}

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<WaterbodyFeature | null>(null);
  const [loading, setLoading] = useState(false);
  const [featureCount, setFeatureCount] = useState(0);
  const [filterType, setFilterType] = useState<string>('');
  const [minArea, setMinArea] = useState<string>('');
  const abortController = useRef<AbortController | null>(null);

  // Fetch waterbodies for current map bounds
  const fetchWaterbodies = useCallback(async () => {
    if (!map.current) return;
    
    const bounds = map.current.getBounds();
    if (!bounds) return;
    
    const zoom = map.current.getZoom();
    
    // Only fetch at reasonable zoom levels
    if (zoom < 8) {
      // Clear layer at low zoom
      const source = map.current.getSource('waterbodies') as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData({ type: 'FeatureCollection', features: [] });
      }
      setFeatureCount(0);
      return;
    }
    
    // Cancel previous request
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();
    
    setLoading(true);
    
    const params = new URLSearchParams({
      min_lon: bounds.getWest().toFixed(6),
      min_lat: bounds.getSouth().toFixed(6),
      max_lon: bounds.getEast().toFixed(6),
      max_lat: bounds.getNorth().toFixed(6),
      limit: '1000'
    });
    
    if (filterType) params.set('ftype', filterType);
    if (minArea) params.set('min_area_sqkm', minArea);
    
    try {
      const response = await fetch(`/api/waterbodies?${params}`, {
        signal: abortController.current.signal
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('API error:', error);
        return;
      }
      
      const data: WaterbodiesResponse = await response.json();
      
      // Update map source
      const source = map.current?.getSource('waterbodies') as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData(data);
      }
      
      setFeatureCount(data.metadata.returned);
      
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Fetch error:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [filterType, minArea]);

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-72.5754, 44.2601], // Vermont
      zoom: 10,
      pitch: 0
    });
    
    map.current.addControl(new mapboxgl.NavigationControl());
    map.current.addControl(new mapboxgl.FullscreenControl());
    
    map.current.on('load', () => {
      // Add waterbodies source (empty initially)
      map.current!.addSource('waterbodies', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      
      // Waterbody fill
      map.current!.addLayer({
        id: 'waterbodies-fill',
        type: 'fill',
        source: 'waterbodies',
        paint: {
          'fill-color': '#60a5fa',
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.6,
            0.4
          ]
        }
      });
      
      // Waterbody outline
      map.current!.addLayer({
        id: 'waterbodies-outline',
        type: 'line',
        source: 'waterbodies',
        paint: {
          'line-color': '#3b82f6',
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            3,
            1
          ]
        }
      });
      
      // Labels for named waterbodies
      map.current!.addLayer({
        id: 'waterbodies-labels',
        type: 'symbol',
        source: 'waterbodies',
        filter: ['!=', ['get', 'gnis_name'], null],
        layout: {
          'text-field': ['get', 'gnis_name'],
          'text-size': 11,
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
          'text-allow-overlap': false,
          'text-optional': true
        },
        paint: {
          'text-color': '#a8d4ff',
          'text-halo-color': 'rgba(10, 40, 80, 0.9)',
          'text-halo-width': 1.5
        }
      });
      
      // Initial fetch
      fetchWaterbodies();
    });
    
    // Fetch on map move
    map.current.on('moveend', fetchWaterbodies);
    
    // Hover effect
    let hoveredId: number | null = null;
    
    map.current.on('mousemove', 'waterbodies-fill', (e) => {
      if (e.features && e.features.length > 0) {
        if (hoveredId !== null) {
          map.current!.setFeatureState(
            { source: 'waterbodies', id: hoveredId },
            { hover: false }
          );
        }
        hoveredId = e.features[0].id as number;
        map.current!.setFeatureState(
          { source: 'waterbodies', id: hoveredId },
          { hover: true }
        );
        map.current!.getCanvas().style.cursor = 'pointer';
      }
    });
    
    map.current.on('mouseleave', 'waterbodies-fill', () => {
      if (hoveredId !== null) {
        map.current!.setFeatureState(
          { source: 'waterbodies', id: hoveredId },
          { hover: false }
        );
      }
      hoveredId = null;
      map.current!.getCanvas().style.cursor = '';
    });
    
    // Click to select
    map.current.on('click', 'waterbodies-fill', (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0] as unknown as WaterbodyFeature;
        setSelectedFeature(feature);
        
        // Highlight selected
        map.current!.setFeatureState(
          { source: 'waterbodies', id: feature.id },
          { selected: true }
        );
      }
    });
    
    // Click elsewhere to deselect
    map.current.on('click', (e) => {
      const features = map.current!.queryRenderedFeatures(e.point, {
        layers: ['waterbodies-fill']
      });
      if (features.length === 0) {
        setSelectedFeature(null);
      }
    });
    
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Re-fetch when filters change
  useEffect(() => {
    fetchWaterbodies();
  }, [fetchWaterbodies]);

  // Clear selection highlight when deselecting
  useEffect(() => {
    if (!selectedFeature && map.current) {
      // Clear all selected states
      const source = map.current.getSource('waterbodies');
      if (source) {
        // Reset feature states by re-fetching
        const src = source as mapboxgl.GeoJSONSource;
        // This is a workaround - ideally track selected IDs
      }
    }
  }, [selectedFeature]);

  const formatArea = (sqkm: number) => {
    if (sqkm < 0.01) return `${(sqkm * 1000000).toFixed(0)} m²`;
    if (sqkm < 1) return `${(sqkm * 100).toFixed(1)} ha`;
    return `${sqkm.toFixed(2)} km²`;
  };

  const formatAreaAcres = (sqkm: number) => {
    const acres = sqkm * 247.105;
    if (acres < 1) return `${(acres).toFixed(2)} acres`;
    return `${acres.toFixed(0)} acres`;
  };

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>🌊 NHDPlus Waterbody Explorer</h1>
        <p>Click on lakes and ponds to explore their attributes</p>
      </div>
      
      <div className={styles.container}>
        <div ref={mapContainer} className={styles.map} />
        
        <div className={styles.panel}>
          {/* Status */}
          <div className={styles.section}>
            <h3>📍 Status</h3>
            <div className={styles.status}>
              {loading ? (
                <span className={styles.loading}>Loading...</span>
              ) : (
                <span>{featureCount} waterbodies in view</span>
              )}
            </div>
            <p className={styles.hint}>Zoom in to load waterbodies (min zoom: 8)</p>
          </div>
          
          {/* Filters */}
          <div className={styles.section}>
            <h3>🔍 Filters</h3>
            <div className={styles.filterGroup}>
              <label>Type</label>
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className={styles.select}
              >
                <option value="">All Types</option>
                {Object.entries(FTYPES).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Min Area (km²)</label>
              <input 
                type="number" 
                value={minArea}
                onChange={(e) => setMinArea(e.target.value)}
                placeholder="e.g., 0.1"
                className={styles.input}
                step="0.01"
                min="0"
              />
            </div>
          </div>
          
          {/* Selected waterbody details */}
          {selectedFeature && (
            <div className={styles.section}>
              <h3>📊 Waterbody Details</h3>
              <div className={styles.details}>
                <div className={styles.detailName}>
                  {selectedFeature.properties.gnis_name || 'Unnamed Waterbody'}
                </div>
                
                <div className={styles.statGrid}>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>
                      {formatArea(selectedFeature.properties.areasqkm)}
                    </span>
                    <span className={styles.statLabel}>Area</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>
                      {formatAreaAcres(selectedFeature.properties.areasqkm)}
                    </span>
                    <span className={styles.statLabel}>Acres</span>
                  </div>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>
                      {FTYPES[selectedFeature.properties.ftype] || 'Unknown'}
                    </span>
                    <span className={styles.statLabel}>Type</span>
                  </div>
                  {selectedFeature.properties.elevation && (
                    <div className={styles.stat}>
                      <span className={styles.statValue}>
                        {Math.round(selectedFeature.properties.elevation * 3.28084)} ft
                      </span>
                      <span className={styles.statLabel}>Elevation</span>
                    </div>
                  )}
                </div>
                
                <div className={styles.metadata}>
                  <div><strong>GNIS ID:</strong> {selectedFeature.properties.gnis_id || '—'}</div>
                  <div><strong>Reach Code:</strong> {selectedFeature.properties.reachcode}</div>
                  <div className={styles.permId}>
                    <strong>Permanent ID:</strong><br />
                    <code>{selectedFeature.properties.permanent_identifier}</code>
                  </div>
                </div>
                
                <button 
                  className={styles.clearBtn}
                  onClick={() => setSelectedFeature(null)}
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
          
          {/* Quick locations */}
          <div className={styles.section}>
            <h3>📌 Quick Locations</h3>
            <div className={styles.locations}>
              {[
                { name: 'Vermont', lng: -72.5754, lat: 44.2601, zoom: 9 },
                { name: 'Lake Champlain', lng: -73.2121, lat: 44.4759, zoom: 10 },
                { name: 'Finger Lakes, NY', lng: -76.8, lat: 42.6, zoom: 9 },
                { name: 'Lake Tahoe', lng: -120.0, lat: 39.1, zoom: 10 },
              ].map((loc) => (
                <button
                  key={loc.name}
                  className={styles.locBtn}
                  onClick={() => map.current?.flyTo({
                    center: [loc.lng, loc.lat],
                    zoom: loc.zoom,
                    duration: 2000
                  })}
                >
                  {loc.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
