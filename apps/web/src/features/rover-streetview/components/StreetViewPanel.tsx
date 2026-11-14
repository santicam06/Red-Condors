import '@photo-sphere-viewer/core/index.css';
import { Viewer } from '@photo-sphere-viewer/core';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Compass,
  ExternalLink,
  FlaskConical,
  MapPin,
} from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { azimuthToYawRad, buildPanoData, compassLabel, yawToAzimuthDeg } from '../lib/panoData';
import { useStreetViewStore } from '../store/useStreetViewStore';
import type { RoverStop } from '../types/roverStop';

type LoadState = 'loading' | 'ready' | 'error';

function initialAzimuth(stop: RoverStop): number {
  const { az_min, az_max } = stop.panorama;
  // Full panoramas start facing north; partial ones start at the middle of their coverage.
  return az_max - az_min >= 350 ? 0 : (az_min + az_max) / 2;
}

function createViewer(
  container: HTMLDivElement,
  stop: RoverStop,
  handlers: { onLoaded: () => void; onError: () => void; onAzimuth: (deg: number) => void }
): Viewer {
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
  viewer.addEventListener('panorama-loaded', handlers.onLoaded);
  viewer.addEventListener('panorama-error', handlers.onError);
  viewer.addEventListener('position-updated', ({ position }) =>
    handlers.onAzimuth(yawToAzimuthDeg(position.yaw))
  );
  return viewer;
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

function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-0.5 text-red-700 hover:underline"
    >
      {children}
      <ExternalLink className="h-2.5 w-2.5" />
    </a>
  );
}

function StreetViewScene({ stop, onClose }: { stop: RoverStop; onClose: () => void }) {
  const stops = useStreetViewStore((s) => s.stops);
  const open = useStreetViewStore((s) => s.open);
  const previous = stops.find((s) => s.order === stop.order - 1);
  const next = stops.find((s) => s.order === stop.order + 1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [azimuth, setAzimuth] = useState(() => initialAzimuth(stop));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create the viewer one tick later. React StrictMode mounts, unmounts and remounts
    // synchronously; three.js shares in-flight downloads between loaders of the same URL,
    // so destroying a throwaway viewer would abort the real viewer's download and leave
    // it stuck on "loading" forever (PSV swallows abort errors silently).
    let viewer: Viewer | null = null;
    const timer = window.setTimeout(() => {
      viewer = createViewer(container, stop, {
        onLoaded: () => setLoadState('ready'),
        onError: () => setLoadState('error'),
        onAzimuth: setAzimuth,
      });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      viewer?.destroy();
    };
  }, [stop]);

  const heading = Math.round(azimuth) % 360;
  const pano = stop.panorama;

  return (
    <section
      aria-label={`360° view: ${stop.title}`}
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

      <aside className="absolute left-3 top-3 z-10 max-h-[calc(100vh-5rem)] w-[min(360px,calc(100vw-1.5rem))] overflow-y-auto border-2 border-red-700 bg-white text-black shadow-2xl sm:left-4 sm:top-4">
        <header className="flex items-start gap-3 px-3.5 py-3">
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
              Perseverance tour · Stop {stop.order} of {stops.length}
            </div>
            <h2 className="text-[16px] font-medium leading-tight">{stop.title}</h2>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-neutral-600">
              <MapPin className="h-3 w-3 shrink-0 text-red-700" />
              Sol {stop.sol} · {stop.lat.toFixed(5)}° N, {stop.lon.toFixed(5)}° E · Jezero
            </p>
          </div>
        </header>

        <div className="space-y-3 border-t border-red-700/25 px-3.5 py-3 text-[12px] leading-snug">
          <p>{stop.summary}</p>

          {stop.sample && (
            <div className="border border-red-700/30 bg-red-50 p-2.5 text-[11px]">
              <div className="mb-1 flex items-center gap-1.5 font-semibold text-red-700">
                <FlaskConical className="h-3.5 w-3.5" />
                Sample {stop.sample.sample_numbers}: {stop.sample.names}
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
                <dt className="text-neutral-500">Type</dt>
                <dd>
                  {stop.sample.type} · {stop.sample.rock_type}
                </dd>
                <dt className="text-neutral-500">Outcrop</dt>
                <dd>
                  {stop.sample.outcrop} ({stop.sample.area})
                </dd>
                <dt className="text-neutral-500">Collected</dt>
                <dd>
                  {stop.sample.date} (sol {stop.sample.sols})
                </dd>
              </dl>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={!previous}
              onClick={() => previous && open(previous)}
              className="flex cursor-pointer items-center gap-1 border border-red-700 px-2 py-1 text-[11px] text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <span className="flex items-center gap-1.5 text-[11px]">
              <Compass
                className="h-3.5 w-3.5 text-red-700"
                style={{ transform: `rotate(${-heading}deg)` }}
              />
              {compassLabel(heading)} {heading}°
            </span>
            <button
              type="button"
              disabled={!next}
              onClick={() => next && open(next)}
              className="flex cursor-pointer items-center gap-1 bg-red-700 px-2 py-1 text-[11px] text-white transition hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <details className="border-t border-red-700/25 px-3.5 py-2 text-[10px] leading-relaxed text-neutral-700">
          <summary className="cursor-pointer text-[11px] font-medium text-black">
            Image source &amp; provenance
          </summary>
          <ul className="mt-1.5 space-y-1">
            <li>
              <span className="text-neutral-500">Image:</span> {pano.instrument}, product{' '}
              <code className="break-all">{pano.product_id}</code>, acquired sol{' '}
              {pano.capture_sol}. <SourceLink href={pano.source_url}>Original</SourceLink> ·{' '}
              <SourceLink href={pano.label_url}>PDS label</SourceLink>
            </li>
            <li>
              <span className="text-neutral-500">Archive:</span> NASA Planetary Data System,
              Imaging Node (public NASA data). Shown resized for the web; no other edits.
            </li>
            <li>
              <span className="text-neutral-500">Position:</span> NASA rover waypoints (
              {stop.provenance.position_key}).{' '}
              <SourceLink href={stop.provenance.position_source_url}>Source</SourceLink>
            </li>
            <li>
              <span className="text-neutral-500">Milestone text:</span> NASA mission map
              layers. <SourceLink href={stop.provenance.milestone_source_url}>Source</SourceLink>
            </li>
            <li>
              <span className="text-neutral-500">Credit:</span> Courtesy {stop.credit}. Not
              endorsed by NASA, JPL or Caltech.
            </li>
          </ul>
        </details>
      </aside>

      <p className="pointer-events-none absolute bottom-14 left-3 z-10 text-[10px] text-white/80 [text-shadow:0_1px_2px_black] sm:left-4">
        Courtesy {stop.credit} · Mars 2020 Navcam · NASA Planetary Data System
      </p>
    </section>
  );
}
