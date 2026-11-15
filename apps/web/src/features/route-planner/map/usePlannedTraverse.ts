import { useEffect } from 'react';
import { formatDuration } from '../../../components/Outposts/navigation';
import { useRoutingStore } from '../../routing/store/useRoutingStore';
import type { Route } from '../../routing/types/routing';
import { useRoutePlannerStore } from '../store/useRoutePlannerStore';

/**
 * Fills the side bar's distance and Marswalk / Rover ETAs from the safe-routing API results
 * (`POST /api/routes`, requested by `useSafeRouteRequest`), so the numbers match the
 * terrain-aware routes drawn on the map:
 *
 * - distance: length of the shortest safe route
 * - Rover ETA: quickest rover time across the routes (the "fastest" route)
 * - Marswalk ETA: quickest walking (EVA) time across the routes
 *
 * All three are empty while a request is loading, has failed, or no route exists.
 */
export function usePlannedTraverse(): void {
  const routes = useRoutingStore((state) => state.routes);

  useEffect(() => {
    useRoutePlannerStore.getState().setTraverseSummary(summarize(routes));
  }, [routes]);
}

function summarize(routes: Route[]) {
  if (routes.length === 0) {
    return { distanceKm: null, marswalkEta: null, roverEta: null };
  }
  const minOf = (pick: (route: Route) => number) => Math.min(...routes.map(pick));
  return {
    distanceKm: minOf((r) => r.distance_m) / 1000,
    marswalkEta: formatDuration(minOf((r) => r.eta_eva_s) / 3600),
    roverEta: formatDuration(minOf((r) => r.eta_rover_s) / 3600),
  };
}
