/** Mirrors `apps/api/app/modules/routing/schemas.py`. */

export type RouteKind = 'shortest' | 'fastest' | 'safest';

export interface LatLon {
  lat: number;
  /** East-positive longitude in [-180, 180] */
  lon: number;
}

export interface RouteRequest {
  source: LatLon;
  destination: LatLon;
  /** Optional override of the server's traversable slope limit (degrees) */
  max_slope_deg?: number;
}

export interface Route {
  kind: RouteKind;
  /** Path vertices as [lon, lat, elevation_m] (elevation relative to the Mars areoid) */
  coordinates: [number, number, number][];
  distance_m: number;
  eta_rover_s: number;
  eta_eva_s: number;
  max_slope_deg: number;
  mean_slope_deg: number;
}

export interface RouteResponse {
  routes: Route[];
  dem_resolution_m: number;
  max_slope_deg: number;
  warnings: string[];
}
