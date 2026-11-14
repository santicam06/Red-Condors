/**
 * Fetches NASA Mars Trek's curated IAU Nomenclature dataset (1,783 Martian surface features)
 * from https://trek.nasa.gov/mars/trekarcgis/rest/services/combinedNom/MapServer/0
 * and saves a compact, normalized GeoJSON bundle to public/data/mars_nomenclature.geojson.
 *
 * Data Credit: IAU Working Group for Planetary System Nomenclature / USGS Astrogeology / NASA JPL Mars Trek.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(__dirname, '../public/data/mars_nomenclature.geojson');

const ENDPOINT =
  'https://trek.nasa.gov/mars/trekarcgis/rest/services/combinedNom/MapServer/0/query';

const OUT_FIELDS = [
  'FID',
  'name',
  'clean_name',
  'diameter',
  'center_lon',
  'center_lat',
  'type',
  'code',
  'score',
  'level',
  'LABEL',
  'x',
  'y',
].join(',');

async function fetchBatch(whereClause) {
  const params = new URLSearchParams({
    where: whereClause,
    outFields: OUT_FIELDS,
    returnGeometry: 'true',
    f: 'json',
  });

  const url = `${ENDPOINT}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  const data = await res.json();
  if (!Array.isArray(data.features)) {
    throw new Error(`Unexpected payload structure for ${whereClause}`);
  }
  return data.features;
}

function normalizeLon180(lon) {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

async function main() {
  console.log('Fetching Mars Trek IAU Nomenclature features...');

  // Server maxRecordCount is 1000; total count is ~1783, split cleanly by FID ranges
  const [batch1, batch2, batch3] = await Promise.all([
    fetchBatch('FID >= 0 AND FID < 1000'),
    fetchBatch('FID >= 1000 AND FID < 2000'),
    fetchBatch('FID >= 2000'),
  ]);

  const rawFeatures = [...batch1, ...batch2, ...batch3];

  const geojsonFeatures = rawFeatures
    .map((item) => {
      const attrs = item.attributes ?? {};
      const geom = item.geometry ?? {};
      const rawLon =
        typeof geom.x === 'number'
          ? geom.x
          : typeof attrs.x === 'number'
            ? attrs.x
            : attrs.center_lon;
      const rawLat =
        typeof geom.y === 'number'
          ? geom.y
          : typeof attrs.y === 'number'
            ? attrs.y
            : attrs.center_lat;

      if (typeof rawLon !== 'number' || typeof rawLat !== 'number') {
        return null;
      }

      const lon = Number(normalizeLon180(rawLon).toFixed(6));
      const lat = Number(Math.max(-90, Math.min(90, rawLat)).toFixed(6));
      const label = (attrs.clean_name || attrs.LABEL || attrs.name || '').trim();
      if (!label) return null;

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lon, lat],
        },
        properties: {
          fid: attrs.FID,
          name: label,
          type: attrs.type || '',
          code: attrs.code || '',
          diameter: typeof attrs.diameter === 'number' ? Number(attrs.diameter.toFixed(2)) : 0,
          level: typeof attrs.level === 'number' ? attrs.level : 7,
          score: typeof attrs.score === 'number' ? attrs.score : 0,
        },
      };
    })
    .filter(Boolean);

  // Sort by priority level ascending (1 = planetary regions first) then diameter descending
  geojsonFeatures.sort((a, b) => {
    if (a.properties.level !== b.properties.level) {
      return a.properties.level - b.properties.level;
    }
    return b.properties.diameter - a.properties.diameter;
  });

  const geojson = {
    type: 'FeatureCollection',
    metadata: {
      source: 'NASA Mars Trek / IAU Working Group for Planetary System Nomenclature / USGS Astrogeology',
      endpoint: 'https://trek.nasa.gov/mars/trekarcgis/rest/services/combinedNom/MapServer/0',
      crs: 'EPSG:104905 (GCS_Mars_2000)',
      count: geojsonFeatures.length,
    },
    features: geojsonFeatures,
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(geojson));

  console.log(`Saved ${geojsonFeatures.length} Mars nomenclature features to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('Failed to fetch Mars nomenclature:', err);
  process.exit(1);
});
