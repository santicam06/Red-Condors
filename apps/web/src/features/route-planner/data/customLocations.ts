import {
  OLYMPUS_SITES,
  olympusSiteToRouteLocation,
} from '../../../components/Outposts/olympusSites';
import { isCampRouteLocation, type RouteLocation } from '../types';

/**
 * Custom Locations of Interest (Outposts, Habitats, Science Modules, Waypoints).
 *
 * Add future Martian camps here or in regional site definitions; every camp
 * automatically appears in the lateral bar Source / Destination boxes and
 * renders on the map as an interactive camp marker.
 */
export const CUSTOM_LOCATIONS: RouteLocation[] = [];

/**
 * Returns every camp / outpost eligible for travel route calculations across
 * Olympus Mons crew camps (all `OutpostKind`s) and any future custom camps.
 */
export function getAllCampLocations(): RouteLocation[] {
  const byId = new Map<string, RouteLocation>();

  for (const site of OLYMPUS_SITES) {
    const loc = olympusSiteToRouteLocation(site);
    byId.set(loc.id, loc);
  }

  for (const loc of CUSTOM_LOCATIONS) {
    if (isCampRouteLocation(loc) && !byId.has(loc.id)) {
      byId.set(loc.id, loc);
    }
  }

  return Array.from(byId.values());
}
