import '@photo-sphere-viewer/core/index.css';
import { Viewer } from '@photo-sphere-viewer/core';
import { ArrowLeft, Compass, ExternalLink, MapPin } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { azimuthToYawRad, buildPanoData, compassLabel, yawToAzimuthDeg } from '../lib/panoData';
import { useStreetViewStore } from '../store/useStreetViewStore';
import type { RoverStop } from '../types/roverStop';

type LoadState = 'loading' | 'ready' | 'error';

function initialAzimuth(stop: RoverStop): number {
  const { az_min, az_max } = stop.panorama;
  // Full panoramas start facing north; partial ones start at the middle of their coverage.
  return az_max - az_min >= 350 ? 0 : (az_min + az_max) / 2;
}

/** Full-screen ground-level 360° view of the active rover stop. */
export function StreetViewPanel() {
  const stop = useStreetViewStore((s) => s.activeStop);
  const close = useStreetViewStore((s) => s.close);

  useEffect(() => {
    if (!stop) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stop, close]);

  if (!stop) return null;
  return <StreetViewScene key={stop.id} stop={stop} onClose={close} />;
}

function StreetViewScene({ stop, onClose }: { stop: RoverStop; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [azimuth, setAzimuth] = useState(() => initialAzimuth(stop));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const viewer = new Viewer({
      container,
      panorama: stop.panorama.url,
      panoData: (image) => buildPanoData(stop.panorama, image),
      defaultYaw: azimuthToYawRad(initialAzimuth(stop)),
      defaultPitch: 0,
      defaultZoomLvl: 30,
      loadingTxt: '',
      navbar: ['zoom', 'move', 'fullscreen'],
      mousewheelCtrlKey: false,
    });

    viewer.addEventListener('panorama-loaded', () => setLoadState('ready'));
    viewer.addEventListener('panorama-error', () => setLoadState('error'));
    viewer.addEventListener('position-updated', ({ position }) =>
      setAzimuth(yawToAzimuthDeg(position.yaw))
    );

    return () => viewer.destroy();
  }, [stop]);

  const heading = Math.round(azimuth) % 360;

  return (
    <section
      aria-label={`360° view from ${stop.rover} on sol ${stop.sol}`}
      className="font-jetbrains fixed inset-0 z-30 bg-black"
    >
      <div ref={containerRef} className="absolute inset-0" />

      {loadState !== 'ready' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="max-w-sm border-2 border-red-700 bg-white px-5 py-4 text-center text-black shadow-2xl">
            {loadState === 'loading' ? (
              <>
                <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-red-700 border-t-transparent" />
                <p className="text-[13px] font-medium">Loading the rover’s 360° view…</p>
                <p className="mt-1 text-[11px] text-neutral-600">
                  First visit downloads the original panorama from NASA’s Planetary Data
                  System and can take ~30 s.
                </p>
              </>
            ) : (
              <p className="text-[13px]">
                Could not load this panorama. Check that the API is running, then try again.
              </p>
            )}
          </div>
        </div>
      )}

      <header className="absolute left-3 top-3 z-10 w-[min(340px,calc(100vw-1.5rem))] border-2 border-red-700 bg-white text-black shadow-2xl sm:left-4 sm:top-4">
        <div className="flex items-start gap-3 px-3.5 py-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to map"
            title="Back to map (Esc)"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center bg-red-700 text-white transition hover:bg-red-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-red-700">
              Rover Street View
            </div>
            <h2 className="text-[16px] font-medium capitalize leading-tight">
              {stop.rover} · Sol {stop.sol}
            </h2>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-neutral-600">
              <MapPin className="h-3 w-3 text-red-700" />
              {stop.lat.toFixed(5)}° N, {stop.lon.toFixed(5)}° E · Jezero Crater
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-red-700/25 px-3.5 py-2 text-[11px]">
          <span className="flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-red-700" style={{ transform: `rotate(${-heading}deg)` }} />
            Facing {compassLabel(heading)} {heading}°
          </span>
          <a
            href={stop.panorama.source_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-red-700 hover:underline"
          >
            Original <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </header>

      <p className="pointer-events-none absolute bottom-14 left-3 z-10 text-[10px] text-white/80 [text-shadow:0_1px_2px_black] sm:left-4">
        Courtesy {stop.credit} · Mars 2020 Navcam mosaic (PDS Imaging Node)
      </p>
    </section>
  );
}
