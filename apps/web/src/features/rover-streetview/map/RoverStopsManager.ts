import * as Cesium from 'cesium';
import { MARS_ELLIPSOID } from '../../../config/marsConfig';
import type { MarsViewerController } from '../../../core/MarsViewerController';
import { type ScreenPoint, useStreetViewStore } from '../store/useStreetViewStore';
import type { RoverStop } from '../types/roverStop';
import { ROVER_PIN_HEIGHT_PX, ROVER_PIN_IMAGE } from './roverMarkerImage';

const OVERLAY_CHANNEL_ID = 'rover-streetview';
const ROVER_MARKER_ID = 'streetview:rover-marker';

/** Release within this many CSS pixels of a dot to snap onto it. */
const SNAP_RADIUS_PX = 40;
/** Below this camera altitude the dots stay visible (and clickable) without dragging. */
const DOTS_VISIBLE_BELOW_M = 120_000;
/** Above this altitude stops overlap; dropping on them zooms in instead of opening one. */
const OPEN_DIRECTLY_BELOW_M = 400_000;
/** Altitude of the "zoom in on the rover area" camera flight. */
const CLUSTER_VIEW_ALTITUDE_M = 12_000;
/** Altitude of the map camera after opening a stop (so closing returns there). */
const STOP_VIEW_ALTITUDE_M = 4_000;

const STOP_COLOR = Cesium.Color.fromCssColorString('#FACC15');
const HOVER_COLOR = Cesium.Color.fromCssColorString('#22D3EE');
const OUTLINE = Cesium.Color.fromCssColorString('#7F1D1D');
const HOVER_SCALE = 1.4;

/**
 * Renders the curated rover tour stops as numbered dots, and turns the HUD's dragged
 * astronaut/rover into map actions: highlight the nearest dot while dragging,
 * open its panorama on drop, or zoom into the rover area when dropped from far away.
 */
export class RoverStopsManager {
  private readonly channel: Cesium.CustomDataSource;
  private readonly entities = new Map<string, Cesium.Entity>();
  private readonly positions = new Map<string, Cesium.Cartesian3>();
  private readonly clickHandler: Cesium.ScreenSpaceEventHandler;
  private readonly unsubscribers: Array<() => void> = [];
  private readonly scratchWindow = new Cesium.Cartesian2();
  /** Rover pin shown whenever the numbered stops are too small to see. */
  private roverMarker: Cesium.Entity | null = null;
  private highlightedId: string | null = null;
  private tourCenter: { lat: number; lon: number } | null = null;
  private lastDropSeq = 0;
  private pausedRenderLoop: boolean | null = null;
  private visible = false;

  constructor(private readonly controller: MarsViewerController) {
    this.channel = controller.getOrCreateOverlayChannel(OVERLAY_CHANNEL_ID);
    const store = useStreetViewStore;

    this.setStops(store.getState().stops);
    this.lastDropSeq = store.getState().drop?.seq ?? 0;

    this.unsubscribers.push(
      store.subscribe((state, prev) => {
        if (state.stops !== prev.stops) this.setStops(state.stops);
        if (state.dragPoint !== prev.dragPoint) this.handleDragMove(state.dragPoint);
        if (state.drop && state.drop.seq !== this.lastDropSeq) {
          this.lastDropSeq = state.drop.seq;
          this.handleDrop(state.drop.point);
        }
        if (state.hoveredStopId !== prev.hoveredStopId) {
          this.highlight(state.hoveredStopId);
        }
        if (state.activeStop !== prev.activeStop) {
          if (state.activeStop) this.flyToStop(state.activeStop);
          this.setMapRenderingPaused(state.activeStop !== null);
        }
        this.updateVisibility();
      })
    );

    const removeCameraListener = controller.viewer.camera.changed.addEventListener(() =>
      this.updateVisibility()
    );
    this.unsubscribers.push(removeCameraListener);

    this.clickHandler = new Cesium.ScreenSpaceEventHandler(controller.viewer.scene.canvas);
    this.clickHandler.setInputAction(
      (event: Cesium.ScreenSpaceEventHandler.PositionedEvent) => this.handleClick(event),
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    );

    this.updateVisibility();
  }

  private get viewer(): Cesium.Viewer {
    return this.controller.viewer;
  }

  private setStops(stops: RoverStop[]): void {
    this.channel.entities.removeAll();
    this.entities.clear();
    this.positions.clear();
    this.roverMarker = null;
    if (stops.length === 0) return;

    this.channel.entities.suspendEvents();
    for (const stop of stops) {
      const position = Cesium.Cartesian3.fromDegrees(stop.lon, stop.lat, 10, MARS_ELLIPSOID);
      this.positions.set(stop.id, position);
      const entity = this.channel.entities.add({
        id: `streetview:${stop.id}`,
        name: `${stop.order}. ${stop.title}`,
        position,
        show: this.visible,
        // Numbered badge: a label with a filled background (points would hide the text).
        label: {
          text: ` ${stop.order} `,
          font: '700 12px "JetBrains Mono", monospace',
          fillColor: OUTLINE,
          style: Cesium.LabelStyle.FILL,
          showBackground: true,
          backgroundColor: STOP_COLOR,
          backgroundPadding: new Cesium.Cartesian2(4, 3),
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      this.entities.set(stop.id, entity);
    }

    // A rover pin at the centre of the tour marks where the rover is from any zoom
    // level; it swaps for the numbered stops once the camera is close enough.
    const lat = stops.reduce((sum, s) => sum + s.lat, 0) / stops.length;
    const lon = stops.reduce((sum, s) => sum + s.lon, 0) / stops.length;
    this.tourCenter = { lat, lon };
    this.roverMarker = this.channel.entities.add({
      id: ROVER_MARKER_ID,
      name: 'Perseverance rover: 360° tour',
      position: Cesium.Cartesian3.fromDegrees(lon, lat, 10, MARS_ELLIPSOID),
      show: false,
      billboard: {
        image: ROVER_PIN_IMAGE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: 'Perseverance rover · 360° tour',
        font: '600 12px "JetBrains Mono", monospace',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -(ROVER_PIN_HEIGHT_PX + 4)),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    this.channel.entities.resumeEvents();
    this.viewer.scene.requestRender();
  }

  private updateVisibility(): void {
    if (this.viewer.isDestroyed()) return;
    const { dragPoint, activeStop } = useStreetViewStore.getState();
    const dragging = dragPoint !== null;
    const altitude = this.controller.getEffectiveAltitudeMeters();
    const visible =
      !activeStop && (dragging || altitude < DOTS_VISIBLE_BELOW_M);

    if (visible !== this.visible) {
      this.visible = visible;
      for (const entity of this.entities.values()) entity.show = visible;
    }
    if (this.roverMarker) {
      this.roverMarker.show = !activeStop && !visible;
      if (this.roverMarker.label) {
        this.roverMarker.label.text = new Cesium.ConstantProperty(
          dragging ? 'Drop here to zoom in' : 'Perseverance rover · 360° tour'
        );
      }
    }
    this.viewer.scene.requestRender();
  }

  /** Converts a viewport (client) point to canvas-relative CSS pixels. */
  private toCanvasPoint(point: ScreenPoint): Cesium.Cartesian2 | null {
    const rect = this.viewer.scene.canvas.getBoundingClientRect();
    const x = point.x - rect.left;
    const y = point.y - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;
    return new Cesium.Cartesian2(x, y);
  }

  /** Nearest stop on screen within the snap radius, ignoring stops behind the globe. */
  private findStopNear(canvasPoint: Cesium.Cartesian2): string | null {
    const { scene, camera } = this.viewer;
    const occluder =
      scene.mode === Cesium.SceneMode.SCENE3D
        ? new Cesium.EllipsoidalOccluder(MARS_ELLIPSOID, camera.positionWC)
        : null;

    let bestId: string | null = null;
    let bestDistance = SNAP_RADIUS_PX;
    for (const [id, position] of this.positions) {
      if (occluder && !occluder.isPointVisible(position)) continue;
      const win = Cesium.SceneTransforms.worldToWindowCoordinates(
        scene,
        position,
        this.scratchWindow
      );
      if (!win) continue;
      const distance = Cesium.Cartesian2.distance(win, canvasPoint);
      if (distance <= bestDistance) {
        bestDistance = distance;
        bestId = id;
      }
    }
    return bestId;
  }

  private handleDragMove(point: ScreenPoint | null): void {
    const store = useStreetViewStore.getState();
    if (!point) return;
    const canvasPoint = this.toCanvasPoint(point);
    const hovered = canvasPoint ? this.findStopNear(canvasPoint) : null;
    if (hovered !== store.hoveredStopId) store.setHoveredStopId(hovered);
  }

  private handleDrop(point: ScreenPoint): void {
    const store = useStreetViewStore.getState();
    const canvasPoint = this.toCanvasPoint(point);
    const stopId = canvasPoint ? this.findStopNear(canvasPoint) : null;
    store.setHoveredStopId(null);
    if (!stopId) return; // Avatar returns to the HUD.

    const stop = store.stops.find((s) => s.id === stopId);
    if (!stop) return;

    if (this.controller.getEffectiveAltitudeMeters() >= OPEN_DIRECTLY_BELOW_M) {
      // Too far out to tell stops apart: zoom into the rover area first.
      this.viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          stop.lon,
          stop.lat,
          CLUSTER_VIEW_ALTITUDE_M,
          MARS_ELLIPSOID
        ),
        duration: 1.6,
      });
      return;
    }
    store.open(stop);
  }

  private handleClick(event: Cesium.ScreenSpaceEventHandler.PositionedEvent): void {
    const picked: unknown = this.viewer.scene.pick(event.position);
    const entity = (picked as { id?: unknown } | undefined)?.id;
    if (!(entity instanceof Cesium.Entity) || !entity.id.startsWith('streetview:')) return;

    if (entity.id === ROVER_MARKER_ID) {
      this.flyToTour();
      return;
    }
    if (!this.visible) return;

    const stopId = entity.id.slice('streetview:'.length);
    const stop = useStreetViewStore.getState().stops.find((s) => s.id === stopId);
    if (stop) useStreetViewStore.getState().open(stop);
  }

  private highlight(stopId: string | null): void {
    if (this.highlightedId === stopId) return;
    const restore = this.highlightedId ? this.entities.get(this.highlightedId) : undefined;
    if (restore?.label) {
      restore.label.backgroundColor = new Cesium.ConstantProperty(STOP_COLOR);
      restore.label.scale = new Cesium.ConstantProperty(1);
    }

    const target = stopId ? this.entities.get(stopId) : undefined;
    if (target?.label) {
      target.label.backgroundColor = new Cesium.ConstantProperty(HOVER_COLOR);
      target.label.scale = new Cesium.ConstantProperty(HOVER_SCALE);
    }
    this.highlightedId = stopId;
    this.viewer.scene.requestRender();
  }

  /** Zooms into the rover area so the numbered stops become visible. */
  private flyToTour(): void {
    if (!this.tourCenter) return;
    this.controller.flyToLatLon(this.tourCenter.lon, this.tourCenter.lat, CLUSTER_VIEW_ALTITUDE_M);
  }

  private flyToStop(stop: RoverStop): void {
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        stop.lon,
        stop.lat,
        STOP_VIEW_ALTITUDE_M,
        MARS_ELLIPSOID
      ),
      duration: 0,
    });
  }

  /**
   * The full-screen panorama completely covers the map, so stop Cesium's render loop
   * while it is open: otherwise both WebGL scenes compete for the GPU every frame and
   * dragging the panorama feels laggy. The previous setting is restored on close.
   */
  private setMapRenderingPaused(paused: boolean): void {
    if (this.viewer.isDestroyed()) return;
    if (paused && this.pausedRenderLoop === null) {
      this.pausedRenderLoop = this.viewer.useDefaultRenderLoop;
      this.viewer.useDefaultRenderLoop = false;
    } else if (!paused && this.pausedRenderLoop !== null) {
      this.viewer.useDefaultRenderLoop = this.pausedRenderLoop;
      this.pausedRenderLoop = null;
      this.viewer.scene.requestRender();
    }
  }

  public destroy(): void {
    this.setMapRenderingPaused(false);
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    if (!this.clickHandler.isDestroyed()) this.clickHandler.destroy();
    this.channel.entities.removeAll();
    if (!this.viewer.isDestroyed()) this.viewer.scene.requestRender();
  }
}
