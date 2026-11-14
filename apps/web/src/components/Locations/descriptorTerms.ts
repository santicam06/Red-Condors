import { USGS_DESCRIPTOR_TERMS_PAGE } from './sources';

/**
 * Morphological descriptor terms used on Mars.
 * Wording follows the USGS Gazetteer descriptor-term table:
 * https://planetarynames.wr.usgs.gov/DescriptorTerms
 * These classes are the ones listed on the Mars target page.
 */
export const MARS_DESCRIPTOR_TERMS: Record<string, string> = {
  'Albedo Feature': 'Geographic area distinguished by amount of reflected light.',
  'Catena, catenae': 'Chain of craters.',
  'Cavus, cavi':
    'Hollows, irregular steep-sided depressions usually in arrays or clusters.',
  'Chaos, chaoses': 'Distinctive area of broken terrain.',
  'Chasma, chasmata': 'A deep, elongated, steep-sided depression.',
  'Collis, colles': 'Small hills or knobs.',
  'Crater, craters': 'A circular depression.',
  'Dorsum, dorsa': 'Ridge.',
  'Fluctus, fluctūs': 'Flow terrain.',
  'Fossa, fossae': 'Long, narrow depression.',
  'Labes, labēs': 'Landslide.',
  'Labyrinthus, labyrinthi': 'Complex of intersecting valleys or ridges.',
  'Lingula, lingulae':
    'Extension of plateau having rounded lobate or tongue-like boundaries.',
  'Macula, maculae': 'Dark spot, may be irregular.',
  'Mensa, mensae': 'A flat-topped prominence with cliff-like edges.',
  'Mons, montes': 'Mountain.',
  'Palus, paludes': '"Swamp"; small plain.',
  'Patera, paterae': 'An irregular crater, or a complex one with scalloped edges.',
  'Planitia, planitiae': 'Low plain.',
  'Planum, plana': 'Plateau or high plain.',
  'Rupes, rupēs': 'Scarp.',
  'Scopulus, scopuli': 'Lobate or irregular scarp.',
  'Serpens, serpentes':
    'Sinuous feature with segments of positive and negative relief along its length.',
  'Sulcus, sulci': 'Subparallel furrows and ridges.',
  'Terra, terrae': 'Extensive land mass.',
  'Tholus, tholi': 'Small domical mountain or hill.',
  'Unda, undae': 'Dunes.',
  'Vallis, valles': 'Valley.',
  'Vastitas, vastitates': 'Extensive plain.',
};

export const DESCRIPTOR_TERMS_NOTE =
  'Descriptor terms represent morphological characteristics, not geological origin. The IAU Working Group for Planetary System Nomenclature does not endorse a specific scientific hypothesis when it assigns a descriptor.';

export function describeFeatureType(type: string): string | null {
  const direct = MARS_DESCRIPTOR_TERMS[type];
  if (direct) return direct;
  const folded = type.trim().toLowerCase();
  for (const [key, value] of Object.entries(MARS_DESCRIPTOR_TERMS)) {
    if (key.toLowerCase() === folded) return value;
  }
  return null;
}

export { USGS_DESCRIPTOR_TERMS_PAGE };
