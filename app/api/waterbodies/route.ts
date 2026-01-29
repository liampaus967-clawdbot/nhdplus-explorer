/**
 * Waterbodies API Route
 * Queries USGS NHDPlus HR service for waterbody polygons
 */
import { NextRequest, NextResponse } from 'next/server';
import { getClientIP, checkRateLimit, verifyApiKey, sanitizeString } from '@/lib/security';

// USGS National Map NHDPlus HR endpoint
const WATERBODY_SERVICE = 'https://hydro.nationalmap.gov/arcgis/rest/services/NHDPlus_HR/MapServer/9';

export const runtime = 'edge'; // Use edge runtime for better performance

export async function GET(request: NextRequest) {
  const ip = getClientIP(request);
  
  // Rate limiting
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { 
        status: 429,
        headers: { 'X-RateLimit-Remaining': '0' }
      }
    );
  }
  
  // API key check
  if (!verifyApiKey(request)) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    );
  }
  
  // Parse query params
  const { searchParams } = new URL(request.url);
  
  const minLon = parseFloat(searchParams.get('min_lon') || '');
  const minLat = parseFloat(searchParams.get('min_lat') || '');
  const maxLon = parseFloat(searchParams.get('max_lon') || '');
  const maxLat = parseFloat(searchParams.get('max_lat') || '');
  const ftype = searchParams.get('ftype');
  const gnisName = searchParams.get('gnis_name');
  const minAreaSqkm = parseFloat(searchParams.get('min_area_sqkm') || '0');
  const limit = Math.min(parseInt(searchParams.get('limit') || '1000'), 2000);
  
  // Validate bbox
  if (isNaN(minLon) || isNaN(minLat) || isNaN(maxLon) || isNaN(maxLat)) {
    return NextResponse.json(
      { error: 'Missing or invalid bbox parameters (min_lon, min_lat, max_lon, max_lat)' },
      { status: 400 }
    );
  }
  
  if (minLon >= maxLon || minLat >= maxLat) {
    return NextResponse.json(
      { error: 'Invalid bbox: min values must be less than max values' },
      { status: 400 }
    );
  }
  
  // Limit bbox size (max 2 degrees)
  if ((maxLon - minLon) > 2 || (maxLat - minLat) > 2) {
    return NextResponse.json(
      { error: 'Bounding box too large. Max 2 degrees in each dimension.' },
      { status: 400 }
    );
  }
  
  // Build WHERE clause
  const whereParts: string[] = ['1=1'];
  
  if (ftype) {
    const ftypeNum = parseInt(ftype);
    if (!isNaN(ftypeNum) && ftypeNum >= 0 && ftypeNum <= 1000) {
      whereParts.push(`ftype = ${ftypeNum}`);
    }
  }
  
  if (gnisName) {
    const safeName = sanitizeString(gnisName);
    if (safeName) {
      whereParts.push(`gnis_name LIKE '%${safeName}%'`);
    }
  }
  
  if (minAreaSqkm > 0) {
    whereParts.push(`areasqkm >= ${minAreaSqkm}`);
  }
  
  // Query USGS service
  const params = new URLSearchParams({
    where: whereParts.join(' AND '),
    geometry: `${minLon},${minLat},${maxLon},${maxLat}`,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'OBJECTID,permanent_identifier,gnis_id,gnis_name,areasqkm,elevation,ftype,fcode,reachcode',
    returnGeometry: 'true',
    outSR: '4326',
    f: 'geojson',
    resultRecordCount: limit.toString()
  });
  
  try {
    const response = await fetch(`${WATERBODY_SERVICE}/query?${params}`, {
      headers: { 'User-Agent': 'NHDPlus-Explorer/1.0' }
    });
    
    if (!response.ok) {
      console.error(`USGS service error: ${response.status}`);
      return NextResponse.json(
        { error: 'Error querying upstream service' },
        { status: 502 }
      );
    }
    
    const data = await response.json();
    
    // Add metadata
    const result = {
      ...data,
      metadata: {
        bbox: [minLon, minLat, maxLon, maxLat],
        limit,
        returned: data.features?.length || 0,
        source: 'USGS NHDPlus HR'
      }
    };
    
    return NextResponse.json(result, {
      headers: {
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });
    
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
