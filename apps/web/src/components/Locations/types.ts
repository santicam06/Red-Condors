/** One approved feature from the USGS Mars nomenclature center-point gazetteer. */
export interface UsgsFeatureRecord {
  name: string;
  approvalDate: string;
  approval: string;
  origin: string;
  diameterKm: number | null;
  /** Planetocentric latitude, degrees. */
  centerLatitude: number | null;
  /** Planetocentric longitude, +East, 0–360 degrees, as published by USGS. */
  centerLongitude: number | null;
  type: string;
  code: string;
  southLatitude: number | null;
  northLatitude: number | null;
  westLongitude: number | null;
  eastLongitude: number | null;
  ethnicity: string;
  continent: string;
  quadName: string;
  quadCode: string;
  featureId: number | null;
  featureUrl: string;
}
