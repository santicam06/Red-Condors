# AGENTS_mapping.md — Core Feature 1: 3D Globe & 2D Map Views of Mars (Mars Trek Fidelity)

> **Role of This Document:**
> Architectural and implementation plan for **Core Product Feature 1** of **Red Condors' Martian Map** (*NASA Space Apps Hackathon — Interplanetary Survival Guide: Martian Map*).
> This baseline mapping template replicates the visual fidelity and core navigation feel of **NASA's Mars Trek (`https://trek.nasa.gov/mars/`)** across interchangeable **3D Globe** and **2D Equirectangular Map** views, while serving as the modular foundation upon which **Core Features 2–6** (Rover "Street View", Outpost Route Rehearsals, Climate Rerouting, Topography-Aware Safe Routing, and Scientific Waypoint Missions) will be layered.

---

## 1. Scope & Strict Boundaries (Phase 1 Baseline)

### In Scope
1. **Interchangeable 3D Globe & 2D Map Views** using a unified Martian coordinate system and preserving camera center/zoom across mode switches.
2. **Mars Trek Visual Fidelity** by streaming NASA Mars Trek's exact default global basemap (`Mars_Viking_MDIM21_ClrMosaic_global_232m`) with true Martian coloration (no Earth blue atmospheric tinting or solar day/night shadows).
3. **Pure Black Space Background (`#000000`)** in both 3D and 2D views — no starfields, sun/moon sprites, skyboxes, or decorative UI chrome yet.
4. **Fluid Navigation Controls** matching Mars Trek:
   - Smooth mouse-drag panning/rotation with inertia in 3D and 2D.
   - Smooth mouse scroll-wheel zoom in/out.
   - Dedicated on-screen **Zoom In (`+`)** and **Zoom Out (`-`)** buttons.
5. **Mars Nomenclature Toggle** replicating Mars Trek's area/feature labels (`Margaritifer Terra`, `Iani Chaos`, `Aureum Chaos`, `Arsinoes Chaos`, etc.) sourced from Mars Trek's Nomenclature service with zoom-level hierarchy filtering (`level` 1–7) and a clean `Nomenclature` pill toggle switch.
6. **Bottom-Right Cursor Coordinate Readout** formatted as `Lat: -16.35182°, Lon: -93.06344°` (5 decimal places), updating live as the cursor moves **on Mars** in either 3D or 2D mode, and displaying a placeholder (`Lat: --, Lon: --`) when the cursor is over the black space background (**excluding** `Terrain Exaggeration`).
7. **Compliance & Citations** (`docs/source_attributions.md` + subtle text credit `"Courtesy NASA/JPL-Caltech/USGS"`, zero NASA/JPL logos, zero proprietary SaaS tokens).

### Explicitly Out of Scope for Now
- 3D elevation/relief mesh (`DEM` terrain exaggeration is deferred; imagery is draped over a smooth Martian ellipsoid/2D plane).
- Deep-zoom CTX/HiRISE auto-layer switching (Phase 1 uses only the Viking MDIM 2.1 global basemap with smooth GPU tile overzooming).
- Extra Mars Trek sidebars, curious-site ranking bars, search drawers, scalebars, or mission overlays (deferred to subsequent feature phases).

---

## 2. Confirmed Tech Stack & Open-Source Dependencies

All packages use permissive **OSI-approved open-source licenses** and require **zero proprietary API keys or SaaS tokens**:

| Layer | Package / Tool | License | Purpose & Rationale |
| :--- | :--- | :--- | :--- |
| **UI Framework** | `react` + `react-dom` (v18/v19) | MIT | Component model for HUD controls and future mission panels. |
| **Language** | `typescript` | Apache-2.0 | Strict typing for planetary coordinates, WMTS configs, and layer registries. |
| **Build Tool** | `vite` + `@vitejs/plugin-react` | MIT | Instant HMR and clean static asset bundling. |
| **Cesium Asset Bundling** | `vite-plugin-static-copy` | MIT | Official, version-resilient way to serve Cesium's `Workers`, `Assets`, `ThirdParty`, and `Widgets` at `/cesium` without brittle legacy plugins. |
| **3D/2D Planetary Engine** | `cesium` (CesiumJS, Ion disabled) | Apache-2.0 | Same 3D engine family used by NASA Mars Trek; natively supports both `SceneMode.SCENE3D` (Globe) and `SceneMode.SCENE2D` (Equirectangular Map) with `GeographicTilingScheme`, custom `Ellipsoid`, WMTS streaming, ray-ellipsoid picking, and GPU label collections in **one unified codebase**. |
| **State Management** | `zustand` | MIT | Lightweight store for view mode (`'3d' \| '2d'`), nomenclature visibility, and future overlay channels without triggering React re-renders on the WebGL canvas. |
| **Styling & Icons** | `tailwindcss` + `@tailwindcss/vite` + `lucide-react` | MIT / ISC | Crisp, minimal HUD styling for zoom buttons, 3D/2D toggle, Nomenclature switch, and coordinate readout. |

> **Zero Cesium Ion Rule:** Immediately set `Cesium.Ion.defaultAccessToken = ''` prior to viewer creation, pass `baseLayer: false`, `geocoder: false`, `baseLayerPicker: false`, `terrainProvider: undefined`, and never invoke `IonResource` or `CesiumWorldTerrain`.

---

## 3. Verified NASA Mars Trek Data Sources & Endpoints

All endpoints below have been verified directly against NASA Mars Trek's live configuration (`https://trek.nasa.gov/mars/jpl/config/`):

### 3.1 Default Global Basemap (WMTS)
- **Mars Trek Layer ID:** `Mars_Viking_MDIM21_ClrMosaic_global_232m`
- **Title:** *Viking VIS, Global Color Mosaic* (USGS Viking Orbiter MDIM 2.1 Colorized Global Mosaic, ~232 m/pixel)
- **Projection / CRS:** Equirectangular `urn:ogc:def:crs:EPSG::104905` (`GCS_Mars_2000`, bounds `[-180°, -90°, 180°, 90°]`)
- **WMTS Capabilities XML:**
  `https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml`
- **RESTful Tile URL Template:**
  ```text
  https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{TileMatrix}/{TileRow}/{TileCol}.jpg
  ```
- **Tile Matrix Geometry (`default028mm`):**
  - `TileWidth`: `256`, `TileHeight`: `256`, `Format`: `image/jpeg`
  - `TileMatrix = 0`: `2 × 1` tiles (`TopLeftCorner: -180.0, 90.0`)
  - `TileMatrix = 1`: `4 × 2` tiles ... doubling up to `TileMatrix = 7` (`256 × 128` tiles)
  - Configure `minimumLevel: 0` and `maximumLevel: 7` on `Cesium.WebMapTileServiceImageryProvider` with `new Cesium.GeographicTilingScheme({ ellipsoid: MARS_ELLIPSOID, numberOfLevelZeroTilesX: 2, numberOfLevelZeroTilesY: 1 })`. Setting `maximumLevel: 7` instructs CesiumJS to smoothly GPU-overzoom level-7 tiles at closer altitudes instead of requesting non-existent level 8+ URLs.

### 3.2 Mars Nomenclature Dataset (IAU / Mars Trek Feature Labels)
- **Mars Trek Static Layer Endpoint:**
  `https://trek.nasa.gov/mars/trekarcgis/rest/services/combinedNom/MapServer/0`
- **Dataset Size & Pagination:** Exactly **1,783 point features** (`maxRecordCount: 1000`, supports `f=json` and `f=geojson`).
- **Key Attributes per Feature:**
  - `clean_name` / `LABEL`: Display string (e.g., `"Margaritifer Terra"`, `"Iani Chaos"`, `"Aureum Chaos"`, `"Arsinoes Chaos"`).
  - `geometry.x` (`[-180, 180]` East-positive longitude) and `geometry.y` (`center_lat` in `[-90, 90]`).
  - `level` (`1` through `7` integer): Mars Trek's curated label priority hierarchy (`1` = major planetary regions such as *Margaritifer Terra*, *Acidalia Planitia*, *Vastitas Borealis*; `2`–`5` = regional chaos/chasma/planum features such as *Iani Chaos* [3], *Aureum Chaos* [4], *Arsinoes Chaos* [5]; `6`–`7` = local craters and smaller features).
  - `diameter` (km) & `type` (e.g., `"Terra, terrae"`, `"Chaos, chaoses"`, `"Crater, craters"`).
- **Caching Strategy (Reliability + Speed):**
  - Provide a one-command fetch script (`apps/web/scripts/fetch-nomenclature.mjs`) that queries `FID < 1000` and `FID >= 1000` from `combinedNom/MapServer/0/query` and saves a normalized GeoJSON bundle to `apps/web/public/data/mars_nomenclature.geojson` (~300 KB).
  - Load from `/data/mars_nomenclature.geojson` at runtime (with optional fallback to the live NASA REST endpoint) so toggling Nomenclature is instantaneous (`0 ms` network delay) and resilient to hackathon Wi-Fi drops.

---

## 4. Planetary & Visual Fidelity Specifications (Critical CesiumJS Configuration)

To make CesiumJS look visually indistinguishable from Mars Trek rather than a re-textured Earth globe, the viewer initialization **must** enforce all of the following:

### 4.1 Martian Reference Ellipsoid
Set Mars as the default ellipsoid **before** instantiating any Cesium `Viewer`, `Globe`, or `Projection`:
```ts
// IAU 2000 Mars ellipsoid (built into Cesium as Ellipsoid.MARS: 3396190m x 3396190m x 3376200m)
export const MARS_ELLIPSOID = Cesium.Ellipsoid.MARS;
Cesium.Ellipsoid.default = MARS_ELLIPSOID;
```
Pass `globe: new Cesium.Globe(MARS_ELLIPSOID)` and `mapProjection: new Cesium.GeographicProjection(MARS_ELLIPSOID)` to `new Cesium.Viewer(...)`.

### 4.2 Pure Black Space & True-Color Surface Rendering
Default CesiumJS enables Earth Rayleigh scattering, directional sunlight shadows, fog, and a star skybox—all of which distort Mars Trek's imagery colors or violate the black-background requirement. Apply these exact scene overrides:

| Setting | Value | Why It Is Required |
| :--- | :--- | :--- |
| `scene.backgroundColor` | `Cesium.Color.BLACK` (`#000000`) | Pure black space around both the 3D globe and 2D map bounds. |
| `skyBox` | `false` | Removes default starfield background per requirements. |
| `skyAtmosphere` | `false` | Removes blue Earth halo around the Martian limb. |
| `sun` / `moon` | `false` / `false` | Removes celestial sprite glare in black space. |
| `globe.showGroundAtmosphere` | `false` | **Critical:** Prevents Earth's blue atmospheric shader from tinting Mars greyish-blue at orbital altitudes; preserves exact Viking MDIM 2.1 ochre/rust hues. |
| `globe.enableLighting` | `false` | Matches Mars Trek's evenly illuminated globe (no dark night-side hemisphere). |
| `scene.fog.enabled` | `false` | Matches Mars Trek (`enableFog: false`). |
| `globe.baseColor` | `Cesium.Color.fromCssColorString('#1c110c')` | Dark Martian soil placeholder while tiles stream (prevents blue ocean flash). |
| `viewer.resolutionScale` | `window.devicePixelRatio` | Ensures razor-sharp imagery and crisp Nomenclature typography on HiDPI screens. |

### 4.3 Built-in Cesium Widgets Suppression
Disable all default Cesium chrome in `Viewer` constructor options:
- `animation: false`, `timeline: false`, `baseLayerPicker: false`, `geocoder: false`, `homeButton: false`, `sceneModePicker: false`, `navigationHelpButton: false`, `fullscreenButton: false`, `infoBox: false`, `selectionIndicator: false`.
- Hide Cesium's default Ion credit logo bar via CSS while rendering our clean NASA Space Apps–compliant attribution text in the HUD.

---

## 5. Feature-by-Feature Engineering Design

### 5.1 Interchangeable 3D Globe & 2D Map Mode Switcher
- **Modes:**
  - `'3d'` → `Cesium.SceneMode.SCENE3D`
  - `'2d'` → `Cesium.SceneMode.SCENE2D` with `mapMode2D: Cesium.MapMode2D.INFINITE_SCROLL` (enables continuous horizontal East–West panning across `±180°` like Mars Trek 2D, while keeping pure `#000000` black space above `+90°` North and below `-90°` South).
- **State-Preserving View Transition:**
  1. Before switching, sample the current screen-center Martian coordinate `(lat, lon)` via `camera.pickEllipsoid(canvasCenter, MARS_ELLIPSOID)` (fallback to `camera.positionCartographic`) and record current camera altitude `height`.
  2. Trigger instant mode switch: `viewer.scene.morphTo2D(0)` or `viewer.scene.morphTo3D(0)` (`duration = 0` avoids intermediate morph stretching).
  3. Restore exact framing via `viewer.camera.setView({ destination: Cesium.Cartesian3.fromDegrees(lon, lat, height, MARS_ELLIPSOID) })`.
  4. Update camera controller constraints per mode:
     - In `3d`: `enableRotate = true`, `enableTilt = true`, `enableZoom = true`.
     - In `2d`: `enableRotate = false` (prevents accidental 2D map twist so North always stays up), `enableTranslate = true`, `enableZoom = true`.

### 5.2 Fluid Mouse Drag, Scroll Zoom, and `+` / `-` Zoom Controls
- **Fluid Camera Inertia (Mars Trek Feel):**
  - Configure `screenSpaceCameraController`:
    - `inertiaSpin = 0.90`, `inertiaTranslate = 0.90`, `inertiaZoom = 0.80`
    - `minimumZoomDistance = 2_500` (2.5 km above smooth ellipsoid — safe from near-plane clipping, ready for localized EVA views later).
    - `maximumZoomDistance = 22_000_000` (~22,000 km — frames full globe/2D map cleanly inside black space).
- **`+` and `-` Buttons:**
  - Positioned in the bottom-right HUD stack (above the coordinate readout).
  - Clicking **`+`** smoothly zooms in by ~`35%` of current altitude/2D frustum scale (clamped to `minimumZoomDistance`).
  - Clicking **`-`** smoothly zooms out by ~`50%` (clamped to `maximumZoomDistance`).
  - Works identically in both `SCENE3D` and `SCENE2D`, alongside native mouse wheel / trackpad pinch zoom.

### 5.3 Mars Nomenclature Layer & Toggle Switch (Image 1 Specification)
- **UI Control:**
  - Clean card/pill in the bottom-right control cluster matching Image 1: label `Nomenclature` paired with an accessible toggle switch (`aria-checked`, blue active pill `#4A90E2` when ON, neutral grey when OFF).
- **Label Styling (Matching Image 1):**
  - Rendered via `Cesium.LabelCollection` with **text only** (no pin icons):
    - `text`: `feature.properties.clean_name || feature.properties.LABEL`
    - `font`: `'500 13px Roboto, Inter, system-ui, sans-serif'` (slightly larger `14px`–`15px` for `level === 1` planetary regions like *Margaritifer Terra*)
    - `style`: `Cesium.LabelStyle.FILL_AND_OUTLINE`
    - `fillColor`: `Cesium.Color.fromCssColorString('#F5F5F5')`
    - `outlineColor`: `Cesium.Color.fromAlpha(Cesium.Color.BLACK, 0.9)`
    - `outlineWidth`: `3`
    - `horizontalOrigin`: `Cesium.HorizontalOrigin.CENTER`, `verticalOrigin`: `Cesium.VerticalOrigin.CENTER`
- **Zoom-Level Priority Filtering (`level` 1–7):**
  - Replicate Mars Trek's progressive disclosure (so at regional zoom, `Margaritifer Terra` [1], `Iani Chaos` [3], `Aureum Chaos` [4], and `Arsinoes Chaos` [5] appear cleanly without hundreds of tiny crater names overlapping):
    - `level 1` (e.g., *Margaritifer Terra*, *Acidalia Planitia*): visible from global orbital view (`<= 22,000 km`) down to regional zoom (`>= 400 km`).
    - `level 2–3` (e.g., *Meridiani Planum*, *Iani Chaos*): visible below `~9,000 km`.
    - `level 4–5` (e.g., *Aureum Chaos*, *Arsinoes Chaos*): visible below `~4,500 km`.
    - `level 6`: visible below `~1,800 km`.
    - `level 7` (small craters < 70 km): visible below `~700 km`.
- **Far-Side Globe Occlusion (Critical 3D Fix):**
  - In `SCENE3D`, apply an `EllipsoidalOccluder` check against camera position so labels on the back hemisphere of Mars never show through the planet.

### 5.4 Bottom-Right Cursor Coordinate Readout (Image 2 Specification)
- **Visual Format:**
  - Located at the bottom-right corner over the black/map canvas in clean light-grey/white legible sans-serif text with subtle text-shadow so it remains readable over both bright Martian plains and black space.
  - **Strictly single-line Lat/Lon only** — **do not** render `Terrain Exaggeration`.
  - **When cursor is ON Mars (3D sphere surface or 2D map bounds):**
    ```text
    Lat: -16.35182°, Lon: -93.06344°
    ```
    (`lat.toFixed(5)` and `lon.toFixed(5)`, East-positive longitude in `[-180.00000°, 180.00000°]`, latitude in `[-90.00000°, 90.00000°]`).
  - **When cursor is OFF Mars (on the black space background or outside viewport):**
    ```text
    Lat: --, Lon: --
    ```
    *(Define `export const OFF_MAP_COORD_PLACEHOLDER = '--';` in `apps/web/src/config/marsConfig.ts` so the team can switch between `--` and `"` in one character if desired.)*
- **Exact Raycast & Bounds Validation Logic (`pickMarsCoordinates`):**
  1. Attach a `Cesium.ScreenSpaceEventHandler` listening to `ScreenSpaceEventType.MOUSE_MOVE` (plus `mouseleave` on the canvas DOM element to reset to placeholder).
  2. Call `const cartesian = viewer.camera.pickEllipsoid(movement.endPosition, MARS_ELLIPSOID)`.
  3. If `!cartesian`, cursor is over black space → return `null` (display placeholder).
  4. Convert `const carto = MARS_ELLIPSOID.cartesianToCartographic(cartesian)`; convert radians to degrees `(latDeg, lonDeg)`.
  5. **2D Polar / Bounds Guard:** In `SCENE2D`, verify `latDeg >= -90 && latDeg <= 90` and verify screen Y/X falls within projected Martian map bounds; if out of bounds, return `null` (display placeholder).
  6. Normalize longitude to `[-180, 180]`: `((((lonDeg + 180) % 360) + 360) % 360) - 180`.
- **60+ FPS Performance Isolation:**
  - Isolate cursor coordinate state inside `<CoordinateReadout />` (subscribed directly to pointer updates via `requestAnimationFrame` throttling) so moving the mouse never re-renders `<MarsViewport />` or other HUD controls.

---

## 6. Modular Architecture (Foundation for Core Features 2–6)

Design the directory layout so Core Features 2–6 mount cleanly onto this template without refactoring Core Feature 1:

```text
Red-Condors/
├── AGENTS.md
├── AGENTS_mapping.md
├── apps/
│   ├── api/                           # Reserved Python modular monolith
│   │   ├── app/
│   │   │   ├── api/                  # Shared HTTP transport
│   │   │   ├── core/                 # Shared configuration/infrastructure
│   │   │   └── modules/              # Points, weather, rover-images domains
│   │   └── tests/
│   └── web/
│       ├── public/
│       │   └── data/
│       │       └── mars_nomenclature.geojson
│       ├── scripts/
│       │   └── fetch-nomenclature.mjs
│       ├── src/
│       │   ├── config/
│       │   ├── core/
│       │   ├── store/
│       │   ├── features/             # Isolated product capabilities
│       │   ├── components/
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   └── index.css
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
├── docs/
│   ├── architecture.md
│   ├── challenge.md
│   └── source_attributions.md        # Updated with Mars Trek WMTS, Nomenclature & OSS citations
└── package.json                       # Root npm workspace commands
```

### How Future Features Plug Into `MarsViewerController`
- **Feature 2 (Martian "Street View"):** Uses `controller.registerOverlayDataSource('rover-panoramas')` for interactive surface photo dots and reuses `pickMarsCoordinates()` for dropping the pegman stickman onto Mars.
- **Feature 3 & 5 (Outposts & Topography-Aware Safe Routing):** Uses `controller.registerOverlayDataSource('outposts-routes')` to render habitats, waypoints (`A → B → C`), and safe EVA/rover polylines across both 3D and 2D automatically.
- **Feature 4 (Climate & Environmental Tracking):** Uses `controller.addImageryOverlay(...)` / polygon hazard layers to drape thermal/dust overlays above the Viking basemap.
- **Feature 6 (Scientific Waypoint Missions):** Hooks into entity click events exposed by `MarsViewerController` and mounts UI cards into `MapHUD` slots.

---

## 7. Phased Implementation Plan

### Phase 1 — Project Scaffolding & Cesium/Vite Build Pipeline
1. Initialize Vite + React + TypeScript project structure in repo root.
2. Install open-source dependencies (`cesium`, `zustand`, `lucide-react`, `tailwindcss`, `@tailwindcss/vite`, `vite-plugin-static-copy`).
3. Configure `vite.config.ts` to copy `Workers`, `ThirdParty`, `Assets`, and `Widgets` from `node_modules/cesium/Build/Cesium` to `/cesium` and define `CESIUM_BASE_URL: JSON.stringify('/cesium')`.
4. Configure global CSS (`html, body, #root { width: 100%; height: 100%; margin: 0; background: #000; overflow: hidden; }`).

### Phase 2 — Mars Trek 3D Globe & 2D Map Core Engine
1. Create `apps/web/src/config/marsConfig.ts` with `MARS_ELLIPSOID` (`Cesium.Ellipsoid.MARS`), WMTS template constants, camera zoom limits, and `OFF_MAP_COORD_PLACEHOLDER`.
2. Implement `createVikingBasemap.ts` using `Cesium.WebMapTileServiceImageryProvider` (`Mars_Viking_MDIM21_ClrMosaic_global_232m`, `default028mm`, `GeographicTilingScheme` `2×1`, `maximumLevel: 7`).
3. Implement `MarsViewerController.ts`:
   - Enforce pure black background, disable skybox/sun/moon/skyAtmosphere/groundAtmosphere/lighting/fog.
   - Configure fluid inertia camera controls and mode-specific rotation locks (`enableRotate = false` in 2D).
   - Implement state-preserving `setViewMode('3d' | '2d')` and smooth `zoomIn()` / `zoomOut()` methods.

### Phase 3 — Mars Nomenclature Data & Dynamic Labels
1. Create and run `apps/web/scripts/fetch-nomenclature.mjs` to download all 1,783 Mars Trek nomenclature records from `combinedNom/MapServer/0` into `apps/web/public/data/mars_nomenclature.geojson`.
2. Implement `NomenclatureManager.ts`:
   - Render centered white-with-dark-halo sans-serif labels matching Image 1.
   - Filter visibility dynamically by feature `level` (`1`–`7`) based on current 3D/2D camera altitude so regional views match Image 1 (`Margaritifer Terra`, `Iani Chaos`, `Aureum Chaos`, `Arsinoes Chaos`).
   - Implement 3D horizon/back-of-globe occlusion (`EllipsoidalOccluder`) so far-side labels never bleed through Mars.

### Phase 4 — Minimal Mars Trek HUD Controls & Cursor Coordinates
1. Implement `pickMarsCoordinates.ts` handling both `SCENE3D` sphere raycasting and `SCENE2D` equirectangular bounds validation + `[-180, 180]` longitude wrapping.
2. Build `<MapHUD />` containing **only** the Phase 1 controls:
   - `<ViewModeToggle />` (3D Globe ↔ 2D Map).
   - `<ZoomControls />` (`+` and `-` buttons).
   - `<NomenclatureToggle />` (`Nomenclature` switch per Image 1).
   - `<CoordinateReadout />` (`Lat: -16.35182°, Lon: -93.06344°` on-planet; `Lat: --, Lon: --` on black space; no terrain exaggeration per Image 2).
   - `<AttributionCredit />` (`Image Credit: Courtesy NASA/JPL-Caltech/USGS | Nomenclature: IAU/USGS`).

### Phase 5 — Citations Audit & Visual/Interactive Verification
1. Populate `docs/source_attributions.md` with full citations for:
   - NASA Mars Trek WMTS API & *Viking VIS Global Color Mosaic (`Mars_Viking_MDIM21_ClrMosaic_global_232m`)* — NASA/JPL-Caltech/USGS.
   - Mars Trek *Combined Nomenclature Feature Service (`combinedNom`)* — IAU Working Group for Planetary System Nomenclature / USGS Astrogeology / NASA JPL.
   - Open-source packages (`CesiumJS` Apache-2.0, `React` MIT, `Vite` MIT, `Zustand` MIT, `Tailwind CSS` MIT, `Lucide` ISC).
2. Verify acceptance criteria against live `https://trek.nasa.gov/mars/`:
   - [x] 3D Globe colors and textures match Mars Trek's default globe (no blue Earth tint, no half-dark shadow, pure `#000000` space).
   - [x] Switching 3D ↔ 2D preserves center `(lat, lon)` and zoom scale seamlessly; 2D map displays against pure `#000000` background without rotation twist.
   - [x] Mouse drag, scroll wheel zoom, and `+` / `-` buttons respond fluidly in both 3D and 2D.
   - [x] Navigating to `Lat: -4°, Lon: -22°` with `Nomenclature` toggled ON displays `Margaritifer Terra`, `Iani Chaos`, `Aureum Chaos`, and `Arsinoes Chaos` matching Image 1, and back-side labels are hidden in 3D.
   - [x] Moving cursor over Mars updates `Lat: XX.XXXXX°, Lon: YY.YYYYY°` at 60 FPS; moving cursor onto black space displays `Lat: --, Lon: --` (with no `Terrain Exaggeration` line).
   - [x] Zero NASA/JPL logos used anywhere; zero console or 404 tile errors at deep zoom (`> level 7`).
