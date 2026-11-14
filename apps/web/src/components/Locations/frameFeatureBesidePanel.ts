import * as Cesium from 'cesium';
import { MARS_ELLIPSOID } from '../../config/marsConfig';
import type { MarsViewerController } from '../../core/MarsViewerController';
import type { NomenclatureLabelHit } from '../../core/layers/NomenclatureManager';

/**
 * If the opened feature would sit under the details panel or off the canvas,
 * pan so it remains visible in the map area beside the panel. Zoom is unchanged.
 */
export function frameFeatureBesidePanel(
  controller: MarsViewerController,
  hit: NomenclatureLabelHit,
  panelWidthPx: number,
  leftEdgePx = 12
): void {
  const viewer = controller.viewer;
  if (viewer.isDestroyed()) return;

  const { scene, camera } = viewer;
  const position = Cesium.Cartesian3.fromDegrees(
    hit.longitude,
    hit.latitude,
    0,
    MARS_ELLIPSOID
  );
  const canvas = scene.canvas;
  const win = Cesium.SceneTransforms.worldToWindowCoordinates(scene, position);
  const freeLeft = leftEdgePx + panelWidthPx + 24;
  const freeRight = canvas.clientWidth - 28;
  const targetX = freeLeft + Math.max(0, freeRight - freeLeft) * 0.42;
  const targetY = canvas.clientHeight * 0.46;

  const visibleBesidePanel =
    win !== undefined &&
    Number.isFinite(win.x) &&
    Number.isFinite(win.y) &&
    win.x >= freeLeft &&
    win.x <= freeRight &&
    win.y >= 28 &&
    win.y <= canvas.clientHeight - 28;

  if (visibleBesidePanel) return;

  if (!win || !Number.isFinite(win.x) || !Number.isFinite(win.y)) {
    camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        hit.longitude,
        hit.latitude,
        controller.getEffectiveAltitudeMeters(),
        MARS_ELLIPSOID
      ),
      duration: 0.65,
    });
    return;
  }

  const metersPerPx = metersPerPixel(camera, canvas, position);
  if (metersPerPx === null) return;

  camera.moveLeft(-(win.x - targetX) * metersPerPx);
  camera.moveDown((win.y - targetY) * metersPerPx);
  scene.requestRender();
}

function metersPerPixel(
  camera: Cesium.Camera,
  canvas: HTMLCanvasElement,
  position: Cesium.Cartesian3
): number | null {
  const frustum = camera.frustum;
  if (
    frustum instanceof Cesium.OrthographicOffCenterFrustum &&
    typeof frustum.top === 'number' &&
    typeof frustum.bottom === 'number' &&
    canvas.clientHeight > 0
  ) {
    return Math.abs(frustum.top - frustum.bottom) / canvas.clientHeight;
  }
  if (
    frustum instanceof Cesium.PerspectiveFrustum &&
    typeof frustum.fovy === 'number' &&
    canvas.clientHeight > 0
  ) {
    const distance = Cesium.Cartesian3.distance(camera.positionWC, position);
    return (2 * distance * Math.tan(frustum.fovy / 2)) / canvas.clientHeight;
  }
  return null;
}
