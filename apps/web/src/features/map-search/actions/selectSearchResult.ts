import * as Cesium from 'cesium';
import { useNomenclatureSelection } from '../../../components/Locations/useNomenclatureSelection';
import { useOutpostSelection } from '../../../components/Outposts/useOutpostSelection';
import { MARS_ELLIPSOID } from '../../../config/marsConfig';
import type { MarsViewerController } from '../../../core/MarsViewerController';
import { useRoutePlannerStore } from '../../route-planner/store/useRoutePlannerStore';
import { useStreetViewStore } from '../../rover-streetview/store/useStreetViewStore';
import type { SearchEntry } from '../data/searchSources';

const PIN_CHANNEL = 'map-search-pin';
const CAMP_ALTITUDE_M = 150_000;
const COORDINATES_ALTITUDE_M = 200_000;

/**
 * Altitude that frames a named place: about three times its size, so small
 * craters zoom in close enough for their map label to appear (level-7 labels
 * only show below ~550 km) and large regions stay in view.
 */
function placeAltitude(diameterKm: number): number {
  if (!(diameterKm > 0)) return 800_000;
  return Cesium.Math.clamp(diameterKm * 3_000, 60_000, 3_000_000);
}

export function clearSearchPin(controller: MarsViewerController | null): void {
  if (!controller || controller.viewer.isDestroyed()) return;
  controller.getOrCreateOverlayChannel(PIN_CHANNEL).entities.removeAll();
  controller.viewer.scene.requestRender();
}

function dropSearchPin(controller: MarsViewerController, entry: SearchEntry): void {
  const channel = controller.getOrCreateOverlayChannel(PIN_CHANNEL);
  channel.entities.removeAll();
  channel.entities.add({
    position: Cesium.Cartesian3.fromDegrees(entry.lon, entry.lat, 0, MARS_ELLIPSOID),
    point: {
      pixelSize: 12,
      color: Cesium.Color.fromCssColorString('#B91C1C'),
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: entry.title,
      font: '500 12px "JetBrains Mono", monospace',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -16),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
  controller.viewer.scene.requestRender();
}

/**
 * Opens a search result using the same flows as clicking on the map:
 * - place → place card in the side bar (as a label click does) + fly there
 * - camp → camp card in the side bar (as a camp-dot click does) + fly there
 * - Street View stop → full-screen 360° panorama (the map moves to the stop)
 * - area (e.g. the rover tour) → fly there
 * - coordinates → fly there and drop a temporary pin
 */
export function selectSearchResult(
  controller: MarsViewerController | null,
  entry: SearchEntry
): void {
  if (!controller) return;
  clearSearchPin(controller);

  switch (entry.kind) {
    case 'place':
      useNomenclatureSelection.getState().setHit(entry.hit);
      useRoutePlannerStore.getState().setOpen(true);
      controller.flyToLatLon(entry.lon, entry.lat, placeAltitude(entry.hit.diameterKm));
      break;
    case 'camp':
      useNomenclatureSelection.getState().setHit(null);
      useOutpostSelection.getState().select(entry.siteId);
      useRoutePlannerStore.getState().setOpen(true);
      controller.flyToLatLon(entry.lon, entry.lat, CAMP_ALTITUDE_M);
      break;
    case 'streetview':
      useStreetViewStore.getState().open(entry.stop);
      break;
    case 'area':
      controller.flyToLatLon(entry.lon, entry.lat, entry.altitudeM);
      break;
    case 'coordinates':
      dropSearchPin(controller, entry);
      controller.flyToLatLon(entry.lon, entry.lat, COORDINATES_ALTITUDE_M);
      break;
  }
}
