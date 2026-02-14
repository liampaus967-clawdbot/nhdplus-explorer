/**
 * USGS Stream Gauge API
 * Returns gauge locations and live readings within a bounding box
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface GaugeReading {
  site_no: string;
  site_name: string;
  latitude: number;
  longitude: number;
  state_cd: string;
  drain_area_sq_mi: number | null;
  streamflow_cfs: number | null;
  gage_height_ft: number | null;
  water_temp_c: number | null;
  reading_time: string | null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Support both bbox and individual params
  const bbox = searchParams.get('bbox'); // "minLng,minLat,maxLng,maxLat"
  const minLng = parseFloat(searchParams.get('min_lng') || bbox?.split(',')[0] || '');
  const minLat = parseFloat(searchParams.get('min_lat') || bbox?.split(',')[1] || '');
  const maxLng = parseFloat(searchParams.get('max_lng') || bbox?.split(',')[2] || '');
  const maxLat = parseFloat(searchParams.get('max_lat') || bbox?.split(',')[3] || '');
  
  // Optional: get single gauge by site_no
  const siteNo = searchParams.get('site_no');
  
  // Optional: limit results
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
  
  try {
    if (siteNo) {
      // Get single gauge with latest reading
      const result = await query<GaugeReading>(`
        SELECT 
          g.site_no,
          g.site_name,
          g.latitude,
          g.longitude,
          g.state_cd,
          g.drain_area_sq_mi,
          r.streamflow_cfs,
          r.gage_height_ft,
          r.water_temp_c,
          r.reading_time
        FROM usgs_gauges g
        LEFT JOIN LATERAL (
          SELECT streamflow_cfs, gage_height_ft, water_temp_c, reading_time
          FROM usgs_readings
          WHERE site_no = g.site_no
          ORDER BY reading_time DESC
          LIMIT 1
        ) r ON true
        WHERE g.site_no = $1
      `, [siteNo]);
      
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Gauge not found' }, { status: 404 });
      }
      
      return NextResponse.json({ gauge: result.rows[0] });
    }
    
    // Validate bbox
    if (isNaN(minLng) || isNaN(minLat) || isNaN(maxLng) || isNaN(maxLat)) {
      return NextResponse.json(
        { error: 'Invalid bounding box. Provide bbox=minLng,minLat,maxLng,maxLat or individual min_lng, min_lat, max_lng, max_lat params' },
        { status: 400 }
      );
    }
    
    // Get gauges within bbox with latest readings
    const result = await query<GaugeReading>(`
      SELECT 
        g.site_no,
        g.site_name,
        g.latitude,
        g.longitude,
        g.state_cd,
        g.drain_area_sq_mi,
        r.streamflow_cfs,
        r.gage_height_ft,
        r.water_temp_c,
        r.reading_time
      FROM usgs_gauges g
      LEFT JOIN LATERAL (
        SELECT streamflow_cfs, gage_height_ft, water_temp_c, reading_time
        FROM usgs_readings
        WHERE site_no = g.site_no
        ORDER BY reading_time DESC
        LIMIT 1
      ) r ON true
      WHERE g.geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
      ORDER BY g.drain_area_sq_mi DESC NULLS LAST
      LIMIT $5
    `, [minLng, minLat, maxLng, maxLat, limit]);
    
    // Build GeoJSON response
    const geojson = {
      type: 'FeatureCollection' as const,
      features: result.rows.map(gauge => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [gauge.longitude, gauge.latitude]
        },
        properties: {
          site_no: gauge.site_no,
          site_name: gauge.site_name,
          state_cd: gauge.state_cd,
          drain_area_sq_mi: gauge.drain_area_sq_mi,
          streamflow_cfs: gauge.streamflow_cfs,
          gage_height_ft: gauge.gage_height_ft,
          water_temp_c: gauge.water_temp_c,
          reading_time: gauge.reading_time,
          // Generate USGS URL for more details
          usgs_url: `https://waterdata.usgs.gov/monitoring-location/${gauge.site_no}/`
        }
      }))
    };
    
    return NextResponse.json({
      gauges: geojson,
      count: result.rows.length,
      bbox: { minLng, minLat, maxLng, maxLat }
    });
    
  } catch (error) {
    console.error('Gauge API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gauges', details: String(error) },
      { status: 500 }
    );
  }
}
