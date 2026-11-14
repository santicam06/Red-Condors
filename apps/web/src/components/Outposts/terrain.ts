import molaJson from './molaOlympus.json';
import dustJson from './dustSeason.json';

/** MGS MOLA topography, 16 pixels per degree, cropped to the Olympus rehearsal. */
const MOLA = molaJson as {
  ppd: number;
  latNorth: number;
  lonWest: number;
  rows: number;
  cols: number;
  elevLE: string;
};

const DUST = dustJson as {
  latitude: number[];
  longitude: number[];
  current: { ls: number; matchedEarthDate: string; matchedLs: number; tau: number[][] };
  storm: { ls: number; tau: number[][] };
};

export type DustSeason = 'current' | 'storm';

const MEAN_RADIUS_M = 3_396_190;

let elevation: Int16Array | null = null;

function elevations(): Int16Array {
  if (elevation) return elevation;
  const binary = atob(MOLA.elevLE);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  elevation = new Int16Array(buffer);
  return elevation;
}

export function molaShape(): { rows: number; cols: number } {
  return { rows: MOLA.rows, cols: MOLA.cols };
}

export function cellOf(lat: number, lonEast: number): { row: number; col: number } | null {
  const row = Math.floor((MOLA.latNorth - lat) * MOLA.ppd);
  const col = Math.floor((lonEast - MOLA.lonWest) * MOLA.ppd);
  if (row < 0 || col < 0 || row >= MOLA.rows || col >= MOLA.cols) return null;
  return { row, col };
}

export function cellCenter(row: number, col: number): { lat: number; lonEast: number } {
  return {
    lat: MOLA.latNorth - (row + 0.5) / MOLA.ppd,
    lonEast: MOLA.lonWest + (col + 0.5) / MOLA.ppd,
  };
}

export function elevationAtCell(row: number, col: number): number {
  return elevations()[row * MOLA.cols + col];
}

/** Horizontal distance between cell centers, meters. */
export function cellSpacing(row: number, col: number, row2: number, col2: number): number {
  const a = cellCenter(row, col);
  const b = cellCenter(row2, col2);
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lonEast - a.lonEast) * Math.PI) / 180;
  const cosLat = Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat * MEAN_RADIUS_M, dLon * MEAN_RADIUS_M * cosLat);
}

export function slopeDegrees(
  row: number,
  col: number,
  row2: number,
  col2: number
): number {
  const horizontal = cellSpacing(row, col, row2, col2);
  const rise = elevationAtCell(row2, col2) - elevationAtCell(row, col);
  return Math.abs((Math.atan2(rise, Math.max(horizontal, 1)) * 180) / Math.PI);
}

function toSignedLongitude(lonEast: number): number {
  let lon = lonEast;
  while (lon > 180) lon -= 360;
  while (lon < -180) lon += 360;
  return lon;
}

/** Column dust optical depth at 9.3 μm, normalized to 610 Pa. */
export function dustOpticalDepth(lat: number, lonEast: number, season: DustSeason): number {
  const grid = season === 'storm' ? DUST.storm.tau : DUST.current.tau;
  const lats = DUST.latitude;
  const lons = DUST.longitude;
  const lon = toSignedLongitude(lonEast);

  let i = 0;
  while (i < lats.length - 2 && lat < lats[i + 1]) i += 1;
  let j = 0;
  while (j < lons.length - 2 && lon > lons[j + 1]) j += 1;

  const latSpan = lats[i] - lats[i + 1];
  const lonSpan = lons[j + 1] - lons[j];
  const t = latSpan === 0 ? 0 : Math.min(1, Math.max(0, (lats[i] - lat) / latSpan));
  const u = lonSpan === 0 ? 0 : Math.min(1, Math.max(0, (lon - lons[j]) / lonSpan));
  const a = grid[i][j];
  const b = grid[i][j + 1];
  const c = grid[i + 1][j];
  const d = grid[i + 1][j + 1];
  return a * (1 - t) * (1 - u) + b * (1 - t) * u + c * t * (1 - u) + d * t * u;
}

export const DUST_SEASON_INFO = {
  current: {
    label: 'Present season',
    ls: DUST.current.ls,
    detail: `Ls ${DUST.current.ls.toFixed(1)}° from Mars Year 36, matched to ${DUST.current.matchedEarthDate} (Ls ${DUST.current.matchedLs}°). Not a live downlink.`,
  },
  storm: {
    label: 'Dust-storm season',
    ls: DUST.storm.ls,
    detail: `Ls ${DUST.storm.ls.toFixed(0)}° in Mars Year 36, the dustiest stretch of that year. A rehearsal, not today's weather.`,
  },
} as const;
