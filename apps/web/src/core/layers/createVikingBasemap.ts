import * as Cesium from 'cesium';
import { MARS_ELLIPSOID, VIKING_WMTS_CONFIG } from '../../config/marsConfig';

/**
 * Creates the NASA Mars Trek default global basemap imagery provider:
 * `Mars_Viking_MDIM21_ClrMosaic_global_232m` (Equirectangular EPSG:104905, 2x1 root matrix).
 */
export function createVikingBasemapProvider(): Cesium.WebMapTileServiceImageryProvider {
  const tilingScheme = new Cesium.GeographicTilingScheme({
    ellipsoid: MARS_ELLIPSOID,
    rectangle: Cesium.Rectangle.MAX_VALUE,
    numberOfLevelZeroTilesX: 2,
    numberOfLevelZeroTilesY: 1,
  });

  return new Cesium.WebMapTileServiceImageryProvider({
    url: VIKING_WMTS_CONFIG.url,
    layer: VIKING_WMTS_CONFIG.layer,
    style: VIKING_WMTS_CONFIG.style,
    format: VIKING_WMTS_CONFIG.format,
    tileMatrixSetID: VIKING_WMTS_CONFIG.tileMatrixSetID,
    tileWidth: VIKING_WMTS_CONFIG.tileWidth,
    tileHeight: VIKING_WMTS_CONFIG.tileHeight,
    minimumLevel: VIKING_WMTS_CONFIG.minimumLevel,
    maximumLevel: VIKING_WMTS_CONFIG.maximumLevel,
    tilingScheme,
    rectangle: Cesium.Rectangle.MAX_VALUE,
    credit: new Cesium.Credit(VIKING_WMTS_CONFIG.credit, false),
  });
}
