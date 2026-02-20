/**
 * Lake at Point API Route
 * Queries PostGIS to find which lake/waterbody contains a given point
 */
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Must use Node.js runtime for pg
export const runtime = 'nodejs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const lng = parseFloat(searchParams.get('lng') || '');
  const lat = parseFloat(searchParams.get('lat') || '');
  
  if (isNaN(lng) || isNaN(lat)) {
    return NextResponse.json(
      { error: 'Missing or invalid lng/lat parameters' },
      { status: 400 }
    );
  }
  
  try {
    const result = await pool.query(
      `SELECT 
        gnis_name as name,
        areasqkm as area_sqkm,
        elevation,
        ftype,
        permanent_identifier
      FROM waterbodies 
      WHERE ST_Contains(geom, ST_SetSRID(ST_Point($1, $2), 4326))
      ORDER BY areasqkm DESC
      LIMIT 1`,
      [lng, lat]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ lake: null });
    }
    
    return NextResponse.json({ 
      lake: result.rows[0]
    });
    
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Database query failed' },
      { status: 500 }
    );
  }
}
