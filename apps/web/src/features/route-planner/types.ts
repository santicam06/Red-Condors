export type TravelMode = 'marswalk' | 'rover';

export type ActiveInputSlot = 'source' | 'destination';

export type RouteTab = 'mission' | 'considerations';

export type RouteLocationCategory = 'outpost';

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
