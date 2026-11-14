import * as Cesium from 'cesium';
import { MARS_ELLIPSOID } from '../../config/marsConfig';
import type { OlympusSite } from './olympusSites';

/** Suited walking pace used for rehearsal ETAs. */
export const MARSWALK_KMH = 1.5;
/** Pressurized crew-rover cruise used for rehearsal ETAs. */
export const ROVER_KMH = 10;
/** Nominal suited EVA length before the traverse should be split or driven. */
export const EVA_LIMIT_HOURS = 8;

export type TravelMode = 'marswalk' | 'rover';

export interface TraversePlan {
  distanceMeters: number;
  durationHours: number;
  exceedsEva: boolean;
  positions: Cesium.Cartesian3[];
}

function geodesicBetween(from: OlympusSite, to: OlympusSite): Cesium.EllipsoidGeodesic {
  return new Cesium.EllipsoidGeodesic(
    Cesium.Cartographic.fromDegrees(from.lonEast, from.lat),
    Cesium.Cartographic.fromDegrees(to.lonEast, to.lat),
    MARS_ELLIPSOID
  );
}

/**
 * Straight-line distance and ETA on the IAU 2000 Mars ellipsoid.
 * Slope and dust are applied in `safeRoute.ts`, which may replace this line.
 */
export function planTraverse(
  from: OlympusSite,
  to: OlympusSite,
  mode: TravelMode
): TraversePlan {
  const geodesic = geodesicBetween(from, to);
  const distanceMeters = geodesic.surfaceDistance;
  const speedKmh = mode === 'marswalk' ? MARSWALK_KMH : ROVER_KMH;
  const durationHours = distanceMeters / 1000 / speedKmh;

  const steps = Math.max(24, Math.min(96, Math.round(distanceMeters / 8_000)));
  const positions: Cesium.Cartesian3[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const carto = geodesic.interpolateUsingFraction(i / steps);
    positions.push(
      Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, 0, MARS_ELLIPSOID)
    );
  }

  return {
    distanceMeters,
    durationHours,
    exceedsEva: mode === 'marswalk' && durationHours > EVA_LIMIT_HOURS,
    positions,
  };
}

/** Camera height that frames a surface segment with padding. */
export function altitudeForTraverse(distanceMeters: number): number {
  return Math.min(2_200_000, Math.max(18_000, distanceMeters * 2.2));
}

export function midpointAltitude(from: OlympusSite, to: OlympusSite, altitudeMeters: number): {
  lon: number;
  lat: number;
  altitudeMeters: number;
} {
  const geodesic = geodesicBetween(from, to);
  const mid = geodesic.interpolateUsingFraction(0.5);
  return {
    lon: Cesium.Math.toDegrees(mid.longitude),
    lat: Cesium.Math.toDegrees(mid.latitude),
    altitudeMeters,
  };
}

export function formatDistance(meters: number): string {
  const km = meters / 1000;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString('en-US')} km`;
}

export function formatDuration(hours: number): string {
  if (!Number.isFinite(hours)) return '—';
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}
