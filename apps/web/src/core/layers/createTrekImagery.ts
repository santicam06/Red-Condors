import * as Cesium from 'cesium';
import { MARS_ELLIPSOID } from '../../config/marsConfig';

export function createTrekImageryProvider(options: {
  layerId: string;
  extension: 'jpg' | 'png';
  maximumLevel: number;
  credit: string;
}): Cesium.WebMapTileServiceImageryProvider {
  const tilingScheme = new Cesium.GeographicTilingScheme({
    ellipsoid: MARS_ELLIPSOID,
    rectangle: Cesium.Rectangle.MAX_VALUE,
    numberOfLevelZeroTilesX: 2,
    numberOfLevelZeroTilesY: 1,
  });

  return new Cesium.WebMapTileServiceImageryProvider({
    url: `https://trek.nasa.gov/tiles/Mars/EQ/${options.layerId}/1.0.0/default/default028mm/{TileMatrix}/{TileRow}/{TileCol}.${options.extension}`,
    layer: options.layerId,
    style: 'default',
    format: options.extension === 'png' ? 'image/png' : 'image/jpeg',
    tileMatrixSetID: 'default028mm',
    tileWidth: 256,
    tileHeight: 256,
    minimumLevel: 0,
    maximumLevel: options.maximumLevel,
    tilingScheme,
    rectangle: Cesium.Rectangle.MAX_VALUE,
    credit: new Cesium.Credit(options.credit, false),
  });
}
