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
| **GitHub-maintained Actions (`actions/checkout`, `actions/setup-node`)** | MIT | `https://github.com/actions/checkout`, `https://github.com/actions/setup-node` | Reproducible dependency installation and lint execution in pull requests and branch pushes. |
| **Roboto Font** | Apache-2.0 | `https://fonts.google.com/specimen/Roboto` | Typography matching NASA Mars Trek's HUD and map nomenclature labels. |
