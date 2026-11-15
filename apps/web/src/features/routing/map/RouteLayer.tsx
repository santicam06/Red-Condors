import { useEffect } from 'react';
import type { MarsViewerController } from '../../../core/MarsViewerController';
import { DEMO_ROUTE_REQUEST } from '../config/demoRoute';
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

  // TODO(routing-ui): replace this static demo request with input from the custom
  // route-planner UI, which should call:
  //   useRoutingStore.getState().setRequest({ source, destination })
  // with `source` within 20 km of `destination`. Delete this effect once that UI exists.
  useEffect(() => {
    if (!controller) return;
    if (useRoutingStore.getState().request) return;
    void useRoutingStore.getState().setRequest(DEMO_ROUTE_REQUEST);
  }, [controller]);

  return null;
}
