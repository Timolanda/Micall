/**
 * Navigation utilities for calculating distance, ETA, and route information
 */

export interface NavigationInfo {
  distanceKm: number;
  distanceMiles: number;
  estimatedMinutes: number;
  etaTime: string;
  bearing: number;
  direction: string;
}

/**
 * Convert degrees to radians
 */
const toRad = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lng1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lng2 Longitude of point 2
 * @returns Distance in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculate bearing (direction) from one point to another
 * @param lat1 Latitude of starting point
 * @param lng1 Longitude of starting point
 * @param lat2 Latitude of destination
 * @param lng2 Longitude of destination
 * @returns Bearing in degrees (0-360)
 */
export const calculateBearing = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
};

/**
 * Get cardinal direction from bearing
 */
export const getBearingDirection = (bearing: number): string => {
  const directions = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ];
  const index = Math.round(bearing / 22.5) % 16;
  return directions[index];
};

/**
 * Calculate ETA given distance and average speed
 * @param distanceKm Distance in kilometers
 * @param averageSpeedKmh Average speed in km/h (default 60)
 * @returns ETA in formatted string and minutes
 */
export const calculateETA = (
  distanceKm: number,
  averageSpeedKmh: number = 60
): { minutes: number; formatted: string } => {
  const minutes = Math.ceil((distanceKm / averageSpeedKmh) * 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  let formatted = '';
  if (hours > 0) {
    formatted = `${hours}h ${mins}m`;
  } else {
    formatted = `${mins}m`;
  }

  return { minutes, formatted };
};

/**
 * Get complete navigation info
 */
export const getNavigationInfo = (
  responderLat: number,
  responderLng: number,
  victimLat: number,
  victimLng: number
): NavigationInfo => {
  const distanceKm = calculateDistance(responderLat, responderLng, victimLat, victimLng);
  const bearing = calculateBearing(responderLat, responderLng, victimLat, victimLng);
  const { minutes, formatted } = calculateETA(distanceKm);

  return {
    distanceKm,
    distanceMiles: distanceKm * 0.621371,
    estimatedMinutes: minutes,
    etaTime: formatted,
    bearing,
    direction: getBearingDirection(bearing),
  };
};

/**
 * Format time remaining in HH:MM:SS format
 */
export const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Calculate time elapsed since a timestamp
 */
export const getElapsedTime = (createdAt: string | Date): number => {
  const now = new Date().getTime();
  const created = new Date(createdAt).getTime();
  return Math.floor((now - created) / 1000);
};

/**
 * Format elapsed time in readable format
 */
export const formatElapsedTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};
