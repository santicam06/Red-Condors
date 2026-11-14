import type { RouteKind, RouteRequest } from '../types/routing';

/**
 * Challenging-terrain test requests. Each pair is under the 20 km source limit and was checked
 * against the MOLA DEM at the default 15° limit to give three distinct routes.
 *
 * TODO(routing-ui): remove once the custom route-planner UI supplies source/destination.
 */
export const DEMO_ROUTES = {
  /**
   * Eos Chaos (Valles Marineris): a field of collapsed, steep-sided blocks. Points ~15.6 km
   * apart; ~44% of the planning area is too steep and ~7% is walled-off pockets, so the
   * shortest safe route winds ~43 km (2.7x the straight line).
   */
  eosChaos: {
    // Southern Eos Chaos, ~15.6 km south-southeast of the destination
    source: { lat: -18.0628, lon: -46.3223 },
    // Southern Eos Chaos, ~60 km south of the Eos Chaos feature centre
    destination: { lat: -17.8229, lon: -46.4379 },
  },
  /**
   * Noctis Labyrinthus: a maze of intersecting troughs west of Valles Marineris. Points
   * ~15.1 km apart; ~35% of the planning area is too steep and ~11% is walled-off pockets, so
   * the shortest safe route winds ~40 km (2.6x the straight line) across ~1.8 km of relief.
   */
  noctisLabyrinthus: {
    // Eastern Noctis Labyrinthus, ~15.1 km east of the destination
    source: { lat: -7.2068, lon: -98.0095 },
    // Eastern Noctis Labyrinthus, ~180 km east-southeast of the feature centre
    destination: { lat: -7.1762, lon: -98.2638 },
  },
  /**
   * Aram Chaos (Margaritifer Terra): a crater floor broken into chaotic blocks and mesas.
   * Points ~15.9 km apart; ~29% of the planning area is too steep, so the shortest safe route
   * winds ~47 km (2.9x the straight line, the most of any preset) across ~1.6 km of relief.
   */
  aramChaos: {
    // Southeastern Aram Chaos, ~15.9 km west-southwest of the destination
    source: { lat: 0.9473, lon: -21.5521 },
    // Southeastern Aram Chaos, ~110 km south-southeast of the feature centre
    destination: { lat: 1.0015, lon: -21.2887 },
  },
  /**
   * Northwestern rim of the Argyre impact basin: the most challenging pair found by a global
   * search of the MOLA DEM (largest shortest-safe-route / straight-line ratio for points
   * 15-20 km apart). Points ~15.2 km apart; ~36% of the planning area is too steep, and the
   * shortest safe route winds ~120 km (7.9x the straight line) across ~4.4 km of relief.
   */
  argyreRim: {
    // ~15.2 km east-northeast of the destination, across the rim massifs
    source: { lat: -45.4761, lon: -50.4925 },
    // ~390 km northwest of the Argyre Planitia centre
    destination: { lat: -45.6158, lon: -50.7994 },
  },
} satisfies Record<string, RouteRequest>;

/** The demo request sent on load. Switch the key to test another location. */
export const DEMO_ROUTE_REQUEST: RouteRequest = DEMO_ROUTES.argyreRim;

/** Maximum source-to-destination distance accepted by the API (km). */
export const ROUTE_SOURCE_MAX_DISTANCE_KM = 20;

export const ROUTE_STYLE: Record<RouteKind, { label: string; color: string }> = {
  shortest: { label: 'Shortest', color: '#38BDF8' },
  fastest: { label: 'Fastest', color: '#F59E0B' },
  safest: { label: 'Safest', color: '#22C55E' },
};
