import { useEffect } from 'react';
import type { MarsViewerController } from '../../../core/MarsViewerController';
import { fetchRoverStops } from '../api/roverImagesApi';
import { useStreetViewStore } from '../store/useStreetViewStore';
import { RoverStopsManager } from './RoverStopsManager';

interface RoverStopsLayerProps {
  controller: MarsViewerController | null;
}

/** Loads rover stops from the API and mounts their map layer. Renders nothing itself. */
export function RoverStopsLayer({ controller }: RoverStopsLayerProps) {
  useEffect(() => {
    const abort = new AbortController();
    const { setStops, setStopsError } = useStreetViewStore.getState();
    fetchRoverStops(abort.signal)
      .then(setStops)
      .catch((error: unknown) => {
        if (abort.signal.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        console.warn('[rover-streetview] Could not load rover stops:', message);
        setStopsError(message);
      });
    return () => abort.abort();
  }, []);

  useEffect(() => {
    if (!controller) return;
    const manager = new RoverStopsManager(controller);
    return () => manager.destroy();
  }, [controller]);

  return null;
}
