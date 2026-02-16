/**
 * Format seconds to human-readable time string
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);

  if (hours > 0) return `${hours}h ${mins.toString().padStart(2, '0')}m`;
  return `${mins}m`;
}

/**
 * Format distance in meters to miles
 */
export function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  return miles.toFixed(1);
}

/**
 * Format elevation in meters to feet
 */
export function formatElevation(meters: number): string {
  const feet = meters * 3.28084;
  return Math.round(feet).toString();
}
