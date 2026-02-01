/**
 * Single Waterbody Lookup API Route
 */
import { NextRequest, NextResponse } from 'next/server';
import { getClientIP, checkRateLimit, verifyApiKey, validateUUID } from '@/lib/security';

const WATERBODY_SERVICE = 'https://hydro.nationalmap.gov/arcgis/rest/services/NHDPlus_HR/MapServer/9';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIP(request);
  
  // Rate limiting
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }
  
  // API key check
  if (!verifyApiKey(request)) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 }
    );
  }
  
  const { id } = await params;
  
  // Validate ID format (UUID)
  if (!validateUUID(id)) {
    return NextResponse.json(
      { error: 'Invalid permanent identifier format' },
      { status: 400 }
    );
  }
  
  const queryParams = new URLSearchParams({
    where: `permanent_identifier = '${id}'`,
    outFields: '*',
    returnGeometry: 'true',
    outSR: '4326',
    f: 'geojson'
  });
  
  try {
    const response = await fetch(`${WATERBODY_SERVICE}/query?${queryParams}`, {
      headers: { 'User-Agent': 'NHDPlus-Explorer/1.0' }
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Error querying upstream service' },
        { status: 502 }
      );
    }
    
    const data = await response.json();
    
    if (!data.features?.length) {
      return NextResponse.json(
        { error: 'Waterbody not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(data.features[0], {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
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
