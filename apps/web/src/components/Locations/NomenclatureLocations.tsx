import { useEffect, useRef } from 'react';
import type { MarsViewerController } from '../../core/MarsViewerController';
import { useRoutePlannerStore } from '../../features/route-planner/store/useRoutePlannerStore';
import { attachNomenclaturePointer } from './attachNomenclaturePointer';
import { frameFeatureBesidePanel } from './frameFeatureBesidePanel';
import { NomenclatureEmphasis } from './nomenclatureEmphasis';
import { useNomenclatureSelection } from './useNomenclatureSelection';

interface NomenclatureLocationsProps {
  controller: MarsViewerController | null;
}

const SIDE_BAR_WIDTH_PX = 384;

/**
 * Hover and click for nomenclature labels. The place card itself renders
 * inside the Marswalk / Rover side bar.
 */
export function NomenclatureLocations({ controller }: NomenclatureLocationsProps) {
  const emphasisRef = useRef<NomenclatureEmphasis | null>(null);

  useEffect(() => {
    if (!controller) return;

    const emphasis = new NomenclatureEmphasis(controller);
    emphasisRef.current = emphasis;
    const detach = attachNomenclaturePointer(controller, emphasis, (hit) => {
      const planner = useRoutePlannerStore.getState();
      if (planner.pinTool === 'start' || planner.pinTool === 'end') {
        const role = planner.pinTool === 'start' ? 'Start' : 'End';
        planner.placePinnedEndpoint(planner.pinTool === 'start' ? 'source' : 'destination', {
          id: `nom-${hit.fid}`,
          name: `${role} · ${hit.name}`,
          subtitle: hit.type || 'Named feature',
          lat: hit.latitude,
          lon: hit.longitude,
          category: 'nomenclature',
        });
        useNomenclatureSelection.getState().setHit(hit);
        return;
      }
      if (planner.pinTool === 'remove') return;
      useNomenclatureSelection.getState().setHit(hit);
      planner.setOpen(true);
      frameFeatureBesidePanel(controller, hit, SIDE_BAR_WIDTH_PX, 0);
    });

    const unsubscribe = useNomenclatureSelection.subscribe((state) => {
      emphasis.setSelected(state.hit?.fid ?? null);
    });

    return () => {
      detach();
      unsubscribe();
      emphasis.dispose();
      emphasisRef.current = null;
      useNomenclatureSelection.getState().setHit(null);
    };
  }, [controller]);

  return null;
}
