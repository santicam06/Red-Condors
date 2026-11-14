import * as Cesium from 'cesium';
import { MARS_ELLIPSOID } from '../config/marsConfig';

export interface MarsLatLon {
  lat: number;
  lon: number;
}

const scratchCartesian = new Cesium.Cartesian3();
const scratchCartographic = new Cesium.Cartographic();
const scratchRay = new Cesium.Ray();
const scratchProjected = new Cesium.Cartesian3();

/**
 * Normalizes any longitude in degrees into East-positive [-180, 180],
 * matching NASA Mars Trek's bottom-right coordinate readout convention.
 */
export function normalizeLongitude180(lonDeg: number): number {
  const wrapped = ((((lonDeg + 180) % 360) + 360) % 360) - 180;
  // Avoid displaying "-0.00000°"
  return Object.is(wrapped, -0) ? 0 : wrapped;
}

/**
 * Raycasts a 2D canvas pixel position onto the Martian surface in either
 * `SceneMode.SCENE3D` (3D Globe) or `SceneMode.SCENE2D` (2D Equirectangular Map).
 *
 * Returns `{ lat, lon }` in degrees when the cursor is ON Mars, or `null` when
 * the cursor is over the black space background (off-globe or outside 2D map bounds).
 */
export function pickMarsCoordinates(
  viewer: Cesium.Viewer,
  windowPosition: Cesium.Cartesian2
): MarsLatLon | null {
  const { scene, camera } = viewer;
  if (scene.isDestroyed()) return null;

  // Guard against out-of-canvas coordinates
  const canvas = scene.canvas;
  if (
    windowPosition.x < 0 ||
    windowPosition.y < 0 ||
    windowPosition.x > canvas.clientWidth ||
    windowPosition.y > canvas.clientHeight
  ) {
    return null;
  }

  if (scene.mode === Cesium.SceneMode.SCENE2D) {
    // In 2D mode, unproject the orthographic pick ray directly against GeographicProjection
    // so we accurately catch polar black space (|lat| > 90°) and non-infinite horizontal bounds.
    const ray = camera.getPickRay(windowPosition, scratchRay);
    if (!ray) return null;

    Cesium.Cartesian3.fromElements(ray.origin.y, ray.origin.z, 0.0, scratchProjected);
    const carto = scene.mapProjection.unproject(scratchProjected, scratchCartographic);
    if (!carto) return null;

    const latDeg = Cesium.Math.toDegrees(carto.latitude);
    const rawLonDeg = Cesium.Math.toDegrees(carto.longitude);

    if (!Number.isFinite(latDeg) || !Number.isFinite(rawLonDeg)) {
      return null;
    }

    // Above +90° North or below -90° South is black space in 2D mode
    if (latDeg < -90 || latDeg > 90) {
      return null;
    }

    // If 2D mode is ever switched to non-wrapping ROTATE mode, reject beyond ±180° horizontally too
    if (
      scene.mapMode2D === Cesium.MapMode2D.ROTATE &&
      (rawLonDeg < -180 || rawLonDeg > 180)
    ) {
      return null;
    }

    return {
      lat: latDeg,
      lon: normalizeLongitude180(rawLonDeg),
    };
  }

  // 3D Globe mode: ray-ellipsoid intersection returns undefined whenever cursor is over black space
  const hit = camera.pickEllipsoid(windowPosition, MARS_ELLIPSOID, scratchCartesian);
  if (!hit) {
    return null;
  }

  const carto = MARS_ELLIPSOID.cartesianToCartographic(hit, scratchCartographic);
  if (!carto) {
    return null;
  }

  const latDeg = Cesium.Math.toDegrees(carto.latitude);
  const lonDeg = normalizeLongitude180(Cesium.Math.toDegrees(carto.longitude));

  if (!Number.isFinite(latDeg) || !Number.isFinite(lonDeg)) {
    return null;
  }

  return { lat: latDeg, lon: lonDeg };
}
