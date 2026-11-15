import * as Cesium from 'cesium';
import { MARS_ELLIPSOID } from '../../../config/marsConfig';
import type { MarsViewerController } from '../../../core/MarsViewerController';
import { ROUTE_SOURCE_MAX_DISTANCE_KM, ROUTE_STYLE } from '../config/demoRoute';
import {
    type LatLon,
    type Route,
    type RouteKind,
    type RouteRequest,
} from '../types/routing';

const OVERLAY_CHANNEL_ID = 'routing';
const LABEL_FONT = '500 12px "JetBrains Mono", monospace';

export interface RouteOverlayState {
  request: RouteRequest | null;
  routes: Route[];
  highlighted: RouteKind | null;
}

/**
 * Draws the shortest / fastest / safest routes on both the 3D globe and the 2D map.
 * Start and End pins are drawn by the route planner.
 */
export class RouteOverlayManager {
  private readonly channel: Cesium.CustomDataSource;
  private readonly routeEntities = new Map<RouteKind, Cesium.Entity>();
  private lastFramedRequest: RouteRequest | null = null;

  constructor(private readonly controller: MarsViewerController) {
    this.channel = controller.getOrCreateOverlayChannel(OVERLAY_CHANNEL_ID);
  }

  /** Redraws everything for the given routing state. */
  public render(state: RouteOverlayState) {
    const { request, routes, highlighted } = state;
    this.channel.entities.removeAll();
    this.routeEntities.clear();
    if (!request) return this.requestRender();

    // Draw the highlighted route last so it sits on top
    const ordered = [...routes].sort(
      (a, b) => Number(a.kind === highlighted) - Number(b.kind === highlighted)
    );
    for (const route of ordered) {
      this.addRoute(route, route.kind === highlighted);
    }

    if (routes.length > 0 && this.lastFramedRequest !== request) {
      this.lastFramedRequest = request;
      this.frame(request.destination);
    }
    this.requestRender();
  }

  private addRoute(route: Route, highlighted: boolean) {
    const style = ROUTE_STYLE[route.kind];
    const color = Cesium.Color.fromCssColorString(style.color);
    const positions = route.coordinates.map(([lon, lat]) =>
      Cesium.Cartesian3.fromDegrees(lon, lat, 0, MARS_ELLIPSOID)
    );

    const entity = this.channel.entities.add({
      name: `${style.label} route`,
      polyline: {
        positions,
        width: highlighted ? 6 : 4,
        clampToGround: true,
        material: new Cesium.PolylineOutlineMaterialProperty({
          color,
          outlineColor: Cesium.Color.BLACK.withAlpha(0.6),
          outlineWidth: 1,
        }),
      },
    });
    this.routeEntities.set(route.kind, entity);

    // Label near the middle of the route, offset per kind so overlapping labels stay readable
    const [lon, lat] = route.coordinates[Math.floor(route.coordinates.length / 2)];
    const offsetY = { shortest: -18, fastest: 0, safest: 18 }[route.kind];
    this.channel.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lon, lat, 0, MARS_ELLIPSOID),
      label: {
        text: `${style.label} · ${formatKm(route.distance_m)} · ${formatDuration(route.eta_rover_s)}`,
        font: LABEL_FONT,
        fillColor: Cesium.Color.WHITE,
        outlineColor: color.darken(0.4, new Cesium.Color()),
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        showBackground: true,
        backgroundColor: Cesium.Color.BLACK.withAlpha(0.55),
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        pixelOffset: new Cesium.Cartesian2(12, offsetY),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 600_000),
      },
    });
  }

  /** Flies the camera to frame the planning area around the destination (3D and 2D). */
  private frame(center: LatLon) {
    const halfLat = Cesium.Math.toDegrees(
      (ROUTE_SOURCE_MAX_DISTANCE_KM * 1300) / MARS_ELLIPSOID.maximumRadius
    );
    const halfLon = halfLat / Math.max(Math.cos(Cesium.Math.toRadians(center.lat)), 0.05);
    this.controller.viewer.camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(
        center.lon - halfLon,
        center.lat - halfLat,
        center.lon + halfLon,
        center.lat + halfLat
      ),
      duration: 2.5,
    });
  }

  private requestRender() {
    if (!this.controller.viewer.isDestroyed()) {
      this.controller.viewer.scene.requestRender();
    }
  }

  public destroy(): void {
    this.channel.entities.removeAll();
    this.routeEntities.clear();
    this.requestRender();
  }
}

export function formatKm(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, '0')}m` : `${minutes} min`;
}
