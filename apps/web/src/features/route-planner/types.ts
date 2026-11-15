export type TravelMode = 'marswalk' | 'rover' | 'vehicle';

export type ActiveInputSlot = 'source' | 'destination';

export type RouteTab = 'mission' | 'considerations';

export type RouteLocationCategory = 'outpost' | 'nomenclature' | 'pin';

export interface RouteLocation {
  id: string;
  name: string;
  subtitle?: string;
  lat: number;
  lon: number;
  category: RouteLocationCategory;
  /** Optional camp role/kind (e.g. 'base-camp', 'habitat', 'science', 'waypoint', or future camp types). */
  campKind?: string;
  priorityLevel?: number;
}

/**
 * Ensures only actual crew camps / outposts (and never planetary nomenclature
 * labels or arbitrary surface pins) are eligible for route calculations.
 */
export function isCampRouteLocation(
  location: RouteLocation | null | undefined
): location is RouteLocation {
  if (!location) return false;
  return (
    location.category === 'outpost' &&
    !location.id.startsWith('nom-') &&
    !location.id.startsWith('pin-')
  );
}

/** A camp or a pin dropped on the map can be a route end. */
export function isRouteEndpoint(
  location: RouteLocation | null | undefined
): location is RouteLocation {
  if (!location) return false;
  return Number.isFinite(location.lat) && Number.isFinite(location.lon);
}

export function formatPinName(lat: number, lon: number): string {
  const latHemisphere = lat >= 0 ? 'N' : 'S';
  const lonHemisphere = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${latHemisphere}, ${Math.abs(lon).toFixed(2)}°${lonHemisphere}`;
}

export function droppedPinLocation(lat: number, lon: number): RouteLocation {
  return {
    id: `pin-${lat.toFixed(5)}-${lon.toFixed(5)}`,
    name: formatPinName(lat, lon),
    subtitle: 'Dropped pin',
    lat,
    lon,
    category: 'pin',
  };
}
