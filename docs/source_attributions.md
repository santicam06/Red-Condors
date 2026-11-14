# Source Attributions & Open-Source Citations

Per the **NASA Space Apps Hackathon** rules and **NASA/JPL Media Usage Guidelines**, this document tracks every NASA dataset, Mars Trek web service, planetary nomenclature catalog, and third-party open-source software library integrated into **Red Condors — Martian Map**.

> **Disclaimer:** This project is an independent hackathon prototype created by Team Red Condors. It is **not** endorsed by, affiliated with, or an official product of NASA, the Jet Propulsion Laboratory (JPL), the California Institute of Technology (Caltech), or the United States Geological Survey (USGS). No official NASA or JPL logos/insignia are used in this application.

---

## 1. NASA & Planetary Science Datasets / Services

### 1.1 NASA Solar System Treks — Mars Trek OGC WMTS API
- **Portal / Platform:** NASA Solar System Treks — Mars Trek (`https://trek.nasa.gov/mars/`)
- **API Documentation:** `https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars`
- **Provider / Credit:** Courtesy NASA / JPL-Caltech
- **Usage in Project:** Streaming OGC RESTful Web Map Tile Service (WMTS) planetary imagery tiles in Equirectangular projection (`EPSG:104905` / `GCS_Mars_2000`, `default028mm` tile matrix set) across both the 3D Globe and 2D Map views.

### 1.2 Mars Viking Orbiter MDIM 2.1 Global Color Mosaic (`Mars_Viking_MDIM21_ClrMosaic_global_232m`)
- **Layer Identifier:** `Mars_Viking_MDIM21_ClrMosaic_global_232m` (*Viking VIS, Global Color Mosaic*)
- **WMTS Capabilities:** `https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml`
- **Tile Template:** `https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{TileMatrix}/{TileRow}/{TileCol}.jpg`
- **Spatial Resolution:** ~232 meters/pixel (Global Mars coverage, `[-180°, -90°, 180°, 90°]`)
- **Mission / Instrument:** NASA Viking 1 & Viking 2 Orbiters — Visual Imaging Subsystem (VIS), colorized and mosaicked as Mars Digital Image Model (MDIM 2.1)
- **Provider / Credit:** Courtesy NASA / JPL-Caltech / USGS Astrogeology Science Center
- **License / Terms:** Public Domain (U.S. Government / NASA & USGS open planetary science data)
- **Usage in Project:** Default global basemap draped onto the Martian ellipsoid (`IAU 2000`, `3,396,190 m × 3,376,200 m`) for 1:1 visual fidelity with NASA Mars Trek.

### 1.3 Mars Planetary Nomenclature (`combinedNom`)
- **Service Endpoint:** `https://trek.nasa.gov/mars/trekarcgis/rest/services/combinedNom/MapServer/0`
- **Upstream Catalog:** Gazetteer of Planetary Nomenclature (`https://planetarynames.wr.usgs.gov/`)
- **Provider / Credit:** International Astronomical Union (IAU) Working Group for Planetary System Nomenclature (WGPSN) / USGS Astrogeology Science Center / NASA JPL Mars Trek
- **License / Terms:** Public Domain / Open Scientific Data
- **Usage in Project:** Cached in `apps/web/public/data/mars_nomenclature.geojson` (via `apps/web/scripts/fetch-nomenclature.mjs`, 1,783 approved Martian surface feature names and priority levels `1`–`7`) to render toggleable Martian area and landform labels matching Mars Trek.

### 1.4 Deep Star Maps / Tycho-2 Celestial Skybox (`tycho2t3_80`)
- **Upstream Source:** NASA Goddard Space Flight Center Scientific Visualization Studio — *Deep Star Maps* (`https://svs.gsfc.nasa.gov/vis/a000000/a003500/a003572/`) & NASA/JPL-Caltech (`http://maps.jpl.nasa.gov/stars.html`), derived from the Hipparcos & Tycho-2 star catalogs
- **Assets Used:** `Assets/Textures/SkyBox/tycho2t3_80_{px,mx,py,my,pz,mz}.jpg` (bundled with CesiumJS and matching NASA Mars Trek's 3D Globe view)
- **Provider / Credit:** Courtesy NASA / Goddard Space Flight Center Scientific Visualization Studio / JPL-Caltech
- **License / Terms:** Public Domain / NASA Media Usage Guidelines (also redistributed under CesiumJS Apache-2.0 third-party notices)
- **Usage in Project:** 3D celestial starfield skybox (`Cesium.SkyBox.createEarthSkyBox()`) surrounding Mars in 3D Globe view, replicating NASA Mars Trek's deep-space background.

### 1.5 Mars Perseverance MEDA Weather
- **Dataset:** `juliensimon/mars-perseverance-weather` (`https://huggingface.co/datasets/juliensimon/mars-perseverance-weather`)
- **Upstream Source:** NASA Planetary Data System Atmospheres Node — Mars 2020 MEDA derived environmental products (`https://pds-atmospheres.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/data_derived_env/`)
- **Mission / Instrument:** NASA Mars 2020 Perseverance — Mars Environmental Dynamics Analyzer (MEDA)
- **Dataset Author / Citation:** Julien Simon, *Mars Perseverance MEDA Weather* (2026), Hugging Face
- **License:** CC BY 4.0 for the compiled Hugging Face dataset; upstream NASA products remain subject to NASA/PDS usage guidance
- **Usage in Project:** Dataset-level metadata and documented summary statistics are displayed at a representative Perseverance point in Jezero Crater. The point is explicitly labeled approximate and the values are historical dataset statistics, not live conditions.

### 1.6 MOLA Global Digital Elevation Model (`mola128_mola64_merge_90Nto90S_SimpleC_clon0.tif`)
- **Product:** Mars MGS MOLA DEM, 128 pixels/degree merged with 64 ppd where 128 ppd is unavailable (~463 m/pixel), Simple Cylindrical, centre longitude 0°, Int16 metres relative to the Mars areoid
- **Distribution:** USGS Astrogeology Science Center (`https://astrogeology.usgs.gov/search/map/mars_mgs_mola_dem_463m`), derived from the PDS MOLA Mission Experiment Gridded Data Records (MEGDR)
- **Mission / Instrument:** NASA Mars Global Surveyor (MGS) — Mars Orbiter Laser Altimeter (MOLA)
- **Provider / Credit:** MOLA Science Team, NASA Goddard Space Flight Center; mosaic by USGS Astrogeology Science Center
- **License / Terms:** Public Domain (U.S. Government / NASA & USGS open planetary science data)
- **Usage in Project:** Read by the API (`apps/api/app/modules/routing`) as a small window around a route destination to build a slope-filtered terrain graph for topography-aware safe routing (shortest / fastest / safest routes). The ~2 GB file is downloaded locally into `apps/api/data/` and is not committed.

---

## 2. Open-Source Libraries & Tooling

All third-party libraries used in this repository are distributed under **OSI-approved open-source licenses** and operate without proprietary SaaS tokens:

| Package | License | Repository / Homepage | Usage in Project |
| :--- | :--- | :--- | :--- |
| **CesiumJS (`cesium`)** | Apache-2.0 | `https://github.com/CesiumGS/cesium` | Unified WebGL planetary engine rendering both the 3D Martian Globe (`SCENE3D`) and 2D Equirectangular Map (`SCENE2D`), WMTS tile streaming, ray-ellipsoid coordinate picking, and GPU nomenclature labels (configured strictly without Cesium Ion tokens). |
| **React (`react`, `react-dom`)** | MIT | `https://github.com/facebook/react` | Frontend UI component architecture for the viewport host and HUD controls. |
| **TypeScript (`typescript`)** | Apache-2.0 | `https://github.com/microsoft/TypeScript` | Static type checking across planetary geometry, layer managers, and UI components. |
| **Vite (`vite`, `@vitejs/plugin-react`)** | MIT | `https://github.com/vitejs/vite` | Development server and production bundler. |
| **vite-plugin-static-copy** | MIT | `https://github.com/sapphi-red/vite-plugin-static-copy` | Serves and bundles CesiumJS Web Workers, Assets, and Widgets statically. |
| **Zustand (`zustand`)** | MIT | `https://github.com/pmndrs/zustand` | Lightweight reactive state store for map mode (`3D` / `2D`) and layer toggles. |
| **Tailwind CSS (`tailwindcss`, `@tailwindcss/vite`)** | MIT | `https://github.com/tailwindlabs/tailwindcss` | Utility-first styling for HUD controls. |
| **Lucide (`lucide-react`)** | ISC | `https://github.com/lucide-icons/lucide` | Open-source vector icons for zoom (`+`/`-`) and 3D/2D map view controls. |
| **ESLint ecosystem (`eslint`, `typescript-eslint`, React Hooks/Refresh plugins)** | MIT | `https://github.com/eslint/eslint`, `https://github.com/typescript-eslint/typescript-eslint`, `https://github.com/facebook/react` | Automated frontend lint checks locally and in GitHub Actions. |
| **GitHub-maintained Actions (`actions/checkout`, `actions/setup-node`, `actions/setup-python`)** | MIT | `https://github.com/actions/checkout`, `https://github.com/actions/setup-node`, `https://github.com/actions/setup-python` | Reproducible dependency installation, lint, and test execution in pull requests and branch pushes. |
| **FastAPI (`fastapi`)** | MIT | `https://github.com/fastapi/fastapi` | Backend web framework for the `apps/api` modular monolith (routing, validation, OpenAPI docs). |
| **Starlette (`starlette`, FastAPI dependency)** | BSD-3-Clause | `https://github.com/encode/starlette` | ASGI toolkit underlying FastAPI, including the test client. |
| **Uvicorn (`uvicorn[standard]`)** | BSD-3-Clause | `https://github.com/encode/uvicorn` | ASGI server that runs the API locally (with auto-reload) and in deployment. |
| **Pydantic (`pydantic`) & pydantic-settings** | MIT | `https://github.com/pydantic/pydantic`, `https://github.com/pydantic/pydantic-settings` | Request/response schemas and `RC_*` environment-based configuration. |
| **Rasterio (`rasterio`)** | BSD-3-Clause | `https://github.com/rasterio/rasterio` | Windowed reads of the MOLA GeoTIFF DEM for safe routing (bundles GDAL, MIT/X). |
| **NumPy (`numpy`)** | BSD-3-Clause | `https://github.com/numpy/numpy` | Vectorised slope, distance and travel-time calculations over DEM windows. |
| **NetworkX (`networkx`)** | BSD-3-Clause | `https://github.com/networkx/networkx` | Terrain graph and Dijkstra shortest-path search for shortest / fastest / safest routes. |
| **pytest (`pytest`)** | MIT | `https://github.com/pytest-dev/pytest` | Backend unit and integration tests. |
| **HTTPX (`httpx`)** | BSD-3-Clause | `https://github.com/encode/httpx` | HTTP client used by FastAPI's `TestClient` in backend tests. |
| **Ruff (`ruff`)** | MIT | `https://github.com/astral-sh/ruff` | Python linter for the backend, locally and in GitHub Actions. |
| **Roboto Font** | Apache-2.0 | `https://fonts.google.com/specimen/Roboto` | Typography matching NASA Mars Trek's HUD and map nomenclature labels. |
| **JetBrains Mono** | SIL Open Font License 1.1 | `https://github.com/JetBrains/JetBrainsMono` | Monospaced typography for the Perseverance weather point marker and information panel. |
