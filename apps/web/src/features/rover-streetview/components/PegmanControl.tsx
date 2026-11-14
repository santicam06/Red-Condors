import { useEffect, useRef, useState } from 'react';
import type { MarsViewerController } from '../../../core/MarsViewerController';
import { fetchNearestStop } from '../api/roverImagesApi';
import { useStreetViewStore } from '../store/useStreetViewStore';
import type { StreetViewAvatar } from '../types/roverStop';
import { AstronautIcon } from './avatars/AstronautIcon';
import { RoverIcon } from './avatars/RoverIcon';

interface PegmanControlProps {
  controller: MarsViewerController | null;
}

/** Pointer travel (px) before a press becomes a drag instead of a click. */
const DRAG_THRESHOLD_PX = 5;
/** Clicking the avatar opens the nearest stop within this distance of the map centre. */
const CLICK_SEARCH_RADIUS_M = 3_000;

function Avatar({
  kind,
  dangling,
  className,
}: {
  kind: StreetViewAvatar;
  dangling?: boolean;
  className?: string;
}) {
  return kind === 'rover' ? (
    <RoverIcon dangling={dangling} className={className} />
  ) : (
    <AstronautIcon dangling={dangling} className={className} />
  );
}

/**
 * Google Street View–style "pegman" for Mars: drag the astronaut (or rover) onto a
 * glowing rover stop to open its 360° panorama. Clicking it opens the stop nearest
 * to the map centre.
 */
export function PegmanControl({ controller }: PegmanControlProps) {
  const avatar = useStreetViewStore((s) => s.avatar);
  const setAvatar = useStreetViewStore((s) => s.setAvatar);
  const dragPoint = useStreetViewStore((s) => s.dragPoint);
  const hoveredStopId = useStreetViewStore((s) => s.hoveredStopId);
  const stopsStatus = useStreetViewStore((s) => s.stopsStatus);
  const stopsError = useStreetViewStore((s) => s.stopsError);

  const pressStart = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const disabled = stopsStatus !== 'ready';
  const dragging = dragPoint !== null;

  useEffect(() => {
    if (!hint) return;
    const timer = window.setTimeout(() => setHint(null), 3500);
    return () => window.clearTimeout(timer);
  }, [hint]);

  // Escape cancels an in-progress drag.
  useEffect(() => {
    if (!dragging) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        pressStart.current = null;
        useStreetViewStore.getState().cancelDrag();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dragging]);

  const openNearestToMapCentre = async () => {
    if (!controller) return;
    const centre = controller.getViewportCenterLatLon();
    try {
      const nearest = await fetchNearestStop(centre.lat, centre.lon, CLICK_SEARCH_RADIUS_M);
      if (nearest) {
        useStreetViewStore.getState().open(nearest.stop);
      } else {
        setHint('Drag me onto a numbered stop in Jezero Crater');
      }
    } catch {
      setHint('Street View is unavailable right now');
    }
  };

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pressStart.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const start = pressStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const point = { x: event.clientX, y: event.clientY };
    const store = useStreetViewStore.getState();
    if (store.dragPoint) {
      store.moveDrag(point);
    } else if (Math.hypot(point.x - start.x, point.y - start.y) > DRAG_THRESHOLD_PX) {
      store.startDrag(point);
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const start = pressStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    pressStart.current = null;
    const store = useStreetViewStore.getState();
    if (store.dragPoint) {
      store.endDrag({ x: event.clientX, y: event.clientY });
    } else {
      void openNearestToMapCentre();
    }
  };

  const onPointerCancel = () => {
    pressStart.current = null;
    useStreetViewStore.getState().cancelDrag();
  };

  const title = disabled
    ? stopsStatus === 'loading'
      ? 'Loading rover 360° views…'
      : `Street View unavailable: ${stopsError ?? 'API not reachable'}`
    : 'Drag onto a numbered stop to see the rover’s 360° view';

  return (
    <div className="pointer-events-auto relative flex flex-col items-center gap-1">
      {hint && (
        <div className="absolute right-full top-1 mr-2 w-max max-w-[220px] border border-red-700 bg-white px-2 py-1 text-[11px] text-black shadow-md">
          {hint}
        </div>
      )}

      <button
        type="button"
        title={title}
        aria-label={title}
        disabled={disabled}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        className="flex h-12 w-12 touch-none cursor-grab select-none items-center justify-center border border-red-700 bg-white shadow-md transition-colors hover:bg-red-50 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Avatar kind={avatar} className={`h-10 w-10 ${dragging ? 'opacity-25' : ''}`} />
      </button>

      <div
        role="radiogroup"
        aria-label="Street View avatar"
        className="flex overflow-hidden border border-red-700 bg-white shadow-md"
      >
        {(['astronaut', 'rover'] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={avatar === kind}
            title={kind === 'astronaut' ? 'Astronaut' : 'Rover'}
            onClick={() => setAvatar(kind)}
            className={`flex h-6 w-6 cursor-pointer items-center justify-center transition-colors ${
              avatar === kind ? 'bg-red-700' : 'bg-white hover:bg-red-50'
            }`}
          >
            <Avatar kind={kind} className="h-5 w-5" />
          </button>
        ))}
      </div>

      {dragPoint && (
        <div
          className="pointer-events-none fixed z-50"
          style={{ left: dragPoint.x, top: dragPoint.y, transform: 'translate(-50%, -100%)' }}
        >
          <Avatar
            kind={avatar}
            dangling
            className={`h-16 w-16 drop-shadow-[0_6px_6px_rgba(0,0,0,0.55)] transition-transform duration-150 ${
              hoveredStopId ? 'scale-110' : 'rotate-[-8deg]'
            }`}
          />
          <div
            className={`mx-auto -mt-1 h-2 w-8 rounded-full blur-[2px] ${
              hoveredStopId ? 'bg-cyan-300/80' : 'bg-black/40'
            }`}
          />
        </div>
      )}
    </div>
  );
}
