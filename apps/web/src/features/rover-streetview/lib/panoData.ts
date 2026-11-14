import type { PanoData } from '@photo-sphere-viewer/core';
import type { PanoramaInfo } from '../types/roverStop';

/**
 * Places a partial cylindrical rover panorama inside a full 360°×180° equirectangular
 * sphere for Photo Sphere Viewer.
 *
 * PDS Navcam "CYL" mosaics use the same angular resolution horizontally and vertically,
 * so the horizontal pixels-per-degree also defines the vertical placement.
 */
export function buildPanoData(
  pano: PanoramaInfo,
  image: { width: number; height: number }
): PanoData {
  const azSpan = Math.max(1, pano.az_max - pano.az_min);
  const pxPerDeg = image.width / azSpan;

  const fullWidth = Math.max(image.width, Math.round(360 * pxPerDeg));
  const fullHeight = Math.round(fullWidth / 2);

  const azStart = ((pano.az_min % 360) + 360) % 360;
  const croppedX = Math.min(Math.round(azStart * pxPerDeg), fullWidth - image.width);
  const croppedY = Math.min(
    Math.max(0, Math.round((90 - pano.el_max) * pxPerDeg)),
    Math.max(0, fullHeight - image.height)
  );

  return {
    isEquirectangular: true,
    fullWidth,
    fullHeight,
    croppedWidth: image.width,
    croppedHeight: Math.min(image.height, fullHeight),
    croppedX,
    croppedY,
  };
}

/**
 * Photo Sphere Viewer's yaw 0 looks at the centre of the full sphere, which is
 * azimuth 180° (south) in the rover site frame. Convert between the two.
 */
export function yawToAzimuthDeg(yawRad: number): number {
  const deg = (yawRad * 180) / Math.PI + 180;
  return ((deg % 360) + 360) % 360;
}

export function azimuthToYawRad(azimuthDeg: number): number {
  return ((azimuthDeg - 180) * Math.PI) / 180;
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function compassLabel(azimuthDeg: number): string {
  return COMPASS[Math.round(azimuthDeg / 45) % 8];
}
