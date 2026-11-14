import { useCallback, useEffect, useRef, useState } from 'react';
import type { MarsViewerController } from '../../core/MarsViewerController';
import type { NomenclatureLabelHit } from '../../core/layers/NomenclatureManager';
import { attachNomenclaturePointer } from './attachNomenclaturePointer';
import { frameFeatureBesidePanel } from './frameFeatureBesidePanel';
import { LocationDetailsPanel } from './LocationDetailsPanel';
import { NomenclatureEmphasis } from './nomenclatureEmphasis';

interface NomenclatureLocationsProps {
  controller: MarsViewerController | null;
}

/**
 * Connects visible Mars nomenclature labels to hover emphasis and the details card.
 */
export function NomenclatureLocations({ controller }: NomenclatureLocationsProps) {
  const [selected, setSelected] = useState<NomenclatureLabelHit | null>(null);
  const emphasisRef = useRef<NomenclatureEmphasis | null>(null);
  const panelWidthRef = useRef(380);

  useEffect(() => {
    if (!controller) return;

    const emphasis = new NomenclatureEmphasis(controller);
    emphasisRef.current = emphasis;
    const detach = attachNomenclaturePointer(controller, emphasis, (hit) => {
      setSelected(hit);
      frameFeatureBesidePanel(controller, hit, panelWidthRef.current);
    });

    return () => {
      detach();
      emphasis.dispose();
      emphasisRef.current = null;
      setSelected(null);
    };
  }, [controller]);

  const close = useCallback(() => {
    emphasisRef.current?.setSelected(null);
    setSelected(null);
  }, []);

  const handleWidthChange = useCallback((widthPx: number) => {
    panelWidthRef.current = widthPx;
  }, []);

  return (
    <LocationDetailsPanel
      hit={selected}
      onClose={close}
      onWidthChange={handleWidthChange}
    />
  );
}
