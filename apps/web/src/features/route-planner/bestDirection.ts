import * as Cesium from 'cesium';
import { formatDuration, planTraverse } from '../../components/Outposts/navigation';
import type { OlympusSite } from '../../components/Outposts/olympusSites';
import { cellOf } from '../../components/Outposts/terrain';
import {
  cruiseEnergy,
  energySentence,
  ENERGY_PROFILE,
  minimumEnergyPath,
  type MechanicalEnergy,
} from './energyPath';
import type { TravelMode } from './types';

const EVA_HOURS = 8;

const SPEEDS: Record<TravelMode, number> = {
  marswalk: ENERGY_PROFILE.marswalk.speedKmh,
  rover: ENERGY_PROFILE.rover.speedKmh,
  vehicle: ENERGY_PROFILE.vehicle.speedKmh,
};

export interface DirectionChoice {
  mode: TravelMode;
  reason: string;
  distanceKm: Record<TravelMode, number | null>;
  eta: Record<TravelMode, string | null>;
  energyNote: Record<TravelMode, string | null>;
  paths: Record<TravelMode, Cesium.Cartesian3[]>;
}

/**
 * Picks a rehearsal direction.
 * Inside the Olympus MOLA window each mode follows the corridor with the least
 * mechanical energy: potential from the climb, kinetic energy to reach cruise speed,
 * and the rolling work that holds that speed. A walk stops above 15°, the crew car
 * above 18°, and a rover above 25°. A walk that finishes inside 8 hours is preferred.
 * Otherwise the lower-energy of the car and the rover is marked Best.
 * Outside that window the line stays straight and the climb is not checked.
 * Dust does not change the choice.
 */
export function chooseBestDirection(from: OlympusSite, to: OlympusSite): DirectionChoice {
  const inside = cellOf(from.lat, from.lonEast) !== null && cellOf(to.lat, to.lonEast) !== null;
  if (!inside) return straightChoice(from, to);
  return windowChoice(from, to);
}

function straightChoice(from: OlympusSite, to: OlympusSite): DirectionChoice {
  const line = planTraverse(from, to, 'marswalk');
  const meters = line.distanceMeters;
  const personHours = meters / 1000 / SPEEDS.marswalk;
  const mode: TravelMode = personHours <= EVA_HOURS ? 'marswalk' : 'vehicle';
  const outside =
    'Outside the Olympus laser window the line stays straight, and the slope is not checked.';
  const reason =
    mode === 'marswalk'
      ? `Best is a walk. It finishes inside 8 hours. ${outside}`
      : `Best is the vehicle. A walk would pass 8 hours. ${outside}`;
  const energies = {
    marswalk: cruiseEnergy(meters, 'marswalk', line.positions),
    rover: cruiseEnergy(meters, 'rover', line.positions),
    vehicle: cruiseEnergy(meters, 'vehicle', line.positions),
  };
  return pack(mode, reason, line.positions, meters, meters, meters, energies, false);
}

function windowChoice(from: OlympusSite, to: OlympusSite): DirectionChoice {
  const line = planTraverse(from, to, 'marswalk');
  const walk = minimumEnergyPath(from, to, 'marswalk');
  const rover = minimumEnergyPath(from, to, 'rover');
  const vehicle = minimumEnergyPath(from, to, 'vehicle');
  const energies: Record<TravelMode, MechanicalEnergy | null> = {
    marswalk: walk,
    rover,
    vehicle,
  };

  const walkHours = walk ? walk.distanceM / 1000 / SPEEDS.marswalk : null;
  let mode: TravelMode;
  let reason: string;

  if (walk && walkHours !== null && walkHours <= EVA_HOURS) {
    mode = 'marswalk';
    reason = 'Best is a walk. It finishes inside 8 hours on the lowest-energy corridor.';
  } else if (vehicle && rover) {
    mode = vehicle.totalJ <= rover.totalJ ? 'vehicle' : 'rover';
    reason =
      mode === 'vehicle'
        ? 'Best is the vehicle. A walk would pass 8 hours, and the car uses less energy than the rover.'
        : 'Best is the rover. A walk would pass 8 hours, and the rover uses less energy than the car.';
  } else if (vehicle) {
    mode = 'vehicle';
    reason = 'Best is the vehicle. A walk would pass 8 hours, and it is the only corridor still under 18°.';
  } else if (rover) {
    mode = 'rover';
    reason = 'Best is the rover. A walk would pass 8 hours, and the vehicle has no corridor under 18°.';
  } else if (walk) {
    mode = 'marswalk';
    reason = 'Best is a walk. It is the only corridor under the slope limits, and it passes 8 hours.';
  } else {
    const straightHours = line.distanceMeters / 1000 / SPEEDS.marswalk;
    mode = straightHours <= EVA_HOURS ? 'marswalk' : 'vehicle';
    reason =
      'No corridor stays under the slope limits. The line stays straight so the crew can still see the leg.';
    return pack(
      mode,
      reason,
      line.positions,
      line.distanceMeters,
      line.distanceMeters,
      line.distanceMeters,
      {
        marswalk: cruiseEnergy(line.distanceMeters, 'marswalk', line.positions),
        rover: cruiseEnergy(line.distanceMeters, 'rover', line.positions),
        vehicle: cruiseEnergy(line.distanceMeters, 'vehicle', line.positions),
      },
      false
    );
  }

  return pack(
    mode,
    reason,
    line.positions,
    walk?.distanceM ?? null,
    rover?.distanceM ?? null,
    vehicle?.distanceM ?? null,
    energies,
    true,
    {
      marswalk: walk?.positions ?? [],
      rover: rover?.positions ?? [],
      vehicle: vehicle?.positions ?? [],
    }
  );
}

function pack(
  mode: TravelMode,
  reason: string,
  straight: Cesium.Cartesian3[],
  walkMeters: number | null,
  roverMeters: number | null,
  vehicleMeters: number | null,
  energies: Record<TravelMode, MechanicalEnergy | null>,
  checkedClimb: boolean,
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
  const energyNote = {
    marswalk: energies.marswalk ? energySentence(energies.marswalk, checkedClimb) : null,
    rover: energies.rover ? energySentence(energies.rover, checkedClimb) : null,
    vehicle: energies.vehicle ? energySentence(energies.vehicle, checkedClimb) : null,
  };
  return {
    mode,
    reason,
    distanceKm,
    eta,
    energyNote,
    paths: paths ?? { marswalk: straight, rover: straight, vehicle: straight },
  };
}

function etaFor(meters: number | null, mode: TravelMode): string | null {
  if (meters === null || meters <= 0) return null;
  return formatDuration(meters / 1000 / SPEEDS[mode]);
}
