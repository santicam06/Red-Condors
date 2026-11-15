import * as Cesium from 'cesium';
import type { MarsViewerController } from '../../core/MarsViewerController';
import type { NomenclatureLabelHit } from '../../core/layers/NomenclatureManager';
import { NomenclatureEmphasis } from './nomenclatureEmphasis';

/**
 * Hover enlarges visible nomenclature labels via rAF-coalesced O(K) screen-box
 * checks (paused automatically while dragging the map). Click opens the details panel.
 * Cursor styling (`pointer` / `grabbing` / default) is owned centrally by `MarsViewerController`.
 */
export function attachNomenclaturePointer(
  controller: MarsViewerController,
  emphasis: NomenclatureEmphasis,
  onSelect: (hit: NomenclatureLabelHit) => void
): () => void {
  const { viewer } = controller;
  const canvas = viewer.scene.canvas;
  const handler = new Cesium.ScreenSpaceEventHandler(canvas);
  let hoveredFid: number | null = null;
  let rafId: number | null = null;
  let latestX = -1;
  let latestY = -1;
  let insideCanvas = false;

  const clearHover = () => {
    if (hoveredFid !== null) {
      hoveredFid = null;
      emphasis.setHover(null);
    }
  };

  const flushHover = () => {
    rafId = null;
    if (!insideCanvas || controller.isDragging()) {
      clearHover();
      return;
    }

    const hit = controller.pickNomenclature(latestX, latestY);
    const fid = hit?.fid ?? null;
    if (fid !== hoveredFid) {
      hoveredFid = fid;
      emphasis.setHover(fid);
    }
  };

  const scheduleHover = () => {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(flushHover);
  };

  handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
    insideCanvas = true;
    latestX = movement.endPosition.x;
    latestY = movement.endPosition.y;
    if (controller.isDragging()) {
      clearHover();
      return;
    }
    scheduleHover();
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  handler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
    const hit = controller.pickNomenclature(click.position.x, click.position.y);
    if (!hit) return;
    emphasis.setSelected(hit.fid);
    onSelect(hit);
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  const unsubscribeDrag = controller.onDragStateChange((dragging) => {
    if (dragging) {
      clearHover();
    } else if (insideCanvas) {
      scheduleHover();
    }
  });

  const onLeave = () => {
    insideCanvas = false;
    clearHover();
  };
  canvas.addEventListener('mouseleave', onLeave);

  return () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    unsubscribeDrag();
    handler.destroy();
    canvas.removeEventListener('mouseleave', onLeave);
  };
}
