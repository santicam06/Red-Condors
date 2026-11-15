import { useEffect } from 'react';
import type { MarsViewerController } from '../../core/MarsViewerController';
import { useMapStore } from '../../store/useMapStore';
import { createBasemapProvider } from './basemaps';

/** Applies the selected Mars Trek basemap. Renders nothing itself. */
export function MapLayers({ controller }: { controller: MarsViewerController | null }) {
  const basemap = useMapStore((state) => state.basemap);

  useEffect(() => {
    if (!controller) return;
    controller.replaceBasemap(createBasemapProvider(basemap));
  }, [controller, basemap]);

  return null;
}
