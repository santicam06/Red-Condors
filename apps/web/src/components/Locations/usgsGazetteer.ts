import type { UsgsFeatureRecord } from './types';
import gazetteerJson from './usgsGazetteer.json';

const gazetteer = gazetteerJson as Record<string, UsgsFeatureRecord>;

/** Approved Mars feature records from the USGS center-point gazetteer, keyed by clean name. */
export function lookupUsgsFeature(name: string): UsgsFeatureRecord | null {
  return gazetteer[name.trim().toLowerCase()] ?? null;
}
