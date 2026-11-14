import type { RouteKind, RouteRequest } from '../types/routing';

/**
 * Static demo request in the Jezero crater region (~12.6 km apart, under the 20 km source limit).
 * Checked against the MOLA DEM: it produces three distinct routes.
 *
 * TODO(routing-ui): remove once the custom route-planner UI supplies source/destination.
 */
export const DEMO_ROUTE_REQUEST: RouteRequest = {
  // Randomly chosen valid point ~12.6 km south-southeast of the destination
  source: { lat: 18.2005, lon: 77.3267 },
  // Near Jezero's western rim
  destination: { lat: 18.4, lon: 77.25 },
};

/** Maximum source-to-destination distance accepted by the API (km). */
export const ROUTE_SOURCE_MAX_DISTANCE_KM = 20;

export const ROUTE_STYLE: Record<RouteKind, { label: string; color: string }> = {
  shortest: { label: 'Shortest', color: '#38BDF8' },
  fastest: { label: 'Fastest', color: '#F59E0B' },
  safest: { label: 'Safest', color: '#22C55E' },
};
