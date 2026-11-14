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
    lat: 24.2506,
    lonEast: 218.4,
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
    lonEast: 226.5959,
    landform: 'Pangboche crater',
    mission:
      'Station at Pangboche, a 10 km crater on the shield. The impact cut into the lava stack, so the walls are a ready-made cross-section.',
  },
  {
    id: 'karzok',
    name: 'Karzok Cache',
    kind: 'science',
    lat: 18.4035,
    lonEast: 228.2629,
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

/** True when a point sits in the Olympus Mons crew-site rehearsal area. */
export function isNearCrewSites(lat: number, lon: number): boolean {
  const lonEast = ((lon % 360) + 360) % 360;
  return OLYMPUS_SITES.some((site) => {
    const dLat = lat - site.lat;
    const dLon = (lonEast - site.lonEast) * Math.cos((site.lat * Math.PI) / 180);
    return dLat * dLat + dLon * dLon < 1.5 * 1.5;
  });
}
