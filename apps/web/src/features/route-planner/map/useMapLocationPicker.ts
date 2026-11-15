import { useEffect } from 'react';
import * as Cesium from 'cesium';
import { useNomenclatureSelection } from '../../../components/Locations/useNomenclatureSelection';
import { findSite } from '../../../components/Outposts/olympusSites';
import { MARS_ELLIPSOID } from '../../../config/marsConfig';
import type {
  MarsViewerController,
  PickedMapFeature,
} from '../../../core/MarsViewerController';
import { CUSTOM_LOCATIONS } from '../data/customLocations';
import { useRoutePlannerStore } from '../store/useRoutePlannerStore';
import { isCampRouteLocation, type RouteLocation } from '../types';

const CUSTOM_LOCATIONS_CHANNEL = 'route-planner-locations';

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

  // Only actual camp / outpost markers can populate Source or Destination
  useEffect(() => {
    if (!controller) return;

    return controller.onFeatureClick((picked: PickedMapFeature) => {
      if (picked.kind !== 'outpost') return;

      const location: RouteLocation = {
        id: picked.id,
        name: picked.name,
        subtitle: picked.subtitle,
        lat: picked.lat,
        lon: picked.lon,
        category: 'outpost',
      };

      const state = useRoutePlannerStore.getState();
      if (state.isRouteCalculatorOpen) {
        state.selectLocationFromMap(location);
      } else if (!findSite(picked.id)) {
        useNomenclatureSelection.getState().setHit(null);
        state.openIndicationsForLocation(location);
      }
    });
  }, [controller]);
}
