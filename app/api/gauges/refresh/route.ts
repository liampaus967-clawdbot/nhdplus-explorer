/**
 * USGS Gauge Refresh API
 * Fetches latest readings from USGS Water Services and updates database
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const USGS_IV_API = 'https://waterservices.usgs.gov/nwis/iv/';

interface USGSReading {
  site_no: string;
  reading_time: string;
  streamflow_cfs: number | null;
  gage_height_ft: number | null;
  water_temp_c: number | null;
}

// Parameter codes
const PARAM_MAP: Record<string, keyof USGSReading> = {
  '00060': 'streamflow_cfs',
  '00065': 'gage_height_ft',
  '00010': 'water_temp_c',
};

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Optional: refresh specific sites or bbox
  const siteNos = searchParams.get('sites')?.split(',');
  const bbox = searchParams.get('bbox');
  const state = searchParams.get('state');
  
  try {
    let sitesToFetch: string[];
    
    if (siteNos) {
      sitesToFetch = siteNos;
    } else if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number);
      const result = await query<{ site_no: string }>(`
        SELECT site_no FROM usgs_gauges
        WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)
      `, [minLng, minLat, maxLng, maxLat]);
      sitesToFetch = result.rows.map(r => r.site_no);
    } else if (state) {
      const result = await query<{ site_no: string }>(`
        SELECT site_no FROM usgs_gauges WHERE state_cd = $1
      `, [state.toUpperCase()]);
      sitesToFetch = result.rows.map(r => r.site_no);
    } else {
      // Default: fetch all (might be slow)
      const result = await query<{ site_no: string }>(`
        SELECT site_no FROM usgs_gauges LIMIT 500
      `);
      sitesToFetch = result.rows.map(r => r.site_no);
    }
    
    if (sitesToFetch.length === 0) {
      return NextResponse.json({ error: 'No gauges found to refresh' }, { status: 404 });
    }
    
    // Fetch from USGS in batches of 100
    const readings: USGSReading[] = [];
    
    for (let i = 0; i < sitesToFetch.length; i += 100) {
      const batch = sitesToFetch.slice(i, i + 100);
      
      const params = new URLSearchParams({
        format: 'json',
        sites: batch.join(','),
        parameterCd: Object.keys(PARAM_MAP).join(','),
      });
      
      const response = await fetch(`${USGS_IV_API}?${params}`, {
        headers: { 'Accept': 'application/json' },
      });
      
      if (!response.ok) {
        console.error(`USGS API error for batch ${i}: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      const timeSeries = data?.value?.timeSeries || [];
      
      // Parse readings
      const batchReadings: Record<string, USGSReading> = {};
      
      for (const ts of timeSeries) {
        const siteNo = ts?.sourceInfo?.siteCode?.[0]?.value;
        const paramCode = ts?.variable?.variableCode?.[0]?.value;
        const values = ts?.values?.[0]?.value || [];
        
        if (!siteNo || !paramCode || !PARAM_MAP[paramCode]) continue;
        
        const latest = values[values.length - 1];
        if (!latest) continue;
        
        if (!batchReadings[siteNo]) {
          batchReadings[siteNo] = {
            site_no: siteNo,
            reading_time: latest.dateTime,
            streamflow_cfs: null,
            gage_height_ft: null,
            water_temp_c: null,
          };
        }
        
        const field = PARAM_MAP[paramCode];
        if (field !== 'site_no' && field !== 'reading_time') {
          (batchReadings[siteNo] as any)[field] = parseFloat(latest.value) || null;
        }
        batchReadings[siteNo].reading_time = latest.dateTime;
      }
      
      readings.push(...Object.values(batchReadings));
    }
    
    // Insert readings into database
    if (readings.length > 0) {
      const values = readings.map(r => 
        `('${r.site_no}', '${r.reading_time}', ${r.streamflow_cfs ?? 'NULL'}, ${r.gage_height_ft ?? 'NULL'}, ${r.water_temp_c ?? 'NULL'})`
      ).join(',');
      
      await query(`
        INSERT INTO usgs_readings (site_no, reading_time, streamflow_cfs, gage_height_ft, water_temp_c)
        VALUES ${values}
        ON CONFLICT (site_no, reading_time) DO UPDATE SET
          streamflow_cfs = EXCLUDED.streamflow_cfs,
          gage_height_ft = EXCLUDED.gage_height_ft,
          water_temp_c = EXCLUDED.water_temp_c,
          fetched_at = NOW()
      `);
    }
    
    return NextResponse.json({
      success: true,
      sites_requested: sitesToFetch.length,
      readings_fetched: readings.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Gauge refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh gauges', details: String(error) },
      { status: 500 }
    );
  }
}

// GET method to check last refresh time
export async function GET() {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total_readings,
        MAX(fetched_at) as last_fetch,
        MAX(reading_time) as latest_reading
      FROM usgs_readings
    `);
    
    return NextResponse.json({
      total_readings: parseInt(result.rows[0].total_readings),
      last_fetch: result.rows[0].last_fetch,
      latest_reading: result.rows[0].latest_reading
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get refresh status', details: String(error) },
      { status: 500 }
    );
  }
}
