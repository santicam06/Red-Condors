import { useEffect, useRef } from 'react';
import type { MarsViewerController } from '../../core/MarsViewerController';
import { useMapStore, type MarsBasemapId } from '../../store/useMapStore';
import { createBasemapProvider } from './basemaps';

/** Applies the selected globe imagery. Renders nothing itself. */
export function MapLayers({ controller }: { controller: MarsViewerController | null }) {
  const basemap = useMapStore((state) => state.basemap);
  const applied = useRef<{ controller: MarsViewerController; id: MarsBasemapId } | null>(null);

  useEffect(() => {
    if (!controller) return;
    const previous = applied.current;
    if (previous?.controller === controller && previous.id === basemap) return;
    // A new viewer already starts on the Viking mosaic, so Satellite needs no swap
    const isFreshViewer = previous?.controller !== controller;
    if (!(isFreshViewer && basemap === 'satellite')) {
      controller.replaceBasemap(createBasemapProvider(basemap));
    }
    applied.current = { controller, id: basemap };
  }, [controller, basemap]);

  return null;
}
