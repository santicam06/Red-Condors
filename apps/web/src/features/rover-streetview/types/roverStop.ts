/** Mirrors `apps/api/app/modules/rover_images/schemas.py`. */

export interface PanoramaInfo {
  /** Relative API URL of the browser-sized JPEG (NASA image, resized only). */
  url: string;
  /** PDS product identifier of the original mosaic. */
  product_id: string;
  /** Sol the mosaic was acquired. */
  capture_sol: number;
  instrument: string;
  /** Original full-size product on the PDS Imaging Node. */
  source_url: string;
  /** PDS4 XML label with the mosaic's metadata. */
  label_url: string;
  /** Azimuth coverage in degrees (0° = north, clockwise, rover site frame). */
  az_min: number;
  az_max: number;
  /** Elevation coverage in degrees (0° = horizon, positive = up). */
  el_min: number;
  el_max: number;
}

export interface SampleInfo {
  sample_numbers: string;
  names: string;
  outcrop: string;
  area: string;
  type: string;
  rock_type: string;
  date: string;
  sols: string;
  source_url: string;
}

export interface Provenance {
  position_source_url: string;
  position_key: string;
  milestone_source_url: string;
}

export interface RoverStop {
  id: string;
  /** Position in the curated tour (1-based). */
  order: number;
  title: string;
  summary: string;
  rover: string;
  /** Sol the rover arrived at this position. */
  sol: number;
  site: number;
  drive: number;
  lat: number;
  lon: number;
  credit: string;
  sample: SampleInfo | null;
  panorama: PanoramaInfo;
  provenance: Provenance;
}

export interface NearestStop {
  stop: RoverStop;
  distance_m: number;
}

export type StreetViewAvatar = 'astronaut' | 'rover';
