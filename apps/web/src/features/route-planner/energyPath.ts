import * as Cesium from 'cesium';
import { MARS_ELLIPSOID } from '../../config/marsConfig';
import type { OlympusSite } from '../../components/Outposts/olympusSites';
import {
  cellCenter,
  cellOf,
  cellSpacing,
  elevationAtCell,
  molaShape,
  slopeDegrees,
} from '../../components/Outposts/terrain';
import type { TravelMode } from './types';

/** Standard Mars surface gravity, metres per second squared. */
export const MARS_GRAVITY = 3.71;

/**
 * Rehearsal masses and rolling coefficients. They are not flight hardware.
 * The crew car is hypothetical and is not a NASA vehicle.
 * Rolling stands in for the resistance that would bleed kinetic energy off:
 * a suited walk, a rover on regolith, and the crew car.
 */
export const ENERGY_PROFILE: Record<
  TravelMode,
  { massKg: number; speedKmh: number; rolling: number; slopeDeg: number }
> = {
  marswalk: { massKg: 180, speedKmh: 1.5, rolling: 0.25, slopeDeg: 15 },
  rover: { massKg: 900, speedKmh: 10, rolling: 0.18, slopeDeg: 25 },
  vehicle: { massKg: 1500, speedKmh: 25, rolling: 0.12, slopeDeg: 18 },
};

export interface MechanicalEnergy {
  potentialJ: number;
  kineticJ: number;
  rollingJ: number;
  totalJ: number;
  climbM: number;
  distanceM: number;
  positions: Cesium.Cartesian3[];
}

/**
 * Energy the crew must supply on one leg.
 * Potential energy is m · g · climb (uphill only; braking throws downhill height away).
 * Kinetic energy is ½ m v², paid once to reach cruise speed.
 * Rolling work is Crr · m · g · distance, the work that keeps that speed from dying.
 */
export function ledger(
  distanceM: number,
  climbM: number,
  massKg: number,
  speedMps: number,
  rolling: number
): Pick<MechanicalEnergy, 'potentialJ' | 'kineticJ' | 'rollingJ' | 'totalJ' | 'climbM' | 'distanceM'> {
  const potentialJ = massKg * MARS_GRAVITY * Math.max(0, climbM);
  const kineticJ = 0.5 * massKg * speedMps * speedMps;
  const rollingJ = rolling * massKg * MARS_GRAVITY * Math.max(0, distanceM);
  return {
    potentialJ,
    kineticJ,
    rollingJ,
    totalJ: potentialJ + kineticJ + rollingJ,
    climbM: Math.max(0, climbM),
    distanceM: Math.max(0, distanceM),
  };
}

/** Straight-line energy when the elevation window is not available. Potential is omitted. */
export function cruiseEnergy(
  distanceM: number,
  mode: TravelMode,
  positions: Cesium.Cartesian3[]
): MechanicalEnergy {
  const profile = ENERGY_PROFILE[mode];
  const speedMps = profile.speedKmh / 3.6;
  return {
    ...ledger(distanceM, 0, profile.massKg, speedMps, profile.rolling),
    positions,
  };
}

/**
 * Lowest-energy corridor inside the Olympus MOLA window.
 * An edge steeper than the mode's slope limit is closed.
 * The search cost is potential plus rolling work. Kinetic energy is added once at the end,
 * so it does not bend the line.
 */
export function minimumEnergyPath(
  from: OlympusSite,
  to: OlympusSite,
  mode: TravelMode
): MechanicalEnergy | null {
  const profile = ENERGY_PROFILE[mode];
  const start = cellOf(from.lat, from.lonEast);
  const goal = cellOf(to.lat, to.lonEast);
  if (!start || !goal) return null;

  const { rows, cols } = molaShape();
  const startKey = start.row * cols + start.col;
  const goalKey = goal.row * cols + goal.col;
  const mass = profile.massKg;
  const rolling = profile.rolling;
  const g = MARS_GRAVITY;

  if (startKey === goalKey) {
    const center = cellCenter(start.row, start.col);
    return {
      ...ledger(0, 0, mass, profile.speedKmh / 3.6, rolling),
      positions: [Cesium.Cartesian3.fromDegrees(center.lonEast, center.lat, 0, MARS_ELLIPSOID)],
    };
  }

  const heuristic = (key: number) => {
    const row = Math.floor(key / cols);
    const col = key - row * cols;
    return rolling * mass * g * cellSpacing(row, col, goal.row, goal.col);
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
    const elev = elevationAtCell(row, col);

    for (let n = 0; n < neighbors.length; n += 1) {
      const nr = row + neighbors[n][0];
      const nc = col + neighbors[n][1];
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
      const slope = slopeDegrees(row, col, nr, nc);
      if (slope > profile.slopeDeg) continue;
      const spacing = cellSpacing(row, col, nr, nc);
      const rise = elevationAtCell(nr, nc) - elev;
      const step = mass * g * Math.max(0, rise) + rolling * mass * g * spacing;
      const nextKey = nr * cols + nc;
      const cost = current.g + step;
      if (cost >= best[nextKey]) continue;
      best[nextKey] = cost;
      parent[nextKey] = current.key;
      push({ f: cost + heuristic(nextKey), g: cost, key: nextKey });
    }
  }

  if (parent[goalKey] === -1) return null;

  const cells: Array<{ row: number; col: number }> = [];
  let cursor = goalKey;
  cells.push({ row: Math.floor(cursor / cols), col: cursor % cols });
  while (cursor !== startKey) {
    cursor = parent[cursor];
    if (cursor < 0) return null;
    cells.push({ row: Math.floor(cursor / cols), col: cursor % cols });
  }
  cells.reverse();

  let distanceM = 0;
  let climbM = 0;
  const positions: Cesium.Cartesian3[] = [];
  for (let i = 0; i < cells.length; i += 1) {
    const { row, col } = cells[i];
    const center = cellCenter(row, col);
    positions.push(Cesium.Cartesian3.fromDegrees(center.lonEast, center.lat, 0, MARS_ELLIPSOID));
    if (i === 0) continue;
    const prev = cells[i - 1];
    distanceM += cellSpacing(prev.row, prev.col, row, col);
    const rise = elevationAtCell(row, col) - elevationAtCell(prev.row, prev.col);
    if (rise > 0) climbM += rise;
  }

  return {
    ...ledger(distanceM, climbM, mass, profile.speedKmh / 3.6, rolling),
    positions,
  };
}

export function formatEnergy(joules: number): string {
  if (!Number.isFinite(joules)) return '—';
  const abs = Math.abs(joules);
  if (abs >= 1e9) return `${(joules / 1e9).toFixed(1)} GJ`;
  if (abs >= 1e6) return `${(joules / 1e6).toFixed(1)} MJ`;
  if (abs >= 1e3) return `${Math.round(joules / 1e3)} kJ`;
  return `${Math.round(joules)} J`;
}

/** One line the route bar can show for the path on screen. */
export function energySentence(energy: MechanicalEnergy, checkedClimb: boolean): string {
  const parts = `potential ${formatEnergy(energy.potentialJ)} (m × 3.71 × climb), kinetic ${formatEnergy(energy.kineticJ)} (½mv²), rolling ${formatEnergy(energy.rollingJ)}`;
  if (!checkedClimb) {
    return `Energy ${formatEnergy(energy.totalJ)}: kinetic ${formatEnergy(energy.kineticJ)} (½mv²) and rolling ${formatEnergy(energy.rollingJ)}. The climb is not in that total, because this leg is outside the laser window.`;
  }
  return `Energy ${formatEnergy(energy.totalJ)}: ${parts}.`;
}
