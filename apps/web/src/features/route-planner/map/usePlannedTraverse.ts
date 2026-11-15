import * as Cesium from 'cesium';
import { useEffect, useRef } from 'react';
import type { OlympusSite } from '../../../components/Outposts/olympusSites';
import type { MarsViewerController } from '../../../core/MarsViewerController';
import { chooseBestDirection, type DirectionChoice } from '../bestDirection';
import { useRoutePlannerStore } from '../store/useRoutePlannerStore';
import type { RouteLocation, TravelMode } from '../types';

const CHANNEL = 'planned-traverse';

const MODE_COLOR: Record<TravelMode, string> = {
  marswalk: '#F5C542',
  rover: '#7EB6FF',
  vehicle: '#E07A3D',
};

/** Draws the selected rehearsal leg and keeps the Best mode in step with the ends. */
export function usePlannedTraverse(controller: MarsViewerController | null): void {
  const source = useRoutePlannerStore((state) => state.source);
  const destination = useRoutePlannerStore((state) => state.destination);
  const travelMode = useRoutePlannerStore((state) => state.travelMode);
  const choiceRef = useRef<{ key: string; choice: DirectionChoice } | null>(null);

  useEffect(() => {
    if (!controller) return;
    const channel = controller.getOrCreateOverlayChannel(CHANNEL);
    const apply = useRoutePlannerStore.getState().setTraverseSummary;
    channel.entities.removeAll();

    if (!source || !destination || source.id === destination.id) {
      choiceRef.current = null;
      apply({
        distanceKm: null,
        marswalkEta: null,
        roverEta: null,
        vehicleEta: null,
        bestMode: null,
        bestReason: null,
        energyNote: null,
      });
      controller.viewer.scene.requestRender();
      return;
    }

    const key = `${source.id}|${destination.id}`;
    if (choiceRef.current?.key !== key) {
      const choice = chooseBestDirection(toSite(source), toSite(destination));
      choiceRef.current = { key, choice };
      if (useRoutePlannerStore.getState().travelMode !== choice.mode) {
        useRoutePlannerStore.getState().setTravelMode(choice.mode);
      }
    }

    const choice = choiceRef.current.choice;
    const mode = useRoutePlannerStore.getState().travelMode;
    const positions = choice.paths[mode];
    apply({
      distanceKm: choice.distanceKm[mode],
      marswalkEta: choice.eta.marswalk,
      roverEta: choice.eta.rover,
      vehicleEta: choice.eta.vehicle,
      bestMode: choice.mode,
      bestReason: choice.reason,
      energyNote: choice.energyNote[mode],
    });
    addLine(channel, 'planned-outline', positions.length > 1 ? positions : choice.paths[choice.mode], '#202124', 8);
    addLine(
      channel,
      'planned-direct',
      positions.length > 1 ? positions : choice.paths[choice.mode],
      MODE_COLOR[mode],
      4
    );

    controller.viewer.scene.requestRender();

    return () => {
      if (!controller.viewer.isDestroyed()) {
        channel.entities.removeAll();
        controller.viewer.scene.requestRender();
      }
    };
  }, [controller, source, destination, travelMode]);
}

function toSite(location: RouteLocation): OlympusSite {
  const lonEast = ((location.lon % 360) + 360) % 360;
  return {
    id: location.id,
    name: location.name,
    kind: 'waypoint',
    lat: location.lat,
    lonEast,
    landform: location.subtitle ?? '',
    mission: '',
  };
}

function addLine(
  channel: Cesium.CustomDataSource,
  id: string,
  positions: Cesium.Cartesian3[],
  color: string,
  width: number
): void {
  if (positions.length < 2) return;
  channel.entities.add({
    id,
    polyline: {
      positions,
      width,
      arcType: Cesium.ArcType.GEODESIC,
      material:
        id === 'planned-outline'
          ? Cesium.Color.fromCssColorString(color)
          : new Cesium.PolylineDashMaterialProperty({
              color: Cesium.Color.fromCssColorString(color),
              dashLength: 18,
            }),
      clampToGround: false,
    },
  });
}
