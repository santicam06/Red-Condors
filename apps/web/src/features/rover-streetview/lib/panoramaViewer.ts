import '@photo-sphere-viewer/core/index.css';
import { events, Viewer } from '@photo-sphere-viewer/core';
import type { RoverStop } from '../types/roverStop';
import { azimuthToYawRad, buildPanoData, yawToAzimuthDeg } from './panoData';

/**
 * One long-lived Photo Sphere Viewer shared by every Street View stop.
 *
 * Creating a viewer costs a new WebGL context plus shader compilation (~1–2 s of
 * main-thread freeze). Keeping a single instance alive and only swapping its
 * panorama makes every open after the first one fast. The viewer lives in its own
 * element outside React, so React StrictMode remounts never create or destroy it.
 */

let host: HTMLDivElement | null = null;
let viewer: Viewer | null = null;
let headingListener: ((azimuthDeg: number) => void) | null = null;
let currentUrl: string | null = null;
const preloaded = new Set<string>();

function initialAzimuth(stop: RoverStop): number {
  const { az_min, az_max } = stop.panorama;
  // Full panoramas start facing north; partial ones at the middle of their coverage.
  return az_max - az_min >= 350 ? 0 : (az_min + az_max) / 2;
}

function ensureViewer(firstStop: RoverStop): Viewer {
  if (viewer) return viewer;

  host = document.createElement('div');
  host.className = 'rover-streetview-host';
  Object.assign(host.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '30',
    background: '#000',
    visibility: 'hidden',
    pointerEvents: 'none',
  });
  document.body.appendChild(host);

  currentUrl = firstStop.panorama.url;
  viewer = new Viewer({
    container: host,
    panorama: firstStop.panorama.url,
    panoData: (image) => buildPanoData(firstStop.panorama, image),
    defaultYaw: azimuthToYawRad(initialAzimuth(firstStop)),
    defaultPitch: 0,
    defaultZoomLvl: 30,
    loadingTxt: '',
    navbar: ['zoom', 'move', 'fullscreen'],
    mousewheelCtrlKey: false,
  });
  // three.js recompiles the panorama shader for every new panorama and, by default,
  // reads the compile logs synchronously, which blocks the page until the GPU finishes
  // (~0.5–1 s per panorama). PSV's built-in shaders are fixed, so the check is not
  // needed; three.js recommends disabling it outside development.
  viewer.renderer.setCustomRenderer((renderer) => {
    renderer.debug.checkShaderErrors = false;
    return renderer;
  });
  viewer.addEventListener('position-updated', ({ position }) =>
    headingListener?.(yawToAzimuthDeg(position.yaw))
  );
  return viewer;
}

function waitForFirstLoad(instance: Viewer): Promise<void> {
  return new Promise((resolve, reject) => {
    if (instance.state.ready && !instance.state.loadingPromise) {
      resolve();
      return;
    }
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = (event: events.PanoramaErrorEvent) => {
      cleanup();
      reject(event.error);
    };
    const cleanup = () => {
      instance.removeEventListener('panorama-loaded', onLoaded);
      instance.removeEventListener('panorama-error', onError);
    };
    instance.addEventListener('panorama-loaded', onLoaded);
    instance.addEventListener('panorama-error', onError);
  });
}

/**
 * Creates the viewer in the background (hidden) so the first open is fast.
 * Safe to call many times.
 */
export function prewarmPanoramaViewer(stop: RoverStop | undefined): void {
  if (!stop || viewer) return;
  ensureViewer(stop);
}

/** Shows the viewer with `stop`'s panorama. Resolves once it is on screen. */
export async function showPanorama(
  stop: RoverStop,
  onHeading: (azimuthDeg: number) => void
): Promise<void> {
  const created = !viewer;
  const instance = ensureViewer(stop);
  headingListener = onHeading;
  host!.style.visibility = 'visible';
  host!.style.pointerEvents = 'auto';

  if (created) {
    await waitForFirstLoad(instance);
  } else if (currentUrl === stop.panorama.url) {
    await waitForFirstLoad(instance);
    instance.rotate({ yaw: azimuthToYawRad(initialAzimuth(stop)), pitch: 0 });
  } else {
    currentUrl = stop.panorama.url;
    await instance.setPanorama(stop.panorama.url, {
      panoData: (image) => buildPanoData(stop.panorama, image),
      position: { yaw: azimuthToYawRad(initialAzimuth(stop)), pitch: 0 },
      zoom: 30,
      transition: false,
      showLoader: false,
    });
  }
  onHeading(initialAzimuth(stop));
}

/** Hides the viewer but keeps it (and its WebGL context) alive for the next stop. */
export function hidePanorama(): void {
  headingListener = null;
  if (!host) return;
  host.style.visibility = 'hidden';
  host.style.pointerEvents = 'none';
  if (viewer?.isFullscreenEnabled()) viewer.exitFullscreen();
}

/** Downloads panoramas in the background so Next/Previous open instantly. */
export function preloadPanoramas(stops: Array<RoverStop | undefined>): void {
  for (const stop of stops) {
    if (!stop || preloaded.has(stop.panorama.url)) continue;
    preloaded.add(stop.panorama.url);
    const img = new Image();
    img.decoding = 'async';
    img.src = stop.panorama.url;
  }
}
