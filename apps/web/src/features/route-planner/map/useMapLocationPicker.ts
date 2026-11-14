import { useEffect } from 'react';
import * as Cesium from 'cesium';
import { MARS_ELLIPSOID } from '../../../config/marsConfig';
import type {
  MarsViewerController,
  PickedMapFeature,
} from '../../../core/MarsViewerController';
import { CUSTOM_LOCATIONS } from '../data/customLocations';
import { useRoutePlannerStore } from '../store/useRoutePlannerStore';

const CUSTOM_LOCATIONS_CHANNEL = 'route-planner-locations';

/**
 * Feature-level map adapter connecting `MarsViewerController` clicks (both
 * visible Mars Nomenclature labels and custom Locations of Interest) to the
 * lateral bar's Source / Destination state.
 */
export function useMapLocationPicker(controller: MarsViewerController | null): void {
  const selectLocationFromMap = useRoutePlannerStore((s) => s.selectLocationFromMap);

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

  // Forward feature clicks on the Mars globe/map into Source / Destination boxes
  useEffect(() => {
    if (!controller) return;

    return controller.onFeatureClick((picked: PickedMapFeature) => {
      selectLocationFromMap({
        id: picked.id,
        name: picked.name,
        subtitle: picked.subtitle,
        lat: picked.lat,
        lon: picked.lon,
        category: picked.kind === 'outpost' ? 'outpost' : 'nomenclature',
        priorityLevel: picked.priorityLevel,
      });
    });
  }, [controller, selectLocationFromMap]);
}
