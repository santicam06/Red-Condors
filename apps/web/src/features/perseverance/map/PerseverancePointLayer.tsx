import { useEffect } from 'react';
import type { MarsViewerController } from '../../../core/MarsViewerController';
import { PerseverancePointManager } from './PerseverancePointManager';

interface PerseverancePointLayerProps {
  controller: MarsViewerController | null;
  onHoverChange: (hovered: boolean) => void;
}

export function PerseverancePointLayer({
  controller,
  onHoverChange,
}: PerseverancePointLayerProps) {
  useEffect(() => {
    if (!controller) return;

    const manager = new PerseverancePointManager(controller, onHoverChange);
    return () => manager.destroy();
  }, [controller, onHoverChange]);

  return null;
}
