/**
 * Input validation utilities
 */

// Valid coordinate bounds (CONUS + buffer)
const BOUNDS = {
  minLng: -130,
  maxLng: -60,
  minLat: 20,
  maxLat: 55
};

export function validateCoordinate(lng: number, lat: number): { valid: boolean; error?: string } {
  if (isNaN(lng) || isNaN(lat)) {
    return { valid: false, error: 'Invalid coordinate values' };
  }
  
  if (lng < BOUNDS.minLng || lng > BOUNDS.maxLng) {
    return { valid: false, error: `Longitude must be between ${BOUNDS.minLng} and ${BOUNDS.maxLng}` };
  }
  
  if (lat < BOUNDS.minLat || lat > BOUNDS.maxLat) {
    return { valid: false, error: `Latitude must be between ${BOUNDS.minLat} and ${BOUNDS.maxLat}` };
  }
  
  return { valid: true };
}

export function validateFlowCondition(flow: string | null): string {
  const valid = ['low', 'normal', 'high'];
  if (!flow || !valid.includes(flow)) {
    return 'normal';
  }
  return flow;
}

// Sanitize string input (for any future text parameters)
export function sanitizeString(input: string, maxLength: number = 100): string {
  if (!input) return '';
  return input.slice(0, maxLength).replace(/[<>\"\'`;]/g, '');
}
