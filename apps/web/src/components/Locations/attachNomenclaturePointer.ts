import * as Cesium from 'cesium';
import type { MarsViewerController } from '../../core/MarsViewerController';
import type { NomenclatureLabelHit } from '../../core/layers/NomenclatureManager';
import { NomenclatureEmphasis } from './nomenclatureEmphasis';

/**
 * Hover enlarges the label and turns it blue. Click opens the details panel.
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

  const updateHover = (x: number, y: number) => {
    const hit = controller.pickNomenclature(x, y);
    const fid = hit?.fid ?? null;
    if (fid === hoveredFid) return;
    hoveredFid = fid;
    emphasis.setHover(fid);
    canvas.style.cursor = fid === null ? '' : 'pointer';
  };

  handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
    updateHover(movement.endPosition.x, movement.endPosition.y);
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  handler.setInputAction((click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
    const hit = controller.pickNomenclature(click.position.x, click.position.y);
    if (!hit) return;
    emphasis.setSelected(hit.fid);
    onSelect(hit);
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  const onLeave = () => {
    hoveredFid = null;
    emphasis.setHover(null);
    canvas.style.cursor = '';
  };
  canvas.addEventListener('mouseleave', onLeave);

  return () => {
    handler.destroy();
    canvas.removeEventListener('mouseleave', onLeave);
    if (canvas.style.cursor === 'pointer') {
      canvas.style.cursor = '';
    }
  };
}
