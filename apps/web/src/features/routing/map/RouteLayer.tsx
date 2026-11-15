import { useEffect } from 'react';
import type { MarsViewerController } from '../../../core/MarsViewerController';
import { useRoutingStore } from '../store/useRoutingStore';
import { RouteOverlayManager } from './RouteOverlayManager';

interface RouteLayerProps {
  controller: MarsViewerController | null;
}

/**
 * Renders safe routes from `useRoutingStore` onto the map. Has no UI of its own.
 */
export function RouteLayer({ controller }: RouteLayerProps) {
  // Draw whatever is in the routing store, redrawing on every change.
  useEffect(() => {
    if (!controller) return;

    const manager = new RouteOverlayManager(controller);
    const draw = (state: ReturnType<typeof useRoutingStore.getState>) => {
      manager.render({
        request: state.request,
        routes: state.routes,
        highlighted: state.highlightedKind,
        walkableArea: state.walkableArea,
        walkableAreaVisible: state.walkableAreaVisible,
      });
      // TODO(routing-ui): surface `status`, `error` and `warnings` in the route-planner UI.
      if (state.status === 'error') {
        console.warn('[routing] Route request failed:', state.error);
      }
      for (const warning of state.warnings) {
        console.warn('[routing]', warning);
      }
    };

    draw(useRoutingStore.getState());
    const unsubscribe = useRoutingStore.subscribe(draw);
    return () => {
      unsubscribe();
      manager.destroy();
    };
  }, [controller]);

  // Requests come from the route planner (see `features/route-planner/map/useSafeRouteRequest`).
  return null;
}
