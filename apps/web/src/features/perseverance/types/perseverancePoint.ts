export interface PerseverancePointOfInterest {
  id: string;
  name: string;
  locationName: string;
  latitude: number;
  longitude: number;
  coordinateAccuracy: 'approximate';
  coordinateNote: string;
}

/**
 * APPROXIMATE representative coordinate for the Perseverance landing area inside
 * Jezero Crater. This is not a per-sol rover position or a verified crater centroid.
 * Replace it once the team confirms the official coordinate and Mars CRS convention.
 */
export const PERSEVERANCE_JEZERO_POINT: PerseverancePointOfInterest = {
  id: 'perseverance-jezero-weather',
  name: 'Perseverance MEDA',
  locationName: 'Jezero Crater',
  latitude: 18.4447,
  longitude: 77.4508,
  coordinateAccuracy: 'approximate',
  coordinateNote:
    'Representative Perseverance landing-area coordinate pending official verification.',
};

export const PERSEVERANCE_WEATHER_DATASET = {
  name: 'Mars Perseverance MEDA Weather',
  recordCount: 118_429,
  solCount: 125,
  firstSol: 1727,
  lastSol: 1859,
  cadence: '1-minute',
  meanPressurePa: 717.9,
  minimumPressurePa: 636.1,
  maximumPressurePa: 774.9,
  huggingFaceUrl:
    'https://huggingface.co/datasets/juliensimon/mars-perseverance-weather',
  pdsUrl:
    'https://pds-atmospheres.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/data_derived_env/',
} as const;
