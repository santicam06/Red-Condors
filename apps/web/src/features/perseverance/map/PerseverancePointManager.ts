import * as Cesium from 'cesium';
import { MARS_ELLIPSOID } from '../../../config/marsConfig';
import type { MarsViewerController } from '../../../core/MarsViewerController';
import { PERSEVERANCE_JEZERO_POINT } from '../types/perseverancePoint';

const OVERLAY_CHANNEL_ID = 'perseverance-points';
const ACCENT_RED = Cesium.Color.fromCssColorString('#B91C1C');

export class PerseverancePointManager {
  private readonly entity: Cesium.Entity;
  private readonly hoverHandler: Cesium.ScreenSpaceEventHandler;
  private readonly canvas: HTMLCanvasElement;
  private hovered = false;
  private readonly handleCanvasLeave: () => void;

  constructor(
    private readonly controller: MarsViewerController,
    private readonly onHoverChange: (hovered: boolean) => void
  ) {
    const channel = controller.getOrCreateOverlayChannel(OVERLAY_CHANNEL_ID);
    const point = PERSEVERANCE_JEZERO_POINT;

    this.entity = channel.entities.add({
      id: point.id,
      name: `${point.name} — ${point.locationName}`,
      position: Cesium.Cartesian3.fromDegrees(
        point.longitude,
        point.latitude,
        350,
        MARS_ELLIPSOID
      ),
      properties: {
        id: point.id,
        name: point.name,
        subtitle: `${point.locationName}, Mars`,
        lat: point.latitude,
        lon: point.longitude,
        kind: 'outpost',
      },
      point: {
        pixelSize: 12,
        color: ACCENT_RED,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        scaleByDistance: new Cesium.NearFarScalar(50_000, 1.35, 20_000_000, 0.75),
      },
      label: {
        text: point.locationName,
        font: '500 13px "JetBrains Mono", monospace',
        fillColor: Cesium.Color.WHITE,
        outlineColor: ACCENT_RED,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -14),
        scaleByDistance: new Cesium.NearFarScalar(100_000, 1.1, 14_000_000, 0.7),
      },
    });

    this.canvas = controller.viewer.scene.canvas;
    this.hoverHandler = new Cesium.ScreenSpaceEventHandler(this.canvas);
    this.hoverHandler.setInputAction(
      (event: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        const picked = controller.viewer.scene.pick(event.endPosition);
        this.setHovered(picked?.id === this.entity);
      },
      Cesium.ScreenSpaceEventType.MOUSE_MOVE
    );
    this.handleCanvasLeave = () => this.setHovered(false);
    this.canvas.addEventListener('mouseleave', this.handleCanvasLeave);

    controller.viewer.scene.requestRender();
  }

  private setHovered(hovered: boolean): void {
    if (hovered === this.hovered) return;

    this.hovered = hovered;
    this.canvas.style.cursor = hovered ? 'pointer' : '';
    if (this.entity.point) {
      this.entity.point.pixelSize = new Cesium.ConstantProperty(hovered ? 16 : 12);
      this.entity.point.color = new Cesium.ConstantProperty(ACCENT_RED);
      this.entity.point.outlineColor = new Cesium.ConstantProperty(Cesium.Color.WHITE);
      this.entity.point.outlineWidth = new Cesium.ConstantProperty(hovered ? 3 : 2);
    }
    if (this.entity.label) {
      this.entity.label.fillColor = new Cesium.ConstantProperty(Cesium.Color.WHITE);
      this.entity.label.outlineColor = new Cesium.ConstantProperty(ACCENT_RED);
      this.entity.label.scale = new Cesium.ConstantProperty(hovered ? 1.08 : 1);
    }
    this.onHoverChange(hovered);
    this.controller.viewer.scene.requestRender();
  }

  public destroy(): void {
    this.canvas.removeEventListener('mouseleave', this.handleCanvasLeave);
    this.canvas.style.cursor = '';

    if (!this.hoverHandler.isDestroyed()) {
      this.hoverHandler.destroy();
    }

    const channel = this.controller.getOrCreateOverlayChannel(OVERLAY_CHANNEL_ID);
    channel.entities.remove(this.entity);

    if (!this.controller.viewer.isDestroyed()) {
      this.controller.viewer.scene.requestRender();
    }
  }
}
