import * as Cesium from 'cesium';
import { projectMarsLatLonToWindow } from '../../core/pickMarsCoordinates';
import type { RouteLocation } from '../../features/route-planner/types';
import { signedLongitude } from '../Locations/placeImagery';

/**
 * Hypothetical crew sites for an Olympus Mons rehearsal.
 * Coordinates of the named landforms come from the USGS gazetteer snapshot
 * already stored in this app. The camps themselves are not real NASA facilities.
 */

export type OutpostKind = 'base-camp' | 'habitat' | 'science' | 'waypoint';

export interface OlympusSite {
  id: string;
  name: string;
  kind: OutpostKind;
  /** Planetocentric latitude, degrees north. */
  lat: number;
  /** Planetocentric longitude, degrees east, 0–360. */
  lonEast: number;
  landform: string;
  mission: string;
}

export const OLYMPUS_FRAME = {
  lat: 20.4,
  lonEast: 223.2,
  altitudeMeters: 1_700_000,
} as const;

export const OLYMPUS_SITES: OlympusSite[] = [
  {
    id: 'lycus-base',
    name: 'Lycus Base Camp',
    kind: 'base-camp',
    lat: 24.2,
    lonEast: 218.4,
    landform: 'Lycus Sulci aureole',
    mission:
      'Landing and logistics camp on the northwest aureole, off the basal cliff. Crews stage here before any climb onto the shield.',
  },
  {
    id: 'aureole-pad',
    name: 'Aureole Sample Pad',
    kind: 'waypoint',
    lat: 27.65,
    lonEast: 226.0,
    landform: 'Lycus Sulci',
    mission:
      'Short Marswalk from camp to sample aureole blocks. The aureole is the field evidence for the giant landslides that spread off Olympus Mons.',
  },
  {
    id: 'scarp-habitat',
    name: 'Scarp Habitat',
    kind: 'habitat',
    lat: 20.6,
    lonEast: 220.9,
    landform: 'Olympus Rupes',
    mission:
      'Pressurized habitat at the foot of the basal escarpment, where the cliff exposes a stack of lava flows.',
  },
  {
    id: 'flank-relay',
    name: 'Flank Relay',
    kind: 'waypoint',
    lat: 19.6,
    lonEast: 223.6,
    landform: 'Olympus Mons shield',
    mission:
      'Rover staging point on the mid-flank. Crews rest here and log lava-flow morphology on the way to the summit.',
  },
  {
    id: 'caldera-rim',
    name: 'Caldera Rim Observatory',
    kind: 'science',
    lat: 19.04,
    lonEast: 226.81,
    landform: 'Olympus Paterae',
    mission:
      'Science stop on the north rim of the summit caldera complex, for collapse history and the lava that filled the nested pits.',
  },
  {
    id: 'pangboche',
    name: 'Pangboche Station',
    kind: 'science',
    lat: 17.2784,
    lonEast: 226.15,
    landform: 'Pangboche crater',
    mission:
      'Station at Pangboche, a 10 km crater on the shield. The impact cut into the lava stack, so the walls are a ready-made cross-section.',
  },
  {
    id: 'karzok',
    name: 'Karzok Cache',
    kind: 'science',
    lat: 18.4035,
    lonEast: 228.65,
    landform: 'Karzok crater',
    mission:
      'Sample cache at Karzok, a 15 km crater on the eastern flank. Ejecta here exposes flank lavas without a long climb back to the rim.',
  },
];

export const KIND_LABEL: Record<OutpostKind, string> = {
  'base-camp': 'Base camp',
  habitat: 'Habitat',
  science: 'Science',
  waypoint: 'Waypoint',
};

export function findSite(id: string): OlympusSite | undefined {
  return OLYMPUS_SITES.find((site) => site.id === id);
}

export function olympusSiteToRouteLocation(site: OlympusSite): RouteLocation {
  return {
    id: site.id,
    name: site.name,
    subtitle: `${KIND_LABEL[site.kind]} · hypothetical`,
    lat: site.lat,
    lon: signedLongitude(site.lonEast),
    category: 'outpost',
    campKind: site.kind,
  };
}

/** True when a point sits in the Olympus Mons crew-site rehearsal area. */
export function isNearCrewSites(lat: number, lon: number): boolean {
  const lonEast = ((lon % 360) + 360) % 360;
  return OLYMPUS_SITES.some((site) => {
    const dLat = lat - site.lat;
    const dLon = (lonEast - site.lonEast) * Math.cos((site.lat * Math.PI) / 180);
    return dLat * dLat + dLon * dLon < 1.5 * 1.5;
  });
}

function readPickedSiteId(picked: unknown): string | null {
  if (!picked || typeof picked !== 'object' || !('id' in picked)) return null;
  const entity = (picked as { id?: { id?: unknown; properties?: { siteId?: unknown } } }).id;
  if (entity && typeof entity.id === 'string') {
    const byEntityId = findSite(entity.id);
    if (byEntityId) return byEntityId.id;
  }
  const raw = entity?.properties?.siteId;
  if (!raw) return null;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw && 'getValue' in raw && typeof raw.getValue === 'function') {
    const value = raw.getValue(Cesium.JulianDate.now());
    return typeof value === 'string' ? value : null;
  }
  return null;
}

const scratchSiteWin = new Cesium.Cartesian2();
const TAN_HALF_30_DEG = Math.tan(Cesium.Math.toRadians(30));

function isWithinCampLabelRange(viewer: Cesium.Viewer): boolean {
  const { scene, camera } = viewer;
  if (scene.mode === Cesium.SceneMode.SCENE2D) {
    const frustum = camera.frustum;
    if (
      frustum instanceof Cesium.OrthographicOffCenterFrustum &&
      typeof frustum.right === 'number' &&
      typeof frustum.left === 'number'
    ) {
      const alt = Math.abs(frustum.right - frustum.left) / (2 * TAN_HALF_30_DEG);
      return alt <= 3_800_000;
    }
  }
  return camera.positionCartographic.height <= 3_800_000;
}

/**
 * Resolves an Olympus Mons crew camp at a canvas pixel coordinate using fast
 * CPU screen-space projection first (supporting both 3D horizon culling and
 * 2D ±180° infinite-scroll wrapping without WebGL `drillPick` stalls), with an
 * optional GPU `drillPick` fallback reserved strictly for discrete clicks.
 */
export function pickOlympusSiteAt(
  viewer: Cesium.Viewer,
  windowPosition: Cesium.Cartesian2,
  options?: { useGpuDrillPick?: boolean }
): OlympusSite | null {
  if (viewer.isDestroyed()) return null;

  const maxRadiusPx = 12;
  const checkLabels = isWithinCampLabelRange(viewer);
  let closest: { site: OlympusSite; dist2: number } | null = null;

  for (const site of OLYMPUS_SITES) {
    const winPos = projectMarsLatLonToWindow(
      viewer,
      signedLongitude(site.lonEast),
      site.lat,
      scratchSiteWin,
      windowPosition.x
    );
    if (!winPos) continue;

    const dx = windowPosition.x - winPos.x;
    const dy = windowPosition.y - winPos.y;
    const dist2 = dx * dx + dy * dy;
    const hitDot = dist2 <= maxRadiusPx * maxRadiusPx;
    const halfLabelW = Math.ceil(site.name.length * 4.3) + 8;
    const hitLabel =
      checkLabels && Math.abs(dx) <= halfLabelW && dy >= -30 && dy <= -6;

    if ((hitDot || hitLabel) && (!closest || dist2 < closest.dist2)) {
      closest = { site, dist2 };
    }
  }

  if (closest) return closest.site;

  if (options?.useGpuDrillPick) {
    const drilled = viewer.scene.drillPick(windowPosition, 10, 8, 8);
    for (const item of drilled) {
      const siteId = readPickedSiteId(item);
      if (siteId) {
        const site = findSite(siteId);
        if (site) return site;
      }
    }
  }

  return null;
}
