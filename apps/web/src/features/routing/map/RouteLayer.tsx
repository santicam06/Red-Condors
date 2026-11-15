import { useEffect } from 'react';
import type { MarsViewerController } from '../../../core/MarsViewerController';
import { useRoutingStore } from '../store/useRoutingStore';
import { RouteOverlayManager } from './RouteOverlayManager';

interface RouteLayerProps {
  controller: MarsViewerController | null;
}

/**
 * Renders safe routes from `useRoutingStore` onto the map. Has no UI of its own: requests come
 * from the route planner (see `useCampSafeRoute`).
 */
export function RouteLayer({ controller }: RouteLayerProps) {
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
    };

    draw(useRoutingStore.getState());
    const unsubscribe = useRoutingStore.subscribe(draw);
    return () => {
      unsubscribe();
      manager.destroy();
    };
  }, [controller]);

  return null;
}
