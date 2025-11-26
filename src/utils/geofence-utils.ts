import type { EventGeoFence } from '@/utils/firebase/firebase-service-events';

export interface UserLocation {
  lat: number;
  lng: number;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (point1.lat * Math.PI) / 180;
  const φ2 = (point2.lat * Math.PI) / 180;
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
  const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if user location is within geofence radius
 */
export function isWithinGeofence(
  userLocation: UserLocation | null | undefined,
  geofence: EventGeoFence
): boolean {
  if (!userLocation || !userLocation.lat || !userLocation.lng) {
    return false;
  }

  const distance = calculateDistance(
    { lat: userLocation.lat, lng: userLocation.lng },
    { lat: geofence.latitude, lng: geofence.longitude }
  );

  return distance <= geofence.radiusMeters;
}

/**
 * Format distance for display
 * Returns formatted string like "1.2 km" or "350 m"
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Format radius for display (more readable than raw meters)
 * Returns formatted string like "2 km" or "500 m"
 */
export function formatRadius(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    // Remove decimal if it's a whole number
    return km % 1 === 0 ? `${km} km` : `${km.toFixed(1)} km`;
  }
  return `${meters} m`;
}

/**
 * Get distance to event location
 * Returns null if user location is not available
 */
export function getDistanceToEvent(
  userLocation: UserLocation | null | undefined,
  geofence: EventGeoFence
): number | null {
  if (!userLocation || !userLocation.lat || !userLocation.lng) {
    return null;
  }

  return calculateDistance(
    { lat: userLocation.lat, lng: userLocation.lng },
    { lat: geofence.latitude, lng: geofence.longitude }
  );
}

/**
 * Check if user can access event with geofence
 * Returns { canAccess: boolean, reason?: string, distance?: number }
 */
export function checkGeofenceAccess(
  userLocation: UserLocation | null | undefined,
  geofence: EventGeoFence | undefined,
  isParticipant: boolean
): {
  canAccess: boolean;
  reason?: string;
  distance?: number | null;
  formattedDistance?: string;
} {
  // If no geofence, access is granted
  if (!geofence) {
    return { canAccess: true };
  }

  // If user is already a participant, access is granted
  if (isParticipant) {
    return { canAccess: true, reason: 'Already a participant' };
  }

  // If user has no location, deny access
  if (!userLocation || !userLocation.lat || !userLocation.lng) {
    return {
      canAccess: false,
      reason: 'Location not set',
      distance: null
    };
  }

  // Calculate distance
  const distance = getDistanceToEvent(userLocation, geofence);
  const formattedDistance =
    distance !== null ? formatDistance(distance) : undefined;

  // Check if within radius
  if (distance !== null && distance <= geofence.radiusMeters) {
    return {
      canAccess: true,
      reason: 'Within geofence',
      distance,
      formattedDistance
    };
  }

  // User is too far away
  return {
    canAccess: false,
    reason: 'Outside geofence radius',
    distance: distance !== null ? distance : undefined,
    formattedDistance
  };
}
