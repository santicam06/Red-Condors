import * as Cesium from 'cesium';
import { useEffect } from 'react';
import { useNomenclatureSelection } from '../../../components/Locations/useNomenclatureSelection';
import { findSite } from '../../../components/Outposts/olympusSites';
import { MARS_ELLIPSOID } from '../../../config/marsConfig';
import type {
    MarsViewerController,
    PickedMapFeature,
} from '../../../core/MarsViewerController';
import { CUSTOM_LOCATIONS } from '../data/customLocations';
import { useRoutePlannerStore } from '../store/useRoutePlannerStore';
import { droppedPinLocation, formatPinName, isCampRouteLocation, type RouteLocation } from '../types';

const CUSTOM_LOCATIONS_CHANNEL = 'route-planner-locations';
const ROUTE_PINS_CHANNEL = 'route-pins';

/**
 * Feature-level map adapter connecting camp / outpost clicks on `MarsViewerController`
 * to the lateral bar's Source / Destination state. Planetary nomenclature labels and
 * arbitrary surface clicks are intentionally ignored so only actual camps participate
 * in travel route calculations.
 */
export function useMapLocationPicker(controller: MarsViewerController | null): void {
  // Sync any additional custom camp locations onto a dedicated Cesium overlay channel
  useEffect(() => {
    if (!controller) return;

    const dataSource = controller.getOrCreateOverlayChannel(CUSTOM_LOCATIONS_CHANNEL);

    const drawCustomCamps = () => {
      if (controller.viewer.isDestroyed()) return;
      dataSource.entities.removeAll();

      const { source, destination } = useRoutePlannerStore.getState();

      for (const loc of CUSTOM_LOCATIONS) {
        if (!isCampRouteLocation(loc) || findSite(loc.id)) continue;
        const marked = loc.id === source?.id || loc.id === destination?.id;

        dataSource.entities.add({
          id: loc.id,
          name: loc.name,
          position: Cesium.Cartesian3.fromDegrees(loc.lon, loc.lat, 0, MARS_ELLIPSOID),
          properties: new Cesium.PropertyBag({
            id: loc.id,
            name: loc.name,
            subtitle: loc.subtitle ?? 'Outpost',
            lat: loc.lat,
            lon: loc.lon,
            kind: 'outpost',
          }),
          point: {
            pixelSize: marked ? 14 : 11,
            color: Cesium.Color.fromCssColorString('#C53929'),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: marked ? 3 : 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: loc.name,
            scale: marked ? 1.18 : 1,
            font: marked
              ? '600 15px Roboto, system-ui, sans-serif'
              : '600 13px Roboto, system-ui, sans-serif',
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.fromAlpha(Cesium.Color.BLACK, 0.85),
            outlineWidth: 3,
            pixelOffset: new Cesium.Cartesian2(0, -18),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3_800_000),
          },
        });
      }

      controller.viewer.scene.requestRender();
    };

    drawCustomCamps();
    const unsubscribe = useRoutePlannerStore.subscribe(drawCustomCamps);

    return () => {
      unsubscribe();
      if (!controller.viewer.isDestroyed()) {
        dataSource.entities.removeAll();
        controller.viewer.scene.requestRender();
      }
    };
  }, [controller]);

  useEffect(() => {
    if (!controller) return;
    const channel = controller.getOrCreateOverlayChannel(ROUTE_PINS_CHANNEL);
    const drawPins = () => {
      if (controller.viewer.isDestroyed()) return;
      channel.entities.removeAll();
      const { source, destination, pinTool } = useRoutePlannerStore.getState();
      if (source) addRoutePin(channel, source, '#202124', 'start', pinTool === 'remove');
      if (destination && destination.id !== source?.id) {
        addRoutePin(channel, destination, '#D93025', 'end', pinTool === 'remove');
      }
      controller.viewer.scene.requestRender();
    };
    drawPins();
    const unsubscribe = useRoutePlannerStore.subscribe(drawPins);
    return () => {
      unsubscribe();
      if (!controller.viewer.isDestroyed()) {
        channel.entities.removeAll();
        controller.viewer.scene.requestRender();
      }
    };
  }, [controller]);

  useEffect(() => {
    if (!controller) return;

    const unsubscribeFeature = controller.onFeatureClick((picked: PickedMapFeature) => {
      const state = useRoutePlannerStore.getState();
      if (state.pinTool === 'remove' && picked.kind === 'route-pin' && picked.pinRole) {
        if (picked.pinRole === 'start') state.setSource(null);
        else state.setDestination(null);
        state.setPinTool('remove');
        return;
      }
      if (state.pinTool || picked.kind === 'route-pin' || picked.kind !== 'outpost') return;

      const location: RouteLocation = {
        id: picked.id,
        name: picked.name,
        subtitle: picked.subtitle,
        lat: picked.lat,
        lon: picked.lon,
        category: 'outpost',
      };

      if (state.isRouteCalculatorOpen) {
        state.selectLocationFromMap(location);
      } else if (!findSite(picked.id)) {
        useNomenclatureSelection.getState().setHit(null);
        state.openIndicationsForLocation(location);
      }
    });

    const unsubscribeSurface = controller.onSurfaceClick((coords) => {
      const state = useRoutePlannerStore.getState();
      if (state.pinTool !== 'start' && state.pinTool !== 'end') return;
      const pin = droppedPinLocation(coords.lat, coords.lon);
      const label = state.pinTool === 'start' ? 'Start' : 'End';
      state.placePinnedEndpoint(state.pinTool === 'start' ? 'source' : 'destination', {
        ...pin,
        name: `${label} · ${formatPinName(coords.lat, coords.lon)}`,
        subtitle: `${label} pin`,
      });
    });

    return () => {
      unsubscribeFeature();
      unsubscribeSurface();
    };
  }, [controller]);
}

function addRoutePin(
  channel: Cesium.CustomDataSource,
  place: RouteLocation,
  color: string,
  role: 'start' | 'end',
  removable: boolean
): void {
  channel.entities.add({
    id: `route-pin-${role}`,
    position: Cesium.Cartesian3.fromDegrees(place.lon, place.lat, 0, MARS_ELLIPSOID),
    properties: removable
      ? new Cesium.PropertyBag({
          id: place.id,
          name: role === 'start' ? 'Start' : 'End',
          lat: place.lat,
          lon: place.lon,
          kind: 'route-pin',
          pinRole: role,
        })
      : undefined,
    point: removable
      ? {
          pixelSize: 46,
          color: Cesium.Color.fromAlpha(Cesium.Color.WHITE, 0.2),
          outlineColor: Cesium.Color.fromCssColorString(color),
          outlineWidth: 3,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        }
      : undefined,
    billboard: {
      image: pinImage(color),
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scale: 0.72,
    },
    label: {
      text: role === 'start' ? 'Start' : 'End',
      font: '600 13px Roboto, system-ui, sans-serif',
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.fromAlpha(Cesium.Color.BLACK, 0.85),
      outlineWidth: 3,
      pixelOffset: new Cesium.Cartesian2(0, -52),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
}

const pinCache = new Map<string, HTMLCanvasElement>();

function pinImage(color: string): HTMLCanvasElement {
  const cached = pinCache.get(color);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (!context) return canvas;
  context.beginPath();
  context.moveTo(24, 58);
  context.bezierCurveTo(8, 36, 6, 26, 10, 16);
  context.arc(24, 16, 14, Math.PI, 0, false);
  context.bezierCurveTo(42, 26, 40, 36, 24, 58);
  context.closePath();
  context.fillStyle = color;
  context.fill();
  context.lineWidth = 3;
  context.strokeStyle = '#ffffff';
  context.stroke();
  context.beginPath();
  context.arc(24, 16, 4.5, 0, Math.PI * 2);
  context.fillStyle = '#ffffff';
  context.fill();
  pinCache.set(color, canvas);
  return canvas;
}
