import * as Cesium from 'cesium';
import {
  MARS_CIRCUMFERENCE_METERS,
  MARS_ELLIPSOID,
  NOMENCLATURE_GEOJSON_URL,
  NOMENCLATURE_LEVEL_MAX_ALTITUDE_METERS,
} from '../../config/marsConfig';

interface NomenclatureFeatureProperties {
  fid: number;
  name: string;
  type: string;
  code: string;
  diameter: number;
  level: number;
  score: number;
}

interface NomenclatureGeoJSON {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'Point';
      coordinates: [number, number];
    };
    properties: NomenclatureFeatureProperties;
  }>;
}

interface LabelEntry {
  fid: number;
  label: Cesium.Label;
  position3D: Cesium.Cartesian3;
  occludeePoint: Cesium.Cartesian3;
  longitude: number;
  latitude: number;
  name: string;
  type: string;
  code: string;
  diameterKm: number;
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

/** A nomenclature label the pointer can hover or open. */
export interface NomenclatureLabelHit {
  fid: number;
  name: string;
  type: string;
  code: string;
  diameterKm: number;
  level: number;
  /** East-positive longitude in [-180, 180], matching the map readout. */
  longitude: number;
  latitude: number;
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
  private readonly entriesByFid = new Map<number, LabelEntry>();
  private readonly restFill = Cesium.Color.WHITE.clone();
  private readonly activeFill = Cesium.Color.fromCssColorString('#4C9AFF');
  private readonly scratchFill = new Cesium.Color();
  private readonly scratchPickWindow = new Cesium.Cartesian2();
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
      const response = await fetch(NOMENCLATURE_GEOJSON_URL);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} loading ${NOMENCLATURE_GEOJSON_URL}`);
      }
      const data = (await response.json()) as NomenclatureGeoJSON;
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
    }
    if (!this.viewer.isDestroyed()) {
      this.viewer.scene.requestRender();
    }
  }

  public markDirty(): void {
    this.forceRefresh = true;
  }

  /**
   * Hit-tests currently visible labels. Used by the Locations panel for hover and click.
   * Screen coordinates match Cesium's canvas-relative pointer events.
   */
  public pickAt(screenX: number, screenY: number): NomenclatureLabelHit | null {
    if (this.destroyed || !this.visible || this.entries.length === 0) {
      return null;
    }

    let best: { entry: LabelEntry; dist2: number } | null = null;
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      if (!entry.label.show) continue;

      const projected = this.projectLabelToScreen(entry, this.scratchPickWindow);
      if (!projected) continue;

      const scale = entry.label.scale || 1;
      const halfW = entry.halfWidthPx * scale + 8;
      const halfH = entry.halfHeightPx * scale + 8;
      const dx = screenX - projected.x;
      const dy = screenY - projected.y;
      if (Math.abs(dx) > halfW || Math.abs(dy) > halfH) continue;

      const dist2 = dx * dx + dy * dy;
      if (!best || dist2 < best.dist2) {
        best = { entry, dist2 };
      }
    }

    return best ? this.toHit(best.entry) : null;
  }

  /**
   * Scales a label and mixes its fill from white toward blue.
   * `blueMix` is 0 (rest) to 1 (full blue). The Locations hover animator drives this.
   */
  public setLabelVisual(fid: number, scale: number, blueMix: number): void {
    const entry = this.entriesByFid.get(fid);
    if (!entry || this.destroyed) return;

    const mix = Cesium.Math.clamp(blueMix, 0, 1);
    Cesium.Color.lerp(this.restFill, this.activeFill, mix, this.scratchFill);
    entry.label.scale = scale;
    entry.label.fillColor = this.scratchFill;
    if (!this.viewer.isDestroyed()) {
      this.viewer.scene.requestRender();
    }
  }

  private populateLabels(geojson: NomenclatureGeoJSON): void {
    const fillWhite = Cesium.Color.WHITE;
    const outlineDark = Cesium.Color.fromAlpha(Cesium.Color.BLACK, 0.85);

    this.entriesByFid.clear();
    this.entries = geojson.features.map((feature) => {
      const [lon, lat] = feature.geometry.coordinates;
      const { fid, name, type, code, diameter, level } = feature.properties;
      const clampedLevel = Math.max(1, Math.min(7, level || 7));

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
        position: position3D,
        text: name,
        id: fid,
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

      const entry: LabelEntry = {
        fid,
        label,
        position3D,
        occludeePoint,
        longitude: lon,
        latitude: lat,
        name,
        type: type || '',
        code: code || '',
        diameterKm: typeof diameter === 'number' ? diameter : 0,
        level: clampedLevel,
        halfWidthPx,
        halfHeightPx,
      };
      this.entriesByFid.set(fid, entry);
      return entry;
    });
  }

  private toHit(entry: LabelEntry): NomenclatureLabelHit {
    return {
      fid: entry.fid,
      name: entry.name,
      type: entry.type,
      code: entry.code,
      diameterKm: entry.diameterKm,
      level: entry.level,
      longitude: entry.longitude,
      latitude: entry.latitude,
    };
  }

  /**
   * Projects a label into canvas pixels, wrapping X across the 2D antimeridian
   * the same way visibility decluttering does.
   */
  private projectLabelToScreen(
    entry: LabelEntry,
    scratch: Cesium.Cartesian2
  ): { x: number; y: number } | null {
    const { scene } = this.viewer;
    const winPos = Cesium.SceneTransforms.worldToWindowCoordinates(
      scene,
      entry.position3D,
      scratch
    );
    if (!winPos || !Number.isFinite(winPos.x) || !Number.isFinite(winPos.y)) {
      return null;
    }

    let screenX = winPos.x;
    const is3D = scene.mode === Cesium.SceneMode.SCENE3D;
    if (!is3D) {
      const circumferenceWidthPx = this.getCircumferenceWidthPx();
      const canvasWidth = scene.canvas.clientWidth;
      if (circumferenceWidthPx > 0) {
        while (screenX < -entry.halfWidthPx) {
          screenX += circumferenceWidthPx;
        }
        while (screenX > canvasWidth + entry.halfWidthPx) {
          screenX -= circumferenceWidthPx;
        }
      }
    }

    return { x: screenX, y: winPos.y };
  }

  private getCircumferenceWidthPx(): number {
    const { scene, camera } = this.viewer;
    if (
      scene.mode === Cesium.SceneMode.SCENE3D ||
      !(camera.frustum instanceof Cesium.OrthographicOffCenterFrustum) ||
      typeof camera.frustum.right !== 'number' ||
      typeof camera.frustum.left !== 'number'
    ) {
      return 0;
    }
    const frustumWidthMeters = Math.abs(camera.frustum.right - camera.frustum.left);
    if (frustumWidthMeters <= 0) return 0;
    return (MARS_CIRCUMFERENCE_METERS / frustumWidthMeters) * scene.canvas.clientWidth;
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

      const projected = this.projectLabelToScreen(entry, this.scratchWindowPos);
      if (!projected) {
        entry.label.show = false;
        continue;
      }

      const screenX = projected.x;
      const screenY = projected.y;

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
        // Also reserve ±360° wrapped positions in 2D INFINITE_SCROLL so edge-spanning labels never overlap across the seam
        if (!is3D && circumferenceWidthPx > 0) {
          placedBoxes.push({
            minX: candidate.minX - circumferenceWidthPx,
            maxX: candidate.maxX - circumferenceWidthPx,
            minY: candidate.minY,
            maxY: candidate.maxY,
          });
          placedBoxes.push({
            minX: candidate.minX + circumferenceWidthPx,
            maxX: candidate.maxX + circumferenceWidthPx,
            minY: candidate.minY,
            maxY: candidate.maxY,
          });
        }
        entry.label.show = true;
      }
    }
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
    this.entriesByFid.clear();
  }
}
