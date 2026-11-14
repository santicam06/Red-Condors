import { create } from 'zustand';
import { fetchRoutes } from '../api/routingClient';
import type { Route, RouteKind, RouteRequest, WalkableArea } from '../types/routing';

export type RoutingStatus = 'idle' | 'loading' | 'ready' | 'error';

interface RoutingState {
  request: RouteRequest | null;
  routes: Route[];
  warnings: string[];
  /** Per-pixel terrain classes (gentle / moderate / steep / unreachable) around the destination */
  walkableArea: WalkableArea | null;
  /** Whether the walkable-area overlay is drawn (for a future UI toggle) */
  walkableAreaVisible: boolean;
  status: RoutingStatus;
  error: string | null;
  /** Route drawn emphasised on the map (for a future route-card hover, etc.) */
  highlightedKind: RouteKind | null;
  /**
   * Entry point for any UI: sets source/destination and fetches the 3 safe routes.
   * A newer request supersedes (aborts) one still in flight.
   */
  setRequest: (request: RouteRequest) => Promise<void>;
  setHighlightedKind: (kind: RouteKind | null) => void;
  setWalkableAreaVisible: (visible: boolean) => void;
  clear: () => void;
}

let inFlight: AbortController | null = null;

export const useRoutingStore = create<RoutingState>((set) => ({
  request: null,
  routes: [],
  warnings: [],
  walkableArea: null,
  walkableAreaVisible: true,
  status: 'idle',
  error: null,
  highlightedKind: null,

  setRequest: async (request) => {
    inFlight?.abort();
    const controller = new AbortController();
    inFlight = controller;
    set({ request, routes: [], warnings: [], walkableArea: null, status: 'loading', error: null });

    try {
      const response = await fetchRoutes(request, controller.signal);
      if (controller.signal.aborted) return;
      set({
        routes: response.routes,
        warnings: response.warnings,
        walkableArea: response.walkable_area,
        status: 'ready',
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      set({ status: 'error', error: err instanceof Error ? err.message : String(err) });
    } finally {
      if (inFlight === controller) inFlight = null;
    }
  },

  setHighlightedKind: (highlightedKind) => set({ highlightedKind }),

  setWalkableAreaVisible: (walkableAreaVisible) => set({ walkableAreaVisible }),

  clear: () => {
    inFlight?.abort();
    inFlight = null;
    set({
      request: null,
      routes: [],
      warnings: [],
      walkableArea: null,
      status: 'idle',
      error: null,
    });
  },
}));
