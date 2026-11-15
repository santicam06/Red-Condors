import * as Cesium from 'cesium';
import { formatDuration, planTraverse } from '../../components/Outposts/navigation';
import type { OlympusSite } from '../../components/Outposts/olympusSites';
import { assessTraverse, type TraverseReport } from '../../components/Outposts/safeRoute';
import { cellOf } from '../../components/Outposts/terrain';
import type { TravelMode } from './types';

/** Suited walk, rover, and a hypothetical crew car. The car is not a NASA vehicle. */
export const PERSON_KMH = 1.5;
export const ROVER_CRUISE_KMH = 10;
export const VEHICLE_KMH = 25;
const EVA_HOURS = 8;
const VEHICLE_SLOPE_DEG = 18;

const SPEEDS: Record<TravelMode, number> = {
  marswalk: PERSON_KMH,
  rover: ROVER_CRUISE_KMH,
  vehicle: VEHICLE_KMH,
};

export interface DirectionChoice {
  mode: TravelMode;
  reason: string;
  distanceKm: Record<TravelMode, number | null>;
  eta: Record<TravelMode, string | null>;
  paths: Record<TravelMode, Cesium.Cartesian3[]>;
}

/**
 * Picks a rehearsal direction.
 * Inside the Olympus MOLA window, A* keeps a walk under 15°, the crew car under 18°,
 * and a rover under 25°. A walk that finishes inside 8 hours is preferred.
 * Outside that window the line stays straight and the slope is not checked.
 * Hours use cruise speed, so dust does not change the choice.
 */
export function chooseBestDirection(from: OlympusSite, to: OlympusSite): DirectionChoice {
  const inside = cellOf(from.lat, from.lonEast) !== null && cellOf(to.lat, to.lonEast) !== null;
  if (!inside) return straightChoice(from, to);
  return windowChoice(from, to, assessTraverse(from, to, 'current'));
}

function straightChoice(from: OlympusSite, to: OlympusSite): DirectionChoice {
  const line = planTraverse(from, to, 'marswalk');
  const meters = line.distanceMeters;
  const personHours = meters / 1000 / PERSON_KMH;
  const mode: TravelMode = personHours <= EVA_HOURS ? 'marswalk' : 'vehicle';
  const outside =
    'Outside the Olympus laser window the line stays straight, and the slope is not checked.';
  const reason =
    mode === 'marswalk'
      ? `Best is a walk. It finishes inside 8 hours. ${outside}`
      : `Best is the vehicle. A walk would pass 8 hours. ${outside}`;
  return pack(mode, reason, line.positions, meters, meters, meters);
}

function windowChoice(from: OlympusSite, to: OlympusSite, report: TraverseReport): DirectionChoice {
  const line = planTraverse(from, to, 'marswalk').positions;
  const walkMeters = report.marswalk.reachable ? report.marswalk.distanceMeters : null;
  const roverMeters = report.rover.reachable ? report.rover.distanceMeters : null;
  const vehicle = vehicleCorridor(report);

  const walkHours = walkMeters === null ? null : walkMeters / 1000 / PERSON_KMH;
  let mode: TravelMode;
  let reason: string;

  if (walkHours !== null && walkHours <= EVA_HOURS) {
    mode = 'marswalk';
    reason = 'Best is a walk. It finishes inside 8 hours.';
  } else if (vehicle) {
    mode = 'vehicle';
    reason = 'Best is the vehicle. A walk would pass 8 hours.';
  } else if (roverMeters !== null) {
    mode = 'rover';
    reason = 'Best is the rover. A walk would pass 8 hours, and the vehicle has no corridor under 18°.';
  } else if (walkMeters !== null) {
    mode = 'marswalk';
    reason = 'Best is a walk. It is the only corridor under the slope limits, and it passes 8 hours.';
  } else {
    const straightHours = report.directDistanceMeters / 1000 / PERSON_KMH;
    mode = straightHours <= EVA_HOURS ? 'marswalk' : 'vehicle';
    reason =
      'No corridor stays under the slope limits. The line stays straight so the crew can still see the leg.';
    return pack(
      mode,
      reason,
      line,
      report.directDistanceMeters,
      report.directDistanceMeters,
      report.directDistanceMeters
    );
  }

  return pack(
    mode,
    reason,
    line,
    walkMeters,
    roverMeters,
    vehicle?.meters ?? null,
    {
      marswalk: report.marswalk.reachable ? report.marswalk.positions : [],
      rover: report.rover.reachable ? report.rover.positions : [],
      vehicle: vehicle?.positions ?? [],
    }
  );
}

function vehicleCorridor(
  report: TraverseReport
): { meters: number; positions: Cesium.Cartesian3[] } | null {
  if (report.directMaxSlopeDeg <= VEHICLE_SLOPE_DEG && report.directPositions.length > 1) {
    return { meters: report.directDistanceMeters, positions: report.directPositions };
  }
  if (report.rover.reachable && report.rover.maxSlopeDeg <= VEHICLE_SLOPE_DEG) {
    return { meters: report.rover.distanceMeters, positions: report.rover.positions };
  }
  if (report.marswalk.reachable && report.marswalk.maxSlopeDeg <= VEHICLE_SLOPE_DEG) {
    return { meters: report.marswalk.distanceMeters, positions: report.marswalk.positions };
  }
  return null;
}

function pack(
  mode: TravelMode,
  reason: string,
  straight: Cesium.Cartesian3[],
  walkMeters: number | null,
  roverMeters: number | null,
  vehicleMeters: number | null,
  paths?: Record<TravelMode, Cesium.Cartesian3[]>
): DirectionChoice {
  const distanceKm = {
    marswalk: walkMeters === null ? null : walkMeters / 1000,
    rover: roverMeters === null ? null : roverMeters / 1000,
    vehicle: vehicleMeters === null ? null : vehicleMeters / 1000,
  };
  const eta = {
    marswalk: etaFor(walkMeters, 'marswalk'),
    rover: etaFor(roverMeters, 'rover'),
    vehicle: etaFor(vehicleMeters, 'vehicle'),
  };
  return {
    mode,
    reason,
    distanceKm,
    eta,
    paths: paths ?? { marswalk: straight, rover: straight, vehicle: straight },
  };
}

function etaFor(meters: number | null, mode: TravelMode): string | null {
  if (meters === null || meters <= 0) return null;
  return formatDuration(meters / 1000 / SPEEDS[mode]);
}
