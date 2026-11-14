/** Mirrors `apps/api/app/modules/rover_images/schemas.py`. */

export interface PanoramaInfo {
  /** Relative API URL of the browser-sized JPEG. */
  url: string;
  /** Original full-size product on the PDS Imaging Node. */
  source_url: string;
  /** Azimuth coverage in degrees (0° = north, clockwise, rover site frame). */
  az_min: number;
  az_max: number;
  /** Elevation coverage in degrees (0° = horizon, positive = up). */
  el_min: number;
  el_max: number;
}

export interface RoverStop {
  id: string;
  rover: string;
  sol: number;
  site: number;
  drive: number;
  lat: number;
  lon: number;
  credit: string;
  panorama: PanoramaInfo;
}

export interface NearestStop {
  stop: RoverStop;
  distance_m: number;
}

export type StreetViewAvatar = 'astronaut' | 'rover';
