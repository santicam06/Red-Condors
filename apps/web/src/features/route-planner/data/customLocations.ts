import type { RouteLocation } from '../types';

/**
 * Custom Locations of Interest (Outposts, Habitats, Science Modules, Waypoints).
 *
 * Add team-defined Martian locations here when ready; entries automatically
 * appear in the lateral bar search boxes and render as clickable map pins.
 */
export const CUSTOM_LOCATIONS: RouteLocation[] = [
  {
    // Demo base on the summit plateau of Olympus Mons (~+19,950 m), ~8 km due west of the IAU
    // reference point for Olympus Mons (18.6528°N, 133.8025°W). Checked against the MOLA DEM:
    // the safe route between the two is ~7.9 km with a steepest slope of ~1.2°.
    id: 'blip-a',
    name: 'Blip A',
    subtitle: 'Demo base · ~8 km W of the Olympus Mons summit',
    lat: 18.6528,
    lon: -133.945,
    category: 'outpost',
  },
];
