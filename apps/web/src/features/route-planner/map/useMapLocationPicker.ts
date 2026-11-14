import { useEffect } from 'react';
import * as Cesium from 'cesium';
import { MARS_ELLIPSOID } from '../../../config/marsConfig';
import type {
  MarsViewerController,
  PickedMapFeature,
} from '../../../core/MarsViewerController';
import { isNearCrewSites } from '../../../components/Outposts/olympusSites';
import { CUSTOM_LOCATIONS } from '../data/customLocations';
import { useRoutePlannerStore } from '../store/useRoutePlannerStore';
import type { RouteLocation } from '../types';

const CUSTOM_LOCATIONS_CHANNEL = 'route-planner-locations';
const ROUTE_PINS_CHANNEL = 'route-endpoint-pins';

/**
 * Feature-level map adapter connecting `MarsViewerController` clicks (both
 * visible Mars Nomenclature labels and custom Locations of Interest) to the
 * lateral bar's Source / Destination state.
 */
export function useMapLocationPicker(controller: MarsViewerController | null): void {
  const presentClickedLocation = useRoutePlannerStore((s) => s.presentClickedLocation);

  // Sync any custom Locations of Interest onto a dedicated Cesium overlay channel
  useEffect(() => {
    if (!controller) return;

    const dataSource = controller.getOrCreateOverlayChannel(CUSTOM_LOCATIONS_CHANNEL);
    dataSource.entities.removeAll();

    for (const loc of CUSTOM_LOCATIONS) {
      dataSource.entities.add({
        id: loc.id,
        name: loc.name,
        position: Cesium.Cartesian3.fromDegrees(loc.lon, loc.lat, 0, MARS_ELLIPSOID),
        properties: {
          id: loc.id,
          name: loc.name,
          subtitle: loc.subtitle ?? 'Outpost',
          lat: loc.lat,
          lon: loc.lon,
          kind: 'outpost',
        },
        point: {
          pixelSize: 10,
          color: Cesium.Color.fromCssColorString('#C53929'),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: loc.name,
          font: '500 13px Roboto, system-ui, sans-serif',
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.fromAlpha(Cesium.Color.BLACK, 0.85),
          outlineWidth: 2,
          pixelOffset: new Cesium.Cartesian2(0, -16),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    }

    controller.viewer.scene.requestRender();

    return () => {
      if (!controller.viewer.isDestroyed()) {
        dataSource.entities.removeAll();
        controller.viewer.scene.requestRender();
      }
    };
  }, [controller]);

  // A click opens the side bar with start / finish choices. It does not pin yet.
  useEffect(() => {
    if (!controller) return;

    return controller.onFeatureClick((picked: PickedMapFeature) => {
      presentClickedLocation({
        id: picked.id,
        name: picked.name,
        subtitle: picked.subtitle,
        lat: picked.lat,
        lon: picked.lon,
        category: picked.kind === 'outpost' ? 'outpost' : 'nomenclature',
        priorityLevel: picked.priorityLevel,
      });
    });
  }, [controller, presentClickedLocation]);

  useEffect(() => {
    if (!controller) return;

    return controller.onSurfaceClick((coords) => {
      const latLabel = `${Math.abs(coords.lat).toFixed(2)}° ${coords.lat >= 0 ? 'N' : 'S'}`;
      const lonLabel = `${Math.abs(coords.lon).toFixed(2)}° ${coords.lon >= 0 ? 'E' : 'W'}`;
      presentClickedLocation({
        id: `pin-${coords.lat.toFixed(4)}-${coords.lon.toFixed(4)}`,
        name: `${latLabel}, ${lonLabel}`,
        subtitle: 'Map position',
        lat: coords.lat,
        lon: coords.lon,
        category: 'pin',
      });
    });
  }, [controller, presentClickedLocation]);

  useEffect(() => {
    if (!controller) return;

    const channel = controller.getOrCreateOverlayChannel(ROUTE_PINS_CHANNEL);

    const drawPins = () => {
      if (controller.viewer.isDestroyed()) return;
      channel.entities.removeAll();
      const { source, destination } = useRoutePlannerStore.getState();
      const namedFids: number[] = [];
      for (const [location, role] of [
        [source, 'start'],
        [destination, 'end'],
      ] as const) {
        if (!location) continue;
        if (isDroppedPin(location) && !isNearCrewSites(location.lat, location.lon)) {
          addRoutePin(channel, location, role);
          continue;
        }
        const fid = nomenclatureFid(location);
        if (fid !== null) namedFids.push(fid);
      }
      controller.setNamedRouteLabels(namedFids);
      controller.viewer.scene.requestRender();
    };

    drawPins();
    return useRoutePlannerStore.subscribe(drawPins);
  }, [controller]);
}

function isDroppedPin(location: RouteLocation): boolean {
  return location.category === 'pin' || location.id.startsWith('pin-');
}

function nomenclatureFid(location: RouteLocation): number | null {
  if (!location.id.startsWith('nom-')) return null;
  const fid = Number(location.id.slice(4));
  return Number.isFinite(fid) ? fid : null;
}

function addRoutePin(
  channel: Cesium.CustomDataSource,
  location: RouteLocation,
  role: 'start' | 'end'
): void {
  const isEnd = role === 'end';
  channel.entities.add({
    id: `route-${role}`,
    position: Cesium.Cartesian3.fromDegrees(location.lon, location.lat, 0, MARS_ELLIPSOID),
    point: {
      pixelSize: isEnd ? 18 : 14,
      color: Cesium.Color.fromCssColorString(isEnd ? '#EA4335' : '#FFFFFF'),
      outlineColor: Cesium.Color.fromCssColorString(isEnd ? '#FFFFFF' : '#202124'),
      outlineWidth: 3,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: isEnd ? 'End' : 'Start',
      font: '600 12px Roboto, system-ui, sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.fromCssColorString(isEnd ? '#EA4335' : '#202124'),
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -14),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
}
