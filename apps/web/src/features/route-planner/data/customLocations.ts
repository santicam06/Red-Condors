import {
  OLYMPUS_SITES,
  olympusSiteToRouteLocation,
} from "../../../components/Outposts/olympusSites";
import { isCampRouteLocation, type RouteLocation } from "../types";

/**
 * Custom Locations of Interest (Outposts, Habitats, Science Modules, Waypoints).
 *
 * Add future Martian camps here or in regional site definitions; every camp
 * automatically appears in the lateral bar Source / Destination boxes and
 * renders on the map as an interactive camp marker.
 */
export const CUSTOM_LOCATIONS: RouteLocation[] = [
  {
    // Demo base on the summit plateau of Olympus Mons (~+19,950 m), ~8 km due west of the IAU
    // reference point for Olympus Mons (18.6528°N, 133.8025°W). Checked against the MOLA DEM:
    // the safe route between the two is ~7.9 km with a steepest slope of ~1.2°.
    id: "blip-a",
    name: "Blip A",
    subtitle: "Demo base · ~8 km W of the Olympus Mons summit",
    lat: 18.6528,
    lon: -133.945,
    category: "outpost",
  },
];

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
