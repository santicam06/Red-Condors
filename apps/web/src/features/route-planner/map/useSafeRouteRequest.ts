import { useEffect } from 'react';
import { useRoutingStore } from '../../routing/store/useRoutingStore';
import type { LatLon } from '../../routing/types/routing';
import { useRoutePlannerStore } from '../store/useRoutePlannerStore';
import type { RouteLocation } from '../types';

/**
 * Sends the planner's source and destination to the safe-routing API (`POST /api/routes`)
 * whenever either changes. The routing feature then draws the shortest / fastest / safest
 * routes and the traversable area on the map.
 *
 * Clears the routes when either location is missing or both are the same place. A newer
 * request automatically supersedes one still in flight.
 */
export function useSafeRouteRequest(): void {
  const source = useRoutePlannerStore((state) => state.source);
  const destination = useRoutePlannerStore((state) => state.destination);

  useEffect(() => {
    const routing = useRoutingStore.getState();
    if (!source || !destination || source.id === destination.id) {
      routing.clear();
      return;
    }
    void routing.setRequest({ source: toLatLon(source), destination: toLatLon(destination) });
  }, [source, destination]);
}

/** API coordinates: planetocentric latitude, East-positive longitude in [-180, 180]. */
function toLatLon(location: RouteLocation): LatLon {
  const lon = ((((location.lon + 180) % 360) + 360) % 360) - 180;
  return { lat: location.lat, lon };
}
