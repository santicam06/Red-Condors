import { create } from 'zustand';
import type { RoverStop, StreetViewAvatar } from '../types/roverStop';

const AVATAR_STORAGE_KEY = 'red-condors:streetview-avatar';

function readStoredAvatar(): StreetViewAvatar {
  try {
    return localStorage.getItem(AVATAR_STORAGE_KEY) === 'rover' ? 'rover' : 'astronaut';
  } catch {
    return 'astronaut';
  }
}

export interface ScreenPoint {
  x: number;
  y: number;
}

interface StreetViewState {
  /** Drawing used for the draggable "pegman". */
  avatar: StreetViewAvatar;
  stops: RoverStop[];
  stopsStatus: 'loading' | 'ready' | 'error';
  stopsError: string | null;

  /** Client (viewport) position of the avatar while it is being dragged. */
  dragPoint: ScreenPoint | null;
  /** Stop the dragged avatar would snap to if released now. */
  hoveredStopId: string | null;
  /** Bumped on every drop; the map layer resolves where it landed. */
  drop: { point: ScreenPoint; seq: number } | null;

  /** Stop whose panorama is open full-screen. */
  activeStop: RoverStop | null;

  setAvatar: (avatar: StreetViewAvatar) => void;
  setStops: (stops: RoverStop[]) => void;
  setStopsError: (message: string) => void;
  startDrag: (point: ScreenPoint) => void;
  moveDrag: (point: ScreenPoint) => void;
  endDrag: (point: ScreenPoint) => void;
  cancelDrag: () => void;
  setHoveredStopId: (id: string | null) => void;
  open: (stop: RoverStop) => void;
  close: () => void;
}

export const useStreetViewStore = create<StreetViewState>((set, get) => ({
  avatar: readStoredAvatar(),
  stops: [],
  stopsStatus: 'loading',
  stopsError: null,
  dragPoint: null,
  hoveredStopId: null,
  drop: null,
  activeStop: null,

  setAvatar: (avatar) => {
    try {
      localStorage.setItem(AVATAR_STORAGE_KEY, avatar);
    } catch {
      // Storage unavailable (private mode); keep the in-memory choice only.
    }
    set({ avatar });
  },
  setStops: (stops) => set({ stops, stopsStatus: 'ready', stopsError: null }),
  setStopsError: (stopsError) => set({ stopsStatus: 'error', stopsError }),
  startDrag: (dragPoint) => set({ dragPoint, hoveredStopId: null }),
  moveDrag: (dragPoint) => set({ dragPoint }),
  endDrag: (point) =>
    set({ dragPoint: null, drop: { point, seq: (get().drop?.seq ?? 0) + 1 } }),
  cancelDrag: () => set({ dragPoint: null, hoveredStopId: null }),
  setHoveredStopId: (hoveredStopId) => set({ hoveredStopId }),
  open: (activeStop) => set({ activeStop, hoveredStopId: null }),
  close: () => set({ activeStop: null }),
}));
