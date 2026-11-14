import * as Cesium from 'cesium';
import {
  MARS_CIRCUMFERENCE_METERS,
  MARS_ELLIPSOID,
  NOMENCLATURE_LEVEL_MAX_ALTITUDE_METERS,
} from '../../config/marsConfig';
import {
  type NomenclatureGeoJSON,
  loadNomenclatureGeoJSON,
} from './nomenclatureData';

export interface PickedMapFeature {
  id: string;
  name: string;
  subtitle?: string;
  lat: number;
  lon: number;
  kind: 'nomenclature' | 'outpost';
  priorityLevel?: number;
}

interface LabelEntry {
  label: Cesium.Label;
  feature: PickedMapFeature;
  position3D: Cesium.Cartesian3;
  occludeePoint: Cesium.Cartesian3;
  level: number;
  halfWidthPx: number;
  halfHeightPx: number;
}

interface ScreenBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface HitBoxEntry {
  box: ScreenBox;
  feature: PickedMapFeature;
}

/**
 * Manages NASA Mars Trek's curated 1,783 IAU Nomenclature labels across both
 * 3D Globe and 2D Equirectangular Map modes, including:
 * - Mars Trek `level` (1–7) altitude-based progressive disclosure
 * - 3D back-of-globe horizon culling via `EllipsoidalOccluder`
 * - Priority-ordered screen-space bounding-box decluttering
 * - Instant O(1) toggle visibility
 */
export class NomenclatureManager {
  private readonly viewer: Cesium.Viewer;
  private readonly getEffectiveAltitude: () => number;
  private readonly labelCollection: Cesium.LabelCollection;
  private readonly occluderEllipsoid: Cesium.Ellipsoid;
  private readonly occluder: Cesium.EllipsoidalOccluder;
  private readonly scratchWindowPos = new Cesium.Cartesian2();

  private entries: LabelEntry[] = [];
  private visibleHitBoxes: HitBoxEntry[] = [];
  private visible: boolean;
  private destroyed = false;
  private removePostRenderListener: (() => void) | null = null;

  // Dirty-tracking state so idle frames cost 0.00ms
  private lastCameraPos = new Cesium.Cartesian3(Number.NaN, Number.NaN, Number.NaN);
  private lastCameraDir = new Cesium.Cartesian3(Number.NaN, Number.NaN, Number.NaN);
  private lastAltitude = Number.NaN;
  private lastMode: Cesium.SceneMode | null = null;
  private forceRefresh = true;

  constructor(
    viewer: Cesium.Viewer,
    getEffectiveAltitude: () => number,
    initialVisible = true
  ) {
    this.viewer = viewer;
    this.getEffectiveAltitude = getEffectiveAltitude;
    this.visible = initialVisible;

    // Slightly inset ellipsoid (-1.5 km) prevents precision flicker for points near the limb
    this.occluderEllipsoid = new Cesium.Ellipsoid(
      MARS_ELLIPSOID.radii.x - 1500,
      MARS_ELLIPSOID.radii.y - 1500,
      MARS_ELLIPSOID.radii.z - 1500
    );
    this.occluder = new Cesium.EllipsoidalOccluder(
      this.occluderEllipsoid,
      viewer.camera.positionWC
    );

    // Passing `scene` is required so Cesium projects labels in SCENE2D + INFINITE_SCROLL
    this.labelCollection = viewer.scene.primitives.add(
      new Cesium.LabelCollection({
        scene: viewer.scene,
        show: initialVisible,
      })
    );

    this.removePostRenderListener = viewer.scene.postRender.addEventListener(() => {
      this.updateLabelVisibilityIfNeeded();
    });
  }

  public async load(): Promise<void> {
    try {
      const data = await loadNomenclatureGeoJSON();
      if (this.destroyed) return;

      this.populateLabels(data);
      this.forceRefresh = true;
      this.updateLabelVisibilityIfNeeded();
      this.viewer.scene.requestRender();
    } catch (error) {
      console.error('Failed to load Mars Nomenclature GeoJSON:', error);
    }
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.labelCollection.show = visible;
    if (visible) {
      this.forceRefresh = true;
      this.updateLabelVisibilityIfNeeded();
    } else {
      this.visibleHitBoxes = [];
    }
    if (!this.viewer.isDestroyed()) {
      this.viewer.scene.requestRender();
    }
  }

  public markDirty(): void {
    this.forceRefresh = true;
  }

  /**
   * Hit-tests currently visible nomenclature labels at `(x, y)` CSS canvas pixels
   * across both 3D Globe and 2D Infinite-Scroll Map modes.
   */
  public pickAtWindowPosition(x: number, y: number): PickedMapFeature | null {
    if (this.destroyed || !this.visible || this.visibleHitBoxes.length === 0) {
      return null;
    }

    const pad = 4;
    for (let i = 0; i < this.visibleHitBoxes.length; i++) {
      const { box, feature } = this.visibleHitBoxes[i];
      if (
        x >= box.minX - pad &&
        x <= box.maxX + pad &&
        y >= box.minY - pad &&
        y <= box.maxY + pad
      ) {
        return feature;
      }
    }
    return null;
  }

  private populateLabels(geojson: NomenclatureGeoJSON): void {
    const fillWhite = Cesium.Color.WHITE;
    const outlineDark = Cesium.Color.fromAlpha(Cesium.Color.BLACK, 0.85);

    this.entries = geojson.features.map((featureItem) => {
      const [lon, lat] = featureItem.geometry.coordinates;
      const { fid, name, type, level } = featureItem.properties;
      const clampedLevel = Math.max(1, Math.min(7, level || 7));

      const feature: PickedMapFeature = {
        id: `nom-${fid}`,
        name,
        subtitle: type,
        lat,
        lon,
        kind: 'nomenclature',
        priorityLevel: clampedLevel,
      };

      const position3D = Cesium.Cartesian3.fromDegrees(lon, lat, 0, MARS_ELLIPSOID);
      const occludeePoint = Cesium.Cartesian3.fromDegrees(lon, lat, 250, MARS_ELLIPSOID);

      const isMajorRegion = clampedLevel <= 2;
      const font = isMajorRegion
        ? '500 14.5px Roboto, system-ui, -apple-system, sans-serif'
        : '500 13.5px Roboto, system-ui, -apple-system, sans-serif';

      const approxCharWidth = isMajorRegion ? 7.8 : 7.2;
      const halfWidthPx = Math.ceil((name.length * approxCharWidth) / 2) + 8;
      const halfHeightPx = isMajorRegion ? 11 : 10;

      const label = this.labelCollection.add({
        id: feature,
        position: position3D,
        text: name,
        font,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        fillColor: fillWhite,
        outlineColor: outlineDark,
        outlineWidth: 2,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        show: false,
      });

      return {
        label,
        feature,
        position3D,
        occludeePoint,
        level: clampedLevel,
        halfWidthPx,
        halfHeightPx,
      };
    });
  }

  private updateLabelVisibilityIfNeeded(): void {
    if (this.destroyed || !this.visible || this.entries.length === 0) {
      return;
    }

    const { scene, camera } = this.viewer;
    const altitude = this.getEffectiveAltitude();
    const mode = scene.mode;

    const cameraMoved =
      this.forceRefresh ||
      mode !== this.lastMode ||
      Math.abs(altitude - this.lastAltitude) > altitude * 0.005 ||
      !Cesium.Cartesian3.equalsEpsilon(camera.positionWC, this.lastCameraPos, 0, 50) ||
      !Cesium.Cartesian3.equalsEpsilon(camera.directionWC, this.lastCameraDir, 0.0002);

    if (!cameraMoved) {
      return;
    }

    this.forceRefresh = false;
    this.lastMode = mode;
    this.lastAltitude = altitude;
    Cesium.Cartesian3.clone(camera.positionWC, this.lastCameraPos);
    Cesium.Cartesian3.clone(camera.directionWC, this.lastCameraDir);

    const is3D = mode === Cesium.SceneMode.SCENE3D;
    if (is3D) {
      this.occluder.cameraPosition = camera.positionWC;
    }

    const canvasWidth = scene.canvas.clientWidth;
    const canvasHeight = scene.canvas.clientHeight;
    const placedBoxes: ScreenBox[] = [];
    const nextHitBoxes: HitBoxEntry[] = [];

    // In 2D INFINITE_SCROLL, compute pixel width of one full 360° Mars circumference
    // so wrapped coordinates across the ±180° antimeridian are also collision-checked cleanly
    let circumferenceWidthPx = 0;
    if (
      !is3D &&
      camera.frustum instanceof Cesium.OrthographicOffCenterFrustum &&
      typeof camera.frustum.right === 'number' &&
      typeof camera.frustum.left === 'number'
    ) {
      const frustumWidthMeters = Math.abs(camera.frustum.right - camera.frustum.left);
      if (frustumWidthMeters > 0) {
        circumferenceWidthPx =
          (MARS_CIRCUMFERENCE_METERS / frustumWidthMeters) * canvasWidth;
      }
    }

    // Features are pre-sorted by priority (`level` 1 -> 7, then `diameter` descending)
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const maxAllowedAlt =
        NOMENCLATURE_LEVEL_MAX_ALTITUDE_METERS[entry.level] ??
        NOMENCLATURE_LEVEL_MAX_ALTITUDE_METERS[7];

      if (altitude > maxAllowedAlt) {
        entry.label.show = false;
        continue;
      }

      if (is3D && !this.occluder.isPointVisible(entry.occludeePoint)) {
        entry.label.show = false;
        continue;
      }

      const winPos = Cesium.SceneTransforms.worldToWindowCoordinates(
        scene,
        entry.position3D,
        this.scratchWindowPos
      );

      if (!winPos || !Number.isFinite(winPos.x) || !Number.isFinite(winPos.y)) {
        entry.label.show = false;
        continue;
      }

      let screenX = winPos.x;
      const screenY = winPos.y;

      // Wrap X into [0, canvasWidth] in 2D INFINITE_SCROLL when panned across ±180°
      if (!is3D && circumferenceWidthPx > 0) {
        while (screenX < -entry.halfWidthPx) {
          screenX += circumferenceWidthPx;
        }
        while (screenX > canvasWidth + entry.halfWidthPx) {
          screenX -= circumferenceWidthPx;
        }
      }

      const inViewport =
        screenX >= -entry.halfWidthPx &&
        screenX <= canvasWidth + entry.halfWidthPx &&
        screenY >= -entry.halfHeightPx &&
        screenY <= canvasHeight + entry.halfHeightPx;

      if (!inViewport) {
        entry.label.show = false;
        continue;
      }

      const candidate: ScreenBox = {
        minX: screenX - entry.halfWidthPx,
        maxX: screenX + entry.halfWidthPx,
        minY: screenY - entry.halfHeightPx,
        maxY: screenY + entry.halfHeightPx,
      };

      let collides = false;
      for (let j = 0; j < placedBoxes.length; j++) {
        const b = placedBoxes[j];
        if (
          candidate.minX < b.maxX &&
          candidate.maxX > b.minX &&
          candidate.minY < b.maxY &&
          candidate.maxY > b.minY
        ) {
          collides = true;
          break;
        }
      }

      if (collides) {
        entry.label.show = false;
      } else {
        placedBoxes.push(candidate);
        nextHitBoxes.push({ box: candidate, feature: entry.feature });
        // Also reserve ±360° wrapped positions in 2D INFINITE_SCROLL so edge-spanning labels never overlap across the seam
        if (!is3D && circumferenceWidthPx > 0) {
          const leftWrap: ScreenBox = {
            minX: candidate.minX - circumferenceWidthPx,
            maxX: candidate.maxX - circumferenceWidthPx,
            minY: candidate.minY,
            maxY: candidate.maxY,
          };
          const rightWrap: ScreenBox = {
            minX: candidate.minX + circumferenceWidthPx,
            maxX: candidate.maxX + circumferenceWidthPx,
            minY: candidate.minY,
            maxY: candidate.maxY,
          };
          placedBoxes.push(leftWrap, rightWrap);
          nextHitBoxes.push(
            { box: leftWrap, feature: entry.feature },
            { box: rightWrap, feature: entry.feature }
          );
        }
        entry.label.show = true;
      }
    }

    this.visibleHitBoxes = nextHitBoxes;
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.removePostRenderListener) {
      this.removePostRenderListener();
      this.removePostRenderListener = null;
    }
    if (!this.viewer.isDestroyed()) {
      this.viewer.scene.primitives.remove(this.labelCollection);
    }
    this.entries = [];
    this.visibleHitBoxes = [];
  }
}
