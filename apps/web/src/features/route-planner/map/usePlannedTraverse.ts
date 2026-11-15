import { useEffect } from 'react';
import * as Cesium from 'cesium';
import type { MarsViewerController } from '../../../core/MarsViewerController';
import { formatDuration, planTraverse } from '../../../components/Outposts/navigation';
import type { OlympusSite } from '../../../components/Outposts/olympusSites';
import { useRoutePlannerStore } from '../store/useRoutePlannerStore';
import type { RouteLocation } from '../types';

const CHANNEL = 'planned-traverse';

/** Straight-line distance and ETA between the side-bar start and destination. */
export function usePlannedTraverse(controller: MarsViewerController | null): void {
  const source = useRoutePlannerStore((state) => state.source);
  const destination = useRoutePlannerStore((state) => state.destination);
  const travelMode = useRoutePlannerStore((state) => state.travelMode);

  useEffect(() => {
    if (!controller) return;
    const channel = controller.getOrCreateOverlayChannel(CHANNEL);
    const apply = useRoutePlannerStore.getState().setTraverseSummary;
    channel.entities.removeAll();

    if (!source || !destination || source.id === destination.id) {
      apply({
        distanceKm: null,
        marswalkEta: null,
        roverEta: null,
      });
      controller.viewer.scene.requestRender();
      return;
    }

    const from = toSite(source);
    const to = toSite(destination);
    const walk = planTraverse(from, to, 'marswalk');
    const rover = planTraverse(from, to, 'rover');
    apply({
      distanceKm: walk.distanceMeters / 1000,
      marswalkEta: formatDuration(walk.durationHours),
      roverEta: formatDuration(rover.durationHours),
    });
    addLine(
      channel,
      'planned-direct',
      walk.positions,
      travelMode === 'rover' ? '#7EB6FF' : '#F5C542',
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
      material: new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.fromCssColorString(color),
        dashLength: 18,
      }),
      arcType: Cesium.ArcType.NONE,
    },
  });
}
