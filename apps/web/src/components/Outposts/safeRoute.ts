import * as Cesium from 'cesium';
import { MARS_ELLIPSOID } from '../../config/marsConfig';
import { MARSWALK_KMH, ROVER_KMH, type TravelMode } from './navigation';
import type { OlympusSite } from './olympusSites';
import {
  cellCenter,
  cellOf,
  cellSpacing,
  dustOpticalDepth,
  elevationAtCell,
  molaShape,
  slopeDegrees,
  type DustSeason,
} from './terrain';

/**
 * Rehearsal limits, not flight rules.
 * Walking stops at 15° so a suited crew is not sent up a cliff.
 * The rover stops at 25°, under the ~30° grade quoted for this class of vehicle.
 * Dust is 9.3 μm column optical depth normalized to 610 Pa.
 * About 0.1 is clear. Near 1 is a regional dust storm.
 */
const LIMITS: Record<TravelMode, { slopeDeg: number; tau: number; speedKmh: number }> = {
  marswalk: { slopeDeg: 15, tau: 1, speedKmh: MARSWALK_KMH },
  rover: { slopeDeg: 25, tau: 1.3, speedKmh: ROVER_KMH },
};

export interface ModeRoute {
  mode: TravelMode;
  reachable: boolean;
  distanceMeters: number;
  durationHours: number;
  maxSlopeDeg: number;
  maxTau: number;
  climbMeters: number;
  positions: Cesium.Cartesian3[];
  note: string;
}

export interface TraverseReport {
  season: DustSeason;
  directDistanceMeters: number;
  directMaxSlopeDeg: number;
  directMaxTau: number;
  directBlocked: boolean;
  directPositions: Cesium.Cartesian3[];
  rover: ModeRoute;
  marswalk: ModeRoute;
  recommendation: string;
}

export function assessTraverse(
  from: OlympusSite,
  to: OlympusSite,
  season: DustSeason
): TraverseReport {
  const direct = sampleDirect(from, to, season);
  const rover = routeMode(from, to, 'rover', season, direct);
  const marswalk = routeMode(from, to, 'marswalk', season, direct);
  return {
    season,
    ...direct,
    rover,
    marswalk,
    recommendation: recommend(direct.directBlocked, direct.directMaxSlopeDeg, rover, marswalk, season),
  };
}

function sampleDirect(from: OlympusSite, to: OlympusSite, season: DustSeason) {
  const geodesic = new Cesium.EllipsoidGeodesic(
    Cesium.Cartographic.fromDegrees(from.lonEast, from.lat),
    Cesium.Cartographic.fromDegrees(to.lonEast, to.lat),
    MARS_ELLIPSOID
  );
  const steps = 80;
  const directPositions: Cesium.Cartesian3[] = [];
  let directMaxSlopeDeg = 0;
  let directMaxTau = 0;
  let prev: { row: number; col: number } | null = null;

  for (let i = 0; i <= steps; i += 1) {
    const carto = geodesic.interpolateUsingFraction(i / steps);
    const lat = Cesium.Math.toDegrees(carto.latitude);
    const lon = Cesium.Math.toDegrees(carto.longitude);
    const lonEast = lon < 0 ? lon + 360 : lon;
    directPositions.push(Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, 0, MARS_ELLIPSOID));
    directMaxTau = Math.max(directMaxTau, dustOpticalDepth(lat, lonEast, season));
    const cell = cellOf(lat, lonEast);
    if (cell && prev) {
      directMaxSlopeDeg = Math.max(directMaxSlopeDeg, slopeDegrees(prev.row, prev.col, cell.row, cell.col));
    }
    if (cell) prev = cell;
  }

  const directBlocked = directMaxSlopeDeg > LIMITS.rover.slopeDeg || directMaxTau > LIMITS.rover.tau;
  return {
    directDistanceMeters: geodesic.surfaceDistance,
    directMaxSlopeDeg,
    directMaxTau,
    directBlocked,
    directPositions,
  };
}

function routeMode(
  from: OlympusSite,
  to: OlympusSite,
  mode: TravelMode,
  season: DustSeason,
  direct: { directMaxSlopeDeg: number; directBlocked: boolean }
): ModeRoute {
  const limit = LIMITS[mode];
  const path = shortestSafePath(from, to, mode, season);
  if (!path) {
    const why =
      direct.directMaxSlopeDeg > limit.slopeDeg
        ? `No ${mode === 'rover' ? 'rover' : 'walking'} route stays under ${limit.slopeDeg}° and dust ${limit.tau.toFixed(1)}.`
        : `Dust or the grade closes every corridor for a ${mode === 'rover' ? 'rover' : 'Marswalk'}.`;
    return {
      mode,
      reachable: false,
      distanceMeters: 0,
      durationHours: Number.POSITIVE_INFINITY,
      maxSlopeDeg: direct.directMaxSlopeDeg,
      maxTau: 0,
      climbMeters: 0,
      positions: [],
      note: why,
    };
  }

  let distanceMeters = 0;
  let durationHours = 0;
  let maxSlopeDeg = 0;
  let maxTau = 0;
  let climbMeters = 0;
  const positions: Cesium.Cartesian3[] = [];

  for (let i = 0; i < path.length; i += 1) {
    const { row, col } = path[i];
    const center = cellCenter(row, col);
    positions.push(
      Cesium.Cartesian3.fromDegrees(center.lonEast, center.lat, 0, MARS_ELLIPSOID)
    );
    const tau = dustOpticalDepth(center.lat, center.lonEast, season);
    maxTau = Math.max(maxTau, tau);
    if (i === 0) continue;
    const prev = path[i - 1];
    const spacing = cellSpacing(prev.row, prev.col, row, col);
    const rise = elevationAtCell(row, col) - elevationAtCell(prev.row, prev.col);
    const slope = slopeDegrees(prev.row, prev.col, row, col);
    maxSlopeDeg = Math.max(maxSlopeDeg, slope);
    if (rise > 0) climbMeters += rise;
    distanceMeters += spacing;
    const speed = slowedSpeed(limit.speedKmh, slope, limit.slopeDeg, tau, mode);
    durationHours += spacing / 1000 / speed;
  }

  const detour = direct.directBlocked ? 'The straight line is rejected. ' : '';
  return {
    mode,
    reachable: true,
    distanceMeters,
    durationHours,
    maxSlopeDeg,
    maxTau,
    climbMeters,
    positions,
    note: `${detour}Max grade ${maxSlopeDeg.toFixed(0)}°, max dust ${maxTau.toFixed(2)}, climb ${Math.round(climbMeters).toLocaleString('en-US')} m.`,
  };
}

function slowedSpeed(
  baseKmh: number,
  slopeDeg: number,
  slopeLimit: number,
  tau: number,
  mode: TravelMode
): number {
  const grade = Math.max(0.4, 1 - slopeDeg / slopeLimit);
  const dustWeight = mode === 'marswalk' ? 1 : 0.55;
  const dust = 1 / (1 + dustWeight * Math.max(0, tau));
  return Math.max(0.2, baseKmh * grade * dust);
}

function shortestSafePath(
  from: OlympusSite,
  to: OlympusSite,
  mode: TravelMode,
  season: DustSeason
): Array<{ row: number; col: number }> | null {
  const start = cellOf(from.lat, from.lonEast);
  const goal = cellOf(to.lat, to.lonEast);
  if (!start || !goal) return null;
  const { rows, cols } = molaShape();
  const limit = LIMITS[mode];
  const startKey = start.row * cols + start.col;
  const goalKey = goal.row * cols + goal.col;
  if (startKey === goalKey) return [start];

  const heuristic = (key: number) => {
    const row = Math.floor(key / cols);
    const col = key - row * cols;
    return cellSpacing(row, col, goal.row, goal.col) / 1000 / limit.speedKmh;
  };

  const heap: Array<{ f: number; g: number; key: number }> = [];
  const push = (item: { f: number; g: number; key: number }) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent].f <= heap[i].f) break;
      const swap = heap[parent];
      heap[parent] = heap[i];
      heap[i] = swap;
      i = parent;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (!last || heap.length === 0) return top;
    heap[0] = last;
    let i = 0;
    for (;;) {
      const left = i * 2 + 1;
      const right = left + 1;
      let smallest = i;
      if (left < heap.length && heap[left].f < heap[smallest].f) smallest = left;
      if (right < heap.length && heap[right].f < heap[smallest].f) smallest = right;
      if (smallest === i) break;
      const swap = heap[smallest];
      heap[smallest] = heap[i];
      heap[i] = swap;
      i = smallest;
    }
    return top;
  };

  const best = new Float64Array(rows * cols);
  best.fill(Number.POSITIVE_INFINITY);
  const parent = new Int32Array(rows * cols);
  parent.fill(-1);
  const closed = new Uint8Array(rows * cols);
  best[startKey] = 0;
  push({ f: heuristic(startKey), g: 0, key: startKey });

  const neighbors = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1],
  ];

  while (heap.length > 0) {
    const current = pop();
    if (!current || closed[current.key]) continue;
    if (current.key === goalKey) break;
    closed[current.key] = 1;
    const row = Math.floor(current.key / cols);
    const col = current.key - row * cols;
    const here = cellCenter(row, col);
    const tauHere = dustOpticalDepth(here.lat, here.lonEast, season);

    for (let n = 0; n < neighbors.length; n += 1) {
      const nr = row + neighbors[n][0];
      const nc = col + neighbors[n][1];
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
      const slope = slopeDegrees(row, col, nr, nc);
      if (slope > limit.slopeDeg) continue;
      const nextCenter = cellCenter(nr, nc);
      const tau = Math.max(tauHere, dustOpticalDepth(nextCenter.lat, nextCenter.lonEast, season));
      if (tau > limit.tau) continue;
      const spacing = cellSpacing(row, col, nr, nc);
      const hours = spacing / 1000 / slowedSpeed(limit.speedKmh, slope, limit.slopeDeg, tau, mode);
      const nextKey = nr * cols + nc;
      const g = current.g + hours;
      if (g >= best[nextKey]) continue;
      best[nextKey] = g;
      parent[nextKey] = current.key;
      push({ f: g + heuristic(nextKey), g, key: nextKey });
    }
  }

  if (parent[goalKey] === -1 && startKey !== goalKey) return null;
  const cells: Array<{ row: number; col: number }> = [];
  let cursor = goalKey;
  cells.push({ row: Math.floor(cursor / cols), col: cursor % cols });
  while (cursor !== startKey) {
    cursor = parent[cursor];
    if (cursor < 0) return null;
    cells.push({ row: Math.floor(cursor / cols), col: cursor % cols });
  }
  cells.reverse();
  return cells;
}

function recommend(
  directBlocked: boolean,
  directSlope: number,
  rover: ModeRoute,
  walk: ModeRoute,
  season: DustSeason
): string {
  const seasonNote =
    season === 'storm'
      ? 'This uses the dust-storm map.'
      : 'Present-season dust over Olympus is light, so the grade decides the path.';
  if (!rover.reachable && !walk.reachable) {
    return `Neither a rover nor a Marswalk can take this leg. The straight line reaches ${directSlope.toFixed(0)}°. ${seasonNote}`;
  }
  if (rover.reachable && !walk.reachable) {
    return `Send the rover. The walk is closed by slope or dust. ${seasonNote}`;
  }
  if (!rover.reachable && walk.reachable) {
    return `Only the walking corridor stays inside the limits. ${seasonNote}`;
  }
  const walkDays = walk.durationHours / 24;
  if (walk.durationHours > 8) {
    return `Drive it. Both can stay on a safe grade${directBlocked ? ` (the straight line hits ${directSlope.toFixed(0)}°)` : ''}, but the walk is about ${walkDays.toFixed(1)} days, past a single EVA. ${seasonNote}`;
  }
  return `Either mode can take the safe corridor. The walk is short enough for one EVA. ${seasonNote}`;
}
