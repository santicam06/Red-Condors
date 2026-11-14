import { useEffect, useRef } from 'react';
import { MarsViewerController } from '../core/MarsViewerController';
import { useMapStore } from '../store/useMapStore';

interface MarsViewportProps {
  onControllerReady: (controller: MarsViewerController | null) => void;
}

/**
 * Full-viewport WebGL container hosting the unified 3D Globe & 2D Map of Mars.
 */
export function MarsViewport({ onControllerReady }: MarsViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<MarsViewerController | null>(null);

  const viewMode = useMapStore((s) => s.viewMode);
  const nomenclatureVisible = useMapStore((s) => s.nomenclatureVisible);
  const setViewerReady = useMapStore((s) => s.setViewerReady);

  // Initialize Cesium MarsViewerController once on mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const initialState = useMapStore.getState();
    const controller = new MarsViewerController(el, {
      initialMode: initialState.viewMode,
      initialNomenclatureVisible: initialState.nomenclatureVisible,
    });

    controllerRef.current = controller;
    setViewerReady(true);
    onControllerReady(controller);

    return () => {
      onControllerReady(null);
      setViewerReady(false);
      controller.destroy();
      controllerRef.current = null;
    };
  }, [onControllerReady, setViewerReady]);

  // Sync 3D <-> 2D view mode transitions
  useEffect(() => {
    controllerRef.current?.setViewMode(viewMode);
  }, [viewMode]);

  // Sync Nomenclature label visibility
  useEffect(() => {
    controllerRef.current?.setNomenclatureVisible(nomenclatureVisible);
  }, [nomenclatureVisible]);

  return (
    <div
      ref={containerRef}
      className="mars-cesium-container fixed inset-0 h-full w-full bg-black"
    />
  );
}
