import * as Cesium from 'cesium';
import {
  MARS_CIRCUMFERENCE_METERS,
  MARS_ELLIPSOID,
} from '../config/marsConfig';

export interface MarsLatLon {
  lat: number;
  lon: number;
}

const scratchCartesian = new Cesium.Cartesian3();
const scratchCartographic = new Cesium.Cartographic();
const scratchRay = new Cesium.Ray();
const scratchProjected = new Cesium.Cartesian3();
const scratchWorldPos = new Cesium.Cartesian3();
const scratchOccludeePos = new Cesium.Cartesian3();
const defaultOccluderEllipsoid = new Cesium.Ellipsoid(
  MARS_ELLIPSOID.radii.x - 1500,
  MARS_ELLIPSOID.radii.y - 1500,
  MARS_ELLIPSOID.radii.z - 1500
);
const defaultOccluder = new Cesium.EllipsoidalOccluder(
  defaultOccluderEllipsoid,
  Cesium.Cartesian3.ZERO
);

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

/**
 * Projects a Martian `(lonDeg, latDeg)` surface point into canvas CSS pixels
 * across both `SCENE3D` and `SCENE2D`.
 *
 * In `SCENE2D`, this bypasses `Cesium.SceneTransforms.worldToWindowCoordinates`
 * (which clones frustums and mutates camera matrices whenever ±180° is visible)
 * and computes exact equirectangular orthographic window coordinates in O(1)
 * with zero heap allocations.
 */
export function projectMarsLatLonToWindow(
  viewer: Cesium.Viewer,
  lonDeg: number,
  latDeg: number,
  result: Cesium.Cartesian2,
  referenceScreenX?: number,
  occluder?: Cesium.EllipsoidalOccluder | null
): Cesium.Cartesian2 | null {
  const { scene, camera } = viewer;
  if (scene.isDestroyed()) return null;

  const canvas = scene.canvas;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width <= 0 || height <= 0) return null;

  if (scene.mode === Cesium.SceneMode.SCENE2D) {
    const frustum = camera.frustum;
    if (
      !(frustum instanceof Cesium.OrthographicOffCenterFrustum) ||
      typeof frustum.right !== 'number' ||
      typeof frustum.left !== 'number' ||
      typeof frustum.top !== 'number' ||
      typeof frustum.bottom !== 'number'
    ) {
      return null;
    }

    const frustumW = frustum.right - frustum.left;
    const frustumH = frustum.top - frustum.bottom;
    if (frustumW <= 0 || frustumH <= 0) return null;

    const radius = MARS_ELLIPSOID.maximumRadius;
    const projX = Cesium.Math.toRadians(lonDeg) * radius;
    const projY = Cesium.Math.toRadians(latDeg) * radius;

    let dx = projX - camera.positionWC.y;
    const dy = projY - camera.positionWC.z;

    const infiniteScroll = scene.mapMode2D === Cesium.MapMode2D.INFINITE_SCROLL;
    if (infiniteScroll) {
      const circ = MARS_CIRCUMFERENCE_METERS;
      const halfCirc = circ * 0.5;
      dx = ((((dx + halfCirc) % circ) + circ) % circ) - halfCirc;
    }

    let winX = ((dx - frustum.left) / frustumW) * width;
    const winY = ((frustum.top - dy) / frustumH) * height;

    if (infiniteScroll && referenceScreenX !== undefined) {
      const circPx = (MARS_CIRCUMFERENCE_METERS / frustumW) * width;
      if (circPx > 0) {
        const deltaPx = winX - referenceScreenX;
        if (deltaPx > circPx * 0.5) {
          winX -= circPx;
        } else if (deltaPx < -circPx * 0.5) {
          winX += circPx;
        }
      }
    }

    if (!Number.isFinite(winX) || !Number.isFinite(winY)) return null;
    return Cesium.Cartesian2.fromElements(winX, winY, result);
  }

  Cesium.Cartesian3.fromDegrees(lonDeg, latDeg, 0, MARS_ELLIPSOID, scratchWorldPos);
  Cesium.Cartesian3.fromDegrees(lonDeg, latDeg, 250, MARS_ELLIPSOID, scratchOccludeePos);

  const activeOccluder = occluder ?? defaultOccluder;
  if (!occluder) {
    defaultOccluder.cameraPosition = camera.positionWC;
  }
  if (!activeOccluder.isPointVisible(scratchOccludeePos)) {
    return null;
  }

  const win = Cesium.SceneTransforms.worldToWindowCoordinates(
    scene,
    scratchWorldPos,
    result
  );
  if (!win || !Number.isFinite(win.x) || !Number.isFinite(win.y)) {
    return null;
  }
  return win;
}
