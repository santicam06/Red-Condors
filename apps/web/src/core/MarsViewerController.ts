import * as Cesium from 'cesium';
import {
  CAMERA_BOUNDS,
  MARS_CIRCUMFERENCE_METERS,
  MARS_ELLIPSOID,
} from '../config/marsConfig';
import type { MarsViewMode } from '../store/useMapStore';
import { createVikingBasemapProvider } from './layers/createVikingBasemap';
import {
  NomenclatureManager,
  type NomenclatureLabelHit,
  type PickedMapFeature,
} from './layers/NomenclatureManager';
import {
  type MarsLatLon,
  normalizeLongitude180,
  pickMarsCoordinates,
} from './pickMarsCoordinates';

export type { PickedMapFeature };
export type CursorCoordinateListener = (coords: MarsLatLon | null) => void;
export type FeatureClickListener = (feature: PickedMapFeature) => void;
export type SurfaceClickListener = (coords: MarsLatLon) => void;

const CLICK_MAX_DRAG_DISTANCE_PX = 6;

const TAN_HALF_DEFAULT_FOV = Math.tan(Cesium.Math.toRadians(30)); // 60° reference horizontal FOV

/**
 * Unified imperative planetary map controller wrapping CesiumJS for both
 * 3D Globe (`SCENE3D`) and 2D Equirectangular Map (`SCENE2D`) views of Mars.
 *
 * Designed as the modular base template upon which Core Features 2–6
 * (Rover Street View dots, Outposts & EVA/Rover routes, Climate overlays,
 * Topography-aware routing, and Scientific Waypoint missions) mount cleanly.
 */
export class MarsViewerController {
  public readonly viewer: Cesium.Viewer;
  private readonly nomenclatureManager: NomenclatureManager;
  private readonly eventHandler: Cesium.ScreenSpaceEventHandler;
  private readonly overlayDataSources = new Map<string, Cesium.CustomDataSource>();
  private readonly cursorListeners = new Set<CursorCoordinateListener>();
  private readonly featureClickListeners = new Set<FeatureClickListener>();
  private readonly surfaceClickListeners = new Set<SurfaceClickListener>();

  private zoomAnimationFrame: number | null = null;
  private cursorRafPending = false;
  private latestMousePosition = new Cesium.Cartesian2(-1, -1);
  private leftDownPosition: Cesium.Cartesian2 | null = null;
  private mouseInsideCanvas = false;
  private handleMouseLeaveBound: () => void;
  private removePostUpdateListener: (() => void) | null = null;

  constructor(
    container: HTMLElement,
    options?: {
      initialMode?: MarsViewMode;
      initialNomenclatureVisible?: boolean;
    }
  ) {
    const initialMode = options?.initialMode ?? '3d';
    const initialNomenclatureVisible = options?.initialNomenclatureVisible ?? true;

    const marsGlobe = new Cesium.Globe(MARS_ELLIPSOID);
    const marsProjection = new Cesium.GeographicProjection(MARS_ELLIPSOID);

    this.viewer = new Cesium.Viewer(container, {
      globe: marsGlobe,
      mapProjection: marsProjection,
      sceneMode:
        initialMode === '2d' ? Cesium.SceneMode.SCENE2D : Cesium.SceneMode.SCENE3D,
      mapMode2D: Cesium.MapMode2D.INFINITE_SCROLL,
      orderIndependentTranslucency: false,
      baseLayer: false,
      skyBox: Cesium.SkyBox.createEarthSkyBox(),
      skyAtmosphere: false,
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      shouldAnimate: false,
      useBrowserRecommendedResolution: false,
      msaaSamples: 4,
      contextOptions: {
        webgl: {
          alpha: true,
          antialias: true,
        },
      },
    });

    this.configureVisualFidelity(initialMode);
    this.configureCameraController(initialMode);

    // Add verified NASA Mars Trek global Viking Color Mosaic WMTS basemap
    const vikingBasemap = createVikingBasemapProvider();
    this.viewer.imageryLayers.addImageryProvider(vikingBasemap);

    // Set initial Mars Trek framing
    this.viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(
        CAMERA_BOUNDS.initialLongitudeDeg,
        CAMERA_BOUNDS.initialLatitudeDeg,
        CAMERA_BOUNDS.initialAltitudeMeters,
        MARS_ELLIPSOID
      ),
    });

    // Initialize Mars Nomenclature layer
    this.nomenclatureManager = new NomenclatureManager(
      this.viewer,
      () => this.getEffectiveAltitudeMeters(),
      initialNomenclatureVisible
    );
    void this.nomenclatureManager.load();

    // High-frequency pointer coordinate tracking (throttled via requestAnimationFrame)
    this.eventHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    this.eventHandler.setInputAction(
      (movement: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        this.mouseInsideCanvas = true;
        Cesium.Cartesian2.clone(movement.endPosition, this.latestMousePosition);
        this.scheduleCursorBroadcast();
      },
      Cesium.ScreenSpaceEventType.MOUSE_MOVE
    );

    // Distinguish stationary feature clicks from camera drags
    this.eventHandler.setInputAction(
      (click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        this.leftDownPosition = Cesium.Cartesian2.clone(click.position);
      },
      Cesium.ScreenSpaceEventType.LEFT_DOWN
    );

    this.eventHandler.setInputAction(
      (click: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
        const downPos = this.leftDownPosition;
        this.leftDownPosition = null;
        if (!downPos) return;
        if (this.featureClickListeners.size === 0 && this.surfaceClickListeners.size === 0) return;

        const dragDist = Cesium.Cartesian2.distance(downPos, click.position);
        if (dragDist > CLICK_MAX_DRAG_DISTANCE_PX) return;

        const picked = this.pickFeatureAt(click.position.x, click.position.y);
        if (picked) {
          for (const listener of this.featureClickListeners) {
            listener(picked);
          }
          return;
        }

        if (this.surfaceClickListeners.size === 0) return;
        const coords = pickMarsCoordinates(this.viewer, click.position);
        if (!coords) return;
        for (const listener of this.surfaceClickListeners) {
          listener(coords);
        }
      },
      Cesium.ScreenSpaceEventType.LEFT_UP
    );

    // Also update cursor readout while zooming/panning if pointer remains stationary
    this.viewer.camera.changed.addEventListener(() => {
      if (this.mouseInsideCanvas) {
        this.scheduleCursorBroadcast();
      }
    });
    this.viewer.camera.percentageChanged = 0.01;

    this.handleMouseLeaveBound = () => {
      this.mouseInsideCanvas = false;
      this.viewer.scene.canvas.style.cursor = '';
      this.broadcastCursorCoordinates(null);
    };
    this.viewer.scene.canvas.addEventListener('mouseleave', this.handleMouseLeaveBound);

    this.removePostUpdateListener = this.viewer.scene.postUpdate.addEventListener(() => {
      this.clamp2DVerticalPan();
    });
  }

  /**
   * Applies Mars Trek visual fidelity overrides:
   * - Tycho-2 deep-space starfield skybox in 3D (matching `trek.nasa.gov/mars/`)
   * - Transparent space background in 2D so the starfield backdrop shows outside ±90°
   * - True Viking MDIM 2.1 coloration (no Earth blue atmosphere, no day/night shadows, no sun/moon glare)
   */
  private configureVisualFidelity(initialMode: MarsViewMode): void {
    const { scene } = this.viewer;
    const globe = scene.globe;

    const pixelRatio = window.devicePixelRatio || 1;
    this.viewer.resolutionScale = Math.min(2, Math.max(pixelRatio, 1.5));

    // In 3D, opaque black clears behind the Tycho-2 SkyBox; in 2D, transparent clears reveal the starfield backdrop
    scene.backgroundColor =
      initialMode === '2d' ? Cesium.Color.TRANSPARENT : Cesium.Color.BLACK;
    if (scene.skyBox) scene.skyBox.show = true;
    if (scene.skyAtmosphere) scene.skyAtmosphere.show = false;
    if (scene.sun) scene.sun.show = false;
    if (scene.moon) scene.moon.show = false;
    scene.fog.enabled = false;
    scene.highDynamicRange = false;

    // Critical: disable Earth Rayleigh ground atmosphere & day/night terminator
    // so colors match NASA Mars Trek (`trek.nasa.gov/mars/`) 1:1
    globe.showGroundAtmosphere = false;
    globe.enableLighting = false;
    globe.baseColor = Cesium.Color.fromCssColorString('#1c110c');
    globe.depthTestAgainstTerrain = false;
    globe.maximumScreenSpaceError = 0.5;

    // Disable FXAA post-processing blur; rely on hardware MSAA (msaaSamples: 4) for crisp edges and imagery
    scene.postProcessStages.fxaa.enabled = false;
  }

  /**
   * Configures fluid Mars Trek–like drag inertia, scroll zoom, and mode-specific rotation locks.
   */
  private configureCameraController(mode: MarsViewMode): void {
    const ctrl = this.viewer.scene.screenSpaceCameraController;
    ctrl.minimumZoomDistance = CAMERA_BOUNDS.minZoomDistanceMeters;
    // In 2D mode, cap frustum width to Mars's exact 360° circumference (~21,339 km)
    // so full zoom-out shows one complete -180°..+180° map framed by black space above/below poles
    ctrl.maximumZoomDistance =
      mode === '2d'
        ? MARS_CIRCUMFERENCE_METERS
        : CAMERA_BOUNDS.maxZoomDistanceMeters;

    ctrl.inertiaSpin = 0.9;
    ctrl.inertiaTranslate = 0.9;
    ctrl.inertiaZoom = 0.8;
    ctrl.zoomFactor = 3.0;

    ctrl.enableInputs = true;
    ctrl.enableZoom = true;
    ctrl.enableTranslate = true;
    // In 2D mode, disable rotation so mouse drag strictly pans without twisting North off-vertical
    ctrl.enableRotate = mode === '3d';
    ctrl.enableTilt = mode === '3d';
    ctrl.enableLook = false;
  }

  /**
   * Computes unified effective camera altitude (meters) across both 3D perspective
   * and 2D orthographic frustums.
   */
  public getEffectiveAltitudeMeters(): number {
    const { scene, camera } = this.viewer;
    if (scene.mode === Cesium.SceneMode.SCENE2D) {
      const frustum = camera.frustum;
      if (
        frustum instanceof Cesium.OrthographicOffCenterFrustum &&
        typeof frustum.right === 'number' &&
        typeof frustum.left === 'number'
      ) {
        const widthMeters = Math.abs(frustum.right - frustum.left);
        return Cesium.Math.clamp(
          widthMeters / (2 * TAN_HALF_DEFAULT_FOV),
          CAMERA_BOUNDS.minZoomDistanceMeters,
          CAMERA_BOUNDS.maxZoomDistanceMeters
        );
      }
      return Cesium.Math.clamp(
        camera.getMagnitude() / (2 * TAN_HALF_DEFAULT_FOV),
        CAMERA_BOUNDS.minZoomDistanceMeters,
        CAMERA_BOUNDS.maxZoomDistanceMeters
      );
    }

    return Cesium.Math.clamp(
      camera.positionCartographic.height,
      CAMERA_BOUNDS.minZoomDistanceMeters,
      CAMERA_BOUNDS.maxZoomDistanceMeters
    );
  }

  /**
   * Samples the current viewport center's Martian `(lat, lon)` so switching
   * between 3D Globe and 2D Map keeps the user anchored on the exact same area.
   */
  public getViewportCenterLatLon(): MarsLatLon {
    const canvas = this.viewer.scene.canvas;
    const centerPx = new Cesium.Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    const picked = pickMarsCoordinates(this.viewer, centerPx);
    if (picked) {
      return picked;
    }

    const carto = this.viewer.camera.positionCartographic;
    return {
      lat: Cesium.Math.clamp(Cesium.Math.toDegrees(carto.latitude), -85, 85),
      lon: normalizeLongitude180(Cesium.Math.toDegrees(carto.longitude)),
    };
  }

  /**
   * Switches seamlessly between 3D Globe (`SCENE3D`) and 2D Map (`SCENE2D`),
   * preserving exact viewport center `(lat, lon)` and effective zoom scale.
   */
  public setViewMode(targetMode: MarsViewMode): void {
    if (this.viewer.isDestroyed()) return;
    this.cancelActiveZoomAnimation();

    const currentSceneMode = this.viewer.scene.mode;
    const desiredSceneMode =
      targetMode === '2d' ? Cesium.SceneMode.SCENE2D : Cesium.SceneMode.SCENE3D;

    if (currentSceneMode === desiredSceneMode) {
      return;
    }

    const center = this.getViewportCenterLatLon();
    const effectiveAltitude = this.getEffectiveAltitudeMeters();

    if (targetMode === '2d') {
      this.viewer.scene.backgroundColor = Cesium.Color.TRANSPARENT;
      this.viewer.scene.morphTo2D(0);
    } else {
      this.viewer.scene.backgroundColor = Cesium.Color.BLACK;
      this.viewer.scene.morphTo3D(0);
    }

    this.configureCameraController(targetMode);

    this.viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(
        center.lon,
        center.lat,
        effectiveAltitude,
        MARS_ELLIPSOID
      ),
    });
    this.clamp2DVerticalPan();

    this.nomenclatureManager.markDirty();
    if (this.mouseInsideCanvas) {
      this.scheduleCursorBroadcast();
    }
    this.viewer.scene.requestRender();
  }

  /**
   * Smoothly zooms in (+) in either 3D or 2D mode.
   */
  public zoomIn(): void {
    const currentAlt = this.getEffectiveAltitudeMeters();
    const availableDelta = currentAlt - CAMERA_BOUNDS.minZoomDistanceMeters;
    if (availableDelta <= 1) return;

    const totalZoomMeters = Math.min(currentAlt * 0.36, availableDelta);
    this.animateZoomStep(totalZoomMeters, 'in');
  }

  /**
   * Smoothly zooms out (-) in either 3D or 2D mode.
   */
  public zoomOut(): void {
    const is2D = this.viewer.scene.mode === Cesium.SceneMode.SCENE2D;
    const maxEffectiveAlt = is2D
      ? MARS_CIRCUMFERENCE_METERS / (2 * TAN_HALF_DEFAULT_FOV)
      : CAMERA_BOUNDS.maxZoomDistanceMeters;

    const currentAlt = this.getEffectiveAltitudeMeters();
    const availableDelta = maxEffectiveAlt - currentAlt;
    if (availableDelta <= 1) return;

    const totalZoomMeters = Math.min(currentAlt * 0.5, availableDelta);
    this.animateZoomStep(totalZoomMeters, 'out');
  }

  private animateZoomStep(totalMeters: number, direction: 'in' | 'out'): void {
    this.cancelActiveZoomAnimation();

    const durationMs = 200;
    const startTime = performance.now();
    let appliedSoFar = 0;

    // In 2D mode, Cesium's camera.zoomIn/zoomOut expects orthographic frustum units
    const scaleMultiplier =
      this.viewer.scene.mode === Cesium.SceneMode.SCENE2D
        ? 2 * TAN_HALF_DEFAULT_FOV
        : 1;
    const scaledTotal = totalMeters * scaleMultiplier;

    const step = (now: number) => {
      if (this.viewer.isDestroyed()) return;

      const t = Math.min(1, (now - startTime) / durationMs);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - t, 3);
      const targetApplied = scaledTotal * eased;
      const frameDelta = targetApplied - appliedSoFar;
      appliedSoFar = targetApplied;

      if (frameDelta > 0) {
        if (direction === 'in') {
          this.viewer.camera.zoomIn(frameDelta);
        } else {
          this.viewer.camera.zoomOut(frameDelta);
        }
      }

      if (t < 1) {
        this.zoomAnimationFrame = requestAnimationFrame(step);
      } else {
        this.zoomAnimationFrame = null;
      }
    };

    this.zoomAnimationFrame = requestAnimationFrame(step);
  }

  private cancelActiveZoomAnimation(): void {
    if (this.zoomAnimationFrame !== null) {
      cancelAnimationFrame(this.zoomAnimationFrame);
      this.zoomAnimationFrame = null;
    }
  }

  /**
   * Flies the camera to a point on the Martian ellipsoid. Altitude is meters
   * above the surface in both the 3D globe and the 2D map.
   */
  public flyToLatLon(lonDeg: number, latDeg: number, altitudeMeters: number): void {
    if (this.viewer.isDestroyed()) return;
    this.cancelActiveZoomAnimation();

    const altitude = Cesium.Math.clamp(
      altitudeMeters,
      CAMERA_BOUNDS.minZoomDistanceMeters,
      CAMERA_BOUNDS.maxZoomDistanceMeters
    );

    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lonDeg, latDeg, altitude, MARS_ELLIPSOID),
      duration: 1.4,
    });
  }

  /**
   * In 2D mode, locks vertical panning when the entire Martian map (-90°..+90°)
   * fits inside the viewport (allowing only horizontal dragging), and when zoomed
   * in, constrains vertical panning so the poles never scroll off into blank space.
   */
  private clamp2DVerticalPan(): void {
    if (this.viewer.isDestroyed()) return;
    const { scene, camera } = this.viewer;
    if (scene.mode !== Cesium.SceneMode.SCENE2D) return;

    const frustum = camera.frustum;
    if (
      !(frustum instanceof Cesium.OrthographicOffCenterFrustum) ||
      typeof frustum.top !== 'number'
    ) {
      return;
    }

    const halfMapHeight = Math.PI * 0.5 * MARS_ELLIPSOID.maximumRadius;
    const halfViewportHeight = Math.abs(frustum.top);
    const allowedMaxY = Math.max(0, halfMapHeight - halfViewportHeight);

    const clampedY = Cesium.Math.clamp(camera.position.y, -allowedMaxY, allowedMaxY);
    if (Math.abs(camera.position.y - clampedY) > 1e-6) {
      camera.position.y = clampedY;
    }
  }

  /**
   * Toggles the Mars Nomenclature label layer ON or OFF.
   */
  public setNomenclatureVisible(visible: boolean): void {
    this.nomenclatureManager.setVisible(visible);
  }

  /** Hit-tests a visible nomenclature label at a canvas-relative pixel. */
  public pickNomenclature(screenX: number, screenY: number): NomenclatureLabelHit | null {
    return this.nomenclatureManager.pickAt(screenX, screenY);
  }

  /** Drives the hover/selection enlarge-and-red treatment on one label. */
  public setNomenclatureLabelVisual(fid: number, scale: number, blueMix: number): void {
    this.nomenclatureManager.setLabelVisual(fid, scale, blueMix);
  }

  /** Enlarges named route labels slightly when pinned. */
  public setNamedRouteLabels(fids: number[]): void {
    this.nomenclatureManager.setRouteNames(fids);
  }

  /**
   * Subscribes to live cursor `(lat, lon)` updates (or `null` when over black space).
   * Returns an unsubscribe cleanup function.
   */
  public onCursorCoordinatesChange(listener: CursorCoordinateListener): () => void {
    this.cursorListeners.add(listener);
    return () => {
      this.cursorListeners.delete(listener);
    };
  }

  /**
   * Subscribes to clicks on interactive map features (visible nomenclature labels
   * or custom overlay markers). Returns an unsubscribe cleanup function.
   */
  public onFeatureClick(listener: FeatureClickListener): () => void {
    this.featureClickListeners.add(listener);
    return () => {
      this.featureClickListeners.delete(listener);
    };
  }

  /**
   * Clicks on the Martian surface that miss a named label or marker.
   * Used to drop a start or end pin the way Google Maps drops a pin.
   */
  public onSurfaceClick(listener: SurfaceClickListener): () => void {
    this.surfaceClickListeners.add(listener);
    return () => {
      this.surfaceClickListeners.delete(listener);
    };
  }

  /**
   * Resolves any clickable map feature at `(x, y)` CSS canvas pixels, prioritizing
   * camp / outpost overlay entities (drilled through route lines and overlapping
   * labels) before falling back to visible nomenclature labels.
   */
  public pickFeatureAt(x: number, y: number): PickedMapFeature | null {
    return this.inspectPointerTarget(x, y).feature;
  }

  private extractPickedFeature(picked: { id?: unknown } | undefined): PickedMapFeature | null {
    if (!picked?.id || typeof picked.id !== 'object') return null;

    const candidate = picked.id as Record<string, unknown>;
    if (
      typeof candidate.id === 'string' &&
      typeof candidate.name === 'string' &&
      typeof candidate.lat === 'number' &&
      typeof candidate.lon === 'number' &&
      (candidate.kind === 'outpost' || candidate.kind === 'nomenclature')
    ) {
      return candidate as unknown as PickedMapFeature;
    }

    if (picked.id instanceof Cesium.Entity && picked.id.properties) {
      const bag = picked.id.properties.getValue(Cesium.JulianDate.now()) as
        | Record<string, unknown>
        | undefined;
      if (
        bag &&
        typeof bag.id === 'string' &&
        typeof bag.name === 'string' &&
        typeof bag.lat === 'number' &&
        typeof bag.lon === 'number'
      ) {
        return {
          id: bag.id,
          name: bag.name,
          subtitle: typeof bag.subtitle === 'string' ? bag.subtitle : undefined,
          lat: bag.lat,
          lon: bag.lon,
          kind: bag.kind === 'outpost' ? 'outpost' : 'nomenclature',
        };
      }
    }

    return null;
  }

  private inspectPointerTarget(
    x: number,
    y: number
  ): { feature: PickedMapFeature | null; hasInteractiveEntity: boolean } {
    if (this.viewer.isDestroyed()) {
      return { feature: null, hasInteractiveEntity: false };
    }

    const drilled = this.viewer.scene.drillPick(
      new Cesium.Cartesian2(x, y),
      10,
      16,
      16
    ) as Array<{ id?: unknown }>;

    for (const item of drilled) {
      const feature = this.extractPickedFeature(item);
      if (feature?.kind === 'outpost') {
        return {
          feature,
          hasInteractiveEntity: true,
        };
      }
    }

    const nomFeature = this.nomenclatureManager.pickAtWindowPosition(x, y);
    if (nomFeature) {
      return {
        feature: nomFeature,
        hasInteractiveEntity: true,
      };
    }

    for (const item of drilled) {
      const feature = this.extractPickedFeature(item);
      if (feature) {
        return {
          feature,
          hasInteractiveEntity: true,
        };
      }
    }

    return {
      feature: null,
      hasInteractiveEntity: false,
    };
  }

  private scheduleCursorBroadcast(): void {
    if (this.cursorRafPending) return;
    this.cursorRafPending = true;

    requestAnimationFrame(() => {
      this.cursorRafPending = false;
      if (this.viewer.isDestroyed()) return;
      if (!this.mouseInsideCanvas) {
        this.viewer.scene.canvas.style.cursor = '';
        this.broadcastCursorCoordinates(null);
        return;
      }
      const coords = pickMarsCoordinates(this.viewer, this.latestMousePosition);
      this.broadcastCursorCoordinates(coords);

      const { hasInteractiveEntity } = this.inspectPointerTarget(
        this.latestMousePosition.x,
        this.latestMousePosition.y
      );
      this.viewer.scene.canvas.style.cursor = hasInteractiveEntity ? 'pointer' : '';
    });
  }

  private broadcastCursorCoordinates(coords: MarsLatLon | null): void {
    for (const listener of this.cursorListeners) {
      listener(coords);
    }
  }

  /* ============================================================================
   * Extensibility Hooks for Core Features 2–6 (Rover Street View, Outposts,
   * Safe Routes, Climate Hazard Overlays, and Scientific Waypoint Missions)
   * ============================================================================ */

  /**
   * Registers or retrieves a named `CustomDataSource` channel so future features
   * (rover capture dots, habitats, EVA routes, hazard zones) mount cleanly onto
   * both 3D and 2D views without touching Core Feature 1.
   */
  public getOrCreateOverlayChannel(channelId: string): Cesium.CustomDataSource {
    const existing = this.overlayDataSources.get(channelId);
    if (existing) return existing;

    const ds = new Cesium.CustomDataSource(channelId);
    void this.viewer.dataSources.add(ds).then(() => {
      this.nomenclatureManager.raiseToTop();
      if (!this.viewer.isDestroyed()) {
        this.viewer.scene.requestRender();
      }
    });
    this.nomenclatureManager.raiseToTop();
    this.overlayDataSources.set(channelId, ds);
    return ds;
  }

  /**
   * Adds an imagery overlay layer (e.g., thermal/dust/climate data or regional CTX/HiRISE)
   * above the global Viking MDIM 2.1 basemap.
   */
  public addImageryOverlay(
    provider: Cesium.ImageryProvider,
    alpha = 1.0
  ): Cesium.ImageryLayer {
    const layer = this.viewer.imageryLayers.addImageryProvider(provider);
    layer.alpha = alpha;
    return layer;
  }

  /**
   * Converts any screen pixel coordinate to Martian `(lat, lon)` (reusable for
   * Street View pegman drop-targeting and interactive waypoint placement).
   */
  public screenToMarsCoordinates(x: number, y: number): MarsLatLon | null {
    return pickMarsCoordinates(this.viewer, new Cesium.Cartesian2(x, y));
  }

  public destroy(): void {
    this.cancelActiveZoomAnimation();
    this.removePostUpdateListener?.();
    this.removePostUpdateListener = null;
    if (!this.viewer.isDestroyed()) {
      this.viewer.scene.canvas.removeEventListener(
        'mouseleave',
        this.handleMouseLeaveBound
      );
    }
    this.eventHandler.destroy();
    this.nomenclatureManager.destroy();
    this.cursorListeners.clear();
    this.featureClickListeners.clear();
    this.overlayDataSources.clear();
    if (!this.viewer.isDestroyed()) {
      this.viewer.destroy();
    }
  }
}
