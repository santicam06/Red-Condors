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
  fid: number;
  label: Cesium.Label;
  feature: PickedMapFeature;
  position3D: Cesium.Cartesian3;
  occludeePoint: Cesium.Cartesian3;
  projectedX: number;
  projectedY: number;
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

interface HitBoxEntry {
  box: ScreenBox;
  entry: LabelEntry;
}

interface InternalRenderStateApi {
  fromCache: (renderState: {
    depthTest: { enabled: boolean };
    depthMask: boolean;
    blending: typeof Cesium.BlendingState.ALPHA_BLEND;
  }) => unknown;
}

interface InternalDrawCommand {
  renderState: unknown;
  boundingVolume?: Cesium.BoundingSphere;
}

interface InternalFrameState {
  commandList: InternalDrawCommand[];
}

interface NomenclatureOverlayPrimitive {
  update: (frameState: InternalFrameState) => void;
  isDestroyed: () => boolean;
  destroy: () => void;
}

/**
 * Forces nomenclature draw commands to sort after all other translucent map
 * primitives (such as camp marker outlines) in Cesium's back-to-front pass.
 */
const NOMENCLATURE_TOP_SORT_DISTANCE = (): number => -1;

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
  private readonly overlayPrimitive: NomenclatureOverlayPrimitive;
  private overlayRenderState: unknown = null;
  private readonly occluderEllipsoid: Cesium.Ellipsoid;
  private readonly occluder: Cesium.EllipsoidalOccluder;
  private readonly scratchWindowPos = new Cesium.Cartesian2();

  private entries: LabelEntry[] = [];
  private readonly entriesByFid = new Map<number, LabelEntry>();
  private readonly restFill = Cesium.Color.WHITE.clone();
  private readonly activeFill = Cesium.Color.fromCssColorString('#B91C1C');
  private readonly scratchFill = new Cesium.Color();
  private visibleHitBoxes: HitBoxEntry[] = [];
  private readonly routeFids = new Set<number>();
  private readonly routeNameScale = 1.18;
  private visible: boolean;
  private destroyed = false;
  private removePreRenderListener: (() => void) | null = null;

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

    // Passing `scene` is required so Cesium projects labels in SCENE2D + INFINITE_SCROLL.
    // Wrap `LabelCollection` in a thin scene primitive that disables GPU depth-testing
    // (horizon culling and decluttering are already computed via `EllipsoidalOccluder`
    // and `placedBoxes`) and sorts last in the translucent pass so planetary
    // nomenclature (e.g., "Olympus Rupes") always renders on top of camp dots.
    this.labelCollection = new Cesium.LabelCollection({
      scene: viewer.scene,
      blendOption: Cesium.BlendOption.TRANSLUCENT,
      show: initialVisible,
    });

    const renderStateApi = (
      Cesium as unknown as { RenderState: InternalRenderStateApi }
    ).RenderState;

    const primitive: NomenclatureOverlayPrimitive = {
      update: (frameState: InternalFrameState) => {
        if (!this.overlayRenderState) {
          this.overlayRenderState = renderStateApi.fromCache({
            depthTest: { enabled: false },
            depthMask: false,
            blending: Cesium.BlendingState.ALPHA_BLEND,
          });
        }

        const startIndex = frameState.commandList.length;
        (
          this.labelCollection as unknown as {
            update: (fs: InternalFrameState) => void;
          }
        ).update(frameState);

        for (let i = startIndex; i < frameState.commandList.length; i++) {
          const command = frameState.commandList[i];
          command.renderState = this.overlayRenderState;
          if (
            command.boundingVolume &&
            command.boundingVolume.distanceSquaredTo !== NOMENCLATURE_TOP_SORT_DISTANCE
          ) {
            command.boundingVolume.distanceSquaredTo = NOMENCLATURE_TOP_SORT_DISTANCE;
          }
        }
      },
      isDestroyed: () => this.destroyed,
      destroy: () => {
        if (!this.labelCollection.isDestroyed()) {
          this.labelCollection.destroy();
        }
      },
    };

    this.overlayPrimitive = viewer.scene.primitives.add(
      primitive
    ) as NomenclatureOverlayPrimitive;

    this.removePreRenderListener = viewer.scene.preRender.addEventListener(() => {
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
    this.labelCollection.show = visible || this.routeFids.size > 0;
    this.forceRefresh = true;
    this.updateLabelVisibilityIfNeeded();
    if (!this.viewer.isDestroyed()) {
      this.viewer.scene.requestRender();
    }
  }

  public markDirty(): void {
    this.forceRefresh = true;
  }

  /**
   * Hit-tests currently visible labels in O(K_visible) using cached screen boxes.
   * Screen coordinates match Cesium's canvas-relative pointer events.
   */
  public pickAt(screenX: number, screenY: number): NomenclatureLabelHit | null {
    if (this.destroyed || this.visibleHitBoxes.length === 0) {
      return null;
    }
    if (!this.visible && this.routeFids.size === 0) {
      return null;
    }

    let best: { entry: LabelEntry; dist2: number } | null = null;
    for (let i = 0; i < this.visibleHitBoxes.length; i++) {
      const { box, entry } = this.visibleHitBoxes[i];
      if (!entry.label.show) continue;

      const centerX = (box.minX + box.maxX) * 0.5;
      const centerY = (box.minY + box.maxY) * 0.5;
      const scale = entry.label.scale || 1;
      const halfW = Math.max(8, entry.halfWidthPx - 5) * scale;
      const halfH = (entry.level <= 2 ? 10 : 9) * scale;
      const dx = screenX - centerX;
      const dy = screenY - centerY;
      if (Math.abs(dx) > halfW || Math.abs(dy) > halfH) continue;

      const dist2 = dx * dx + dy * dy;
      if (!best || dist2 < best.dist2) {
        best = { entry, dist2 };
      }
    }

    return best ? this.toHit(best.entry) : null;
  }

  /**
   * Keeps named route labels visible and slightly enlarged without adding brackets.
   */
  public setRouteNames(fids: number[]): void {
    const next = new Set(fids.filter((fid) => Number.isFinite(fid)));
    for (const fid of this.routeFids) {
      if (!next.has(fid)) this.applyRouteName(fid, false);
    }
    this.routeFids.clear();
    for (const fid of next) {
      this.routeFids.add(fid);
      this.applyRouteName(fid, true);
    }
    this.labelCollection.show = this.visible || this.routeFids.size > 0;
    this.forceRefresh = true;
    this.updateLabelVisibilityIfNeeded();
    if (!this.viewer.isDestroyed()) {
      this.viewer.scene.requestRender();
    }
  }

  private applyRouteName(fid: number, marked: boolean): void {
    const entry = this.entriesByFid.get(fid);
    if (!entry) return;
    entry.label.text = entry.name;
    const current = entry.label.scale || 1;
    entry.label.scale = marked ? Math.max(current, this.routeNameScale) : 1;
  }

  /**
   * Scales a label and mixes its fill from white toward red.
   * `blueMix` is 0 (rest) to 1 (full red). The Locations hover animator drives this.
   */
  public setLabelVisual(fid: number, scale: number, blueMix: number): void {
    const entry = this.entriesByFid.get(fid);
    if (!entry || this.destroyed) return;

    const mix = Cesium.Math.clamp(blueMix, 0, 1);
    Cesium.Color.lerp(this.restFill, this.activeFill, mix, this.scratchFill);
    const floor = this.routeFids.has(fid) ? this.routeNameScale : 1;
    entry.label.scale = Math.max(scale, floor);
    entry.label.fillColor = this.scratchFill;
    if (!this.viewer.isDestroyed()) {
      this.viewer.scene.requestRender();
    }
  }

  /**
   * Hit-tests currently visible nomenclature labels at `(x, y)` CSS canvas pixels
   * across both 3D Globe and 2D Infinite-Scroll Map modes.
   */
  public pickAtWindowPosition(x: number, y: number): PickedMapFeature | null {
    if (this.destroyed || this.visibleHitBoxes.length === 0) {
      return null;
    }
    if (!this.visible && this.routeFids.size === 0) {
      return null;
    }

    for (let i = 0; i < this.visibleHitBoxes.length; i++) {
      const { box, entry } = this.visibleHitBoxes[i];
      if (
        x >= box.minX + 4 &&
        x <= box.maxX - 4 &&
        y >= box.minY + 3 &&
        y <= box.maxY - 3
      ) {
        return entry.feature;
      }
    }
    return null;
  }

  private populateLabels(geojson: NomenclatureGeoJSON): void {
    const fillWhite = Cesium.Color.WHITE;
    const outlineDark = Cesium.Color.BLACK;

    this.entriesByFid.clear();
    this.entries = geojson.features.map((featureItem) => {
      const [lon, lat] = featureItem.geometry.coordinates;
      const { fid, name, type, code, diameter, level } = featureItem.properties;
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
      const projectedX = Cesium.Math.toRadians(lon) * MARS_ELLIPSOID.maximumRadius;
      const projectedY = Cesium.Math.toRadians(lat) * MARS_ELLIPSOID.maximumRadius;

      const isMajorRegion = clampedLevel <= 2;
      const font = isMajorRegion
        ? '600 18px Roboto, system-ui, -apple-system, sans-serif'
        : '600 16px Roboto, system-ui, -apple-system, sans-serif';

      const approxCharWidth = isMajorRegion ? 9.4 : 8.4;
      const halfWidthPx = Math.ceil((name.length * approxCharWidth) / 2) + 8;
      const halfHeightPx = isMajorRegion ? 13 : 12;

      const label = this.labelCollection.add({
        id: feature,
        position: position3D,
        text: name,
        font,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        fillColor: fillWhite,
        outlineColor: outlineDark,
        outlineWidth: 3,
        scale: 1,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        show: false,
      });

      const entry: LabelEntry = {
        fid,
        label,
        feature,
        position3D,
        occludeePoint,
        projectedX,
        projectedY,
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
    for (const fid of this.routeFids) {
      this.applyRouteName(fid, true);
    }
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

  private updateLabelVisibilityIfNeeded(): void {
    if (this.destroyed || this.entries.length === 0) {
      return;
    }
    if (!this.visible && this.routeFids.size === 0) {
      return;
    }

    const { scene, camera } = this.viewer;
    const altitude = this.getEffectiveAltitude();
    const mode = scene.mode;

    const posEpsilonMeters = Math.max(50, altitude * 0.0015);
    const cameraMoved =
      this.forceRefresh ||
      mode !== this.lastMode ||
      Math.abs(altitude - this.lastAltitude) > altitude * 0.004 ||
      !Cesium.Cartesian3.equalsEpsilon(
        camera.positionWC,
        this.lastCameraPos,
        0,
        posEpsilonMeters
      ) ||
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
    if (canvasWidth <= 0 || canvasHeight <= 0) {
      return;
    }

    const placedBoxes: ScreenBox[] = [];
    const nextHitBoxes: HitBoxEntry[] = [];

    // Precompute 2D orthographic transform constants once per frame so projecting
    // all 1,783 labels in 2D avoids `SceneTransforms.worldToWindowCoordinates`
    // (zero frustum clones, zero matrix allocations, zero trig).
    let frustumLeft = 0;
    let frustumTop = 0;
    let invFrustumW = 0;
    let invFrustumH = 0;
    let circumferenceWidthPx = 0;
    const camProjX = camera.positionWC.y;
    const camProjY = camera.positionWC.z;
    const circMeters = MARS_CIRCUMFERENCE_METERS;
    const halfCircMeters = circMeters * 0.5;
    const infiniteScroll2D = scene.mapMode2D === Cesium.MapMode2D.INFINITE_SCROLL;

    if (
      !is3D &&
      camera.frustum instanceof Cesium.OrthographicOffCenterFrustum &&
      typeof camera.frustum.right === 'number' &&
      typeof camera.frustum.left === 'number' &&
      typeof camera.frustum.top === 'number' &&
      typeof camera.frustum.bottom === 'number'
    ) {
      frustumLeft = camera.frustum.left;
      frustumTop = camera.frustum.top;
      const frustumWidthMeters = camera.frustum.right - frustumLeft;
      const frustumHeightMeters = frustumTop - camera.frustum.bottom;
      if (frustumWidthMeters > 0 && frustumHeightMeters > 0) {
        invFrustumW = canvasWidth / frustumWidthMeters;
        invFrustumH = canvasHeight / frustumHeightMeters;
        circumferenceWidthPx = circMeters * invFrustumW;
      }
    }

    // Features are pre-sorted by priority (`level` 1 -> 7, then `diameter` descending)
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const pinned = this.routeFids.has(entry.fid);
      const maxAllowedAlt =
        NOMENCLATURE_LEVEL_MAX_ALTITUDE_METERS[entry.level] ??
        NOMENCLATURE_LEVEL_MAX_ALTITUDE_METERS[7];

      if (!pinned && (!this.visible || altitude > maxAllowedAlt)) {
        if (entry.label.show) entry.label.show = false;
        continue;
      }

      let screenX: number;
      let screenY: number;

      if (is3D) {
        if (!this.occluder.isPointVisible(entry.occludeePoint)) {
          if (entry.label.show) entry.label.show = false;
          continue;
        }

        const winPos = Cesium.SceneTransforms.worldToWindowCoordinates(
          scene,
          entry.position3D,
          this.scratchWindowPos
        );
        if (!winPos || !Number.isFinite(winPos.x) || !Number.isFinite(winPos.y)) {
          if (entry.label.show) entry.label.show = false;
          continue;
        }
        screenX = winPos.x;
        screenY = winPos.y;

        if (
          screenX < -entry.halfWidthPx ||
          screenX > canvasWidth + entry.halfWidthPx ||
          screenY < -entry.halfHeightPx ||
          screenY > canvasHeight + entry.halfHeightPx
        ) {
          if (entry.label.show) entry.label.show = false;
          continue;
        }
      } else {
        if (invFrustumW <= 0 || invFrustumH <= 0) {
          if (entry.label.show) entry.label.show = false;
          continue;
        }

        const dy = entry.projectedY - camProjY;
        screenY = (frustumTop - dy) * invFrustumH;
        if (
          screenY < -entry.halfHeightPx ||
          screenY > canvasHeight + entry.halfHeightPx
        ) {
          if (entry.label.show) entry.label.show = false;
          continue;
        }

        let dx = entry.projectedX - camProjX;
        if (infiniteScroll2D) {
          dx =
            ((((dx + halfCircMeters) % circMeters) + circMeters) % circMeters) -
            halfCircMeters;
        }
        screenX = (dx - frustumLeft) * invFrustumW;
        if (
          screenX < -entry.halfWidthPx ||
          screenX > canvasWidth + entry.halfWidthPx
        ) {
          if (entry.label.show) entry.label.show = false;
          continue;
        }
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

      if (collides && !pinned) {
        if (entry.label.show) entry.label.show = false;
      } else {
        placedBoxes.push(candidate);
        nextHitBoxes.push({ box: candidate, entry });
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
            { box: leftWrap, entry },
            { box: rightWrap, entry }
          );
        }
        if (!entry.label.show) entry.label.show = true;
      }
    }

    this.visibleHitBoxes = nextHitBoxes;
  }

  public raiseToTop(): void {
    if (this.destroyed || this.viewer.isDestroyed()) return;
    if (this.viewer.scene.primitives.contains(this.overlayPrimitive)) {
      this.viewer.scene.primitives.raiseToTop(this.overlayPrimitive);
    }
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.removePreRenderListener) {
      this.removePreRenderListener();
      this.removePreRenderListener = null;
    }
    if (!this.viewer.isDestroyed()) {
      this.viewer.scene.primitives.remove(this.overlayPrimitive);
    }
    this.entries = [];
    this.entriesByFid.clear();
    this.visibleHitBoxes = [];
  }
}
