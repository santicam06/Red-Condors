export interface ParsedCoordinates {
  lat: number;
  /** East-positive longitude in [-180, 180]. */
  lon: number;
}

const NUMBER = String.raw`([-+]?\d+(?:\.\d+)?)\s*°?\s*`;
const COORDS_RE = new RegExp(
  String.raw`^\s*${NUMBER}([NS])?\s*[,;\s]\s*${NUMBER}([EW])?\s*$`,
  'i'
);

/**
 * Parses a typed "lat, lon" pair such as `18.44, 77.45`, `18.44N 77.45E`,
 * `-4.6 137.4` or `18.65°N, 133.8°W`. Longitudes in 0–360 °E are accepted and
 * normalised to [-180, 180]. Returns null when the text is not a coordinate pair.
 */
export function parseCoordinates(text: string): ParsedCoordinates | null {
  const match = COORDS_RE.exec(text);
  if (!match) return null;

  let lat = Number(match[1]);
  let lon = Number(match[3]);
  if (match[2]?.toUpperCase() === 'S') lat = -Math.abs(lat);
  if (match[4]?.toUpperCase() === 'W') lon = -Math.abs(lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 360) return null;
  if (lon > 180) lon -= 360;
  return { lat, lon };
}
