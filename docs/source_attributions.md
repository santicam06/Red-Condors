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
- **Usage in Project:** Default **Satellite** basemap draped onto the Martian ellipsoid (`IAU 2000`, `3,396,190 m × 3,376,200 m`). The map-type control can replace it with the Terrain layer. The same mosaic is the first photo for a named place and for a pin dropped on unnamed ground.

### 1.3 Mars Planetary Nomenclature (`combinedNom`)
- **Service Endpoint:** `https://trek.nasa.gov/mars/trekarcgis/rest/services/combinedNom/MapServer/0`
- **Upstream Catalog:** Gazetteer of Planetary Nomenclature (`https://planetarynames.wr.usgs.gov/`)
- **Provider / Credit:** International Astronomical Union (IAU) Working Group for Planetary System Nomenclature (WGPSN) / USGS Astrogeology Science Center / NASA JPL Mars Trek
- **License / Terms:** Public Domain / Open Scientific Data
- **Usage in Project:** Cached in `apps/web/public/data/mars_nomenclature.geojson` (via `apps/web/scripts/fetch-nomenclature.mjs`, 1,783 approved Martian surface feature names and priority levels `1`–`7`) to render toggleable Martian area and landform labels matching Mars Trek. Visible labels can be hovered (enlarged, blue) and clicked to open a location-details card. With **Start pin** or **End pin** armed, a click on a name sets that place as that end.

### 1.4 USGS Gazetteer of Planetary Nomenclature — Target: Mars
- **Catalog page:** `https://planetarynames.wr.usgs.gov/Page/MARS/target`
- **Gazetteer home:** `https://planetarynames.wr.usgs.gov/`
- **Descriptor terms:** `https://planetarynames.wr.usgs.gov/DescriptorTerms` (morphological class definitions shown in the location card; terms describe shape, not geologic origin)
- **Center-point download:** `https://asc-planetarynames-data.s3.us-west-2.amazonaws.com/MARS_nomenclature_center_pts.zip` (linked from the Mars target page under GIS Downloads; snapshot dated 2026-11-14)
- **Provider / Credit:** International Astronomical Union (IAU) Working Group for Planetary System Nomenclature (WGPSN) / USGS Astrogeology Science Center
- **License / Terms:** Public Domain / Open Scientific Data (U.S. Government)
- **Usage in Project:** `apps/web/src/components/Locations/usgsGazetteer.json` stores the approved Mars center-point attributes (name, center, extent, diameter, origin, approval, quadrangle, and feature-page URL). The location card looks up the clicked label by clean name and cites `https://planetarynames.wr.usgs.gov/Page/MARS/target` as the source. Individual records link to `https://planetarynames.wr.usgs.gov/Feature/{id}` when the gazetteer includes that feature.

### 1.5 Deep Star Maps / Tycho-2 Celestial Skybox (`tycho2t3_80`)
- **Upstream Source:** NASA Goddard Space Flight Center Scientific Visualization Studio — *Deep Star Maps* (`https://svs.gsfc.nasa.gov/vis/a000000/a003500/a003572/`) & NASA/JPL-Caltech (`http://maps.jpl.nasa.gov/stars.html`), derived from the Hipparcos & Tycho-2 star catalogs
- **Assets Used:** `Assets/Textures/SkyBox/tycho2t3_80_{px,mx,py,my,pz,mz}.jpg` (bundled with CesiumJS and matching NASA Mars Trek's 3D Globe view)
- **Provider / Credit:** Courtesy NASA / Goddard Space Flight Center Scientific Visualization Studio / JPL-Caltech
- **License / Terms:** Public Domain / NASA Media Usage Guidelines (also redistributed under CesiumJS Apache-2.0 third-party notices)
- **Usage in Project:** 3D celestial starfield skybox (`Cesium.SkyBox.createEarthSkyBox()`) surrounding Mars in 3D Globe view, replicating NASA Mars Trek's deep-space background.

---

## 2. Location Card Imagery

The place card opened from a nomenclature name shows a photo of that spot, centered on the feature. The photos are cropped from public Mars Trek WMTS tiles (no API key). Use the arrows on the photo to switch views. Each image is credited on the photo and again in the card’s Imagery section.

### 2.1 Viking VIS Global Color Mosaic (place photo)
- **Layer Identifier:** `Mars_Viking_MDIM21_ClrMosaic_global_232m`
- **WMTS Capabilities:** `https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml`
- **Tile Template:** `https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{TileMatrix}/{TileRow}/{TileCol}.jpg`
- **Mission / Instrument:** NASA Viking 1 & Viking 2 Orbiters — Visual Imaging Subsystem (VIS), MDIM 2.1 color mosaic, about 232 m/pixel
- **Provider / Credit:** Courtesy NASA / JPL-Caltech / USGS Astrogeology Science Center
- **License / Terms:** Public Domain (U.S. Government / NASA & USGS open planetary science data)
- **Usage in Project:** First photo in the location card (`apps/web/src/components/Locations/PlacePhoto.tsx`). This is the same mosaic as the globe basemap, cropped around the clicked feature. Cross-origin tile reads are allowed (`Access-Control-Allow-Origin: *`).

### 2.2 Mars Global Surveyor MOLA Color Shaded Relief (place photo)
- **Layer Identifier:** `Mars_MGS_MOLA_ClrShade_merge_global_463m`
- **WMTS Capabilities:** `https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/WMTSCapabilities.xml`
- **Tile Template:** `https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{TileMatrix}/{TileRow}/{TileCol}.jpg`
- **Spatial Resolution:** about 463 meters/pixel, global coverage
- **Mission / Instrument:** NASA Mars Global Surveyor — Mars Orbiter Laser Altimeter (MOLA), color shaded relief
- **Provider / Credit:** Courtesy NASA / JPL-Caltech / Goddard Space Flight Center (GSFC)
- **Portal:** NASA Mars Trek (`https://trek.nasa.gov/mars/`)
- **License / Terms:** Public Domain (U.S. Government / NASA open planetary science data)
- **Usage in Project:** Second photo in a location card and in the card for a pin on unnamed ground, switched with the on-image arrows. The same layer is the **Terrain** basemap (`apps/web/src/features/map-layers/`). Its legend shows the shaded-relief colors and an elevation ramp from about −8 km to about +21 km. Zoom on the card follows the feature’s diameter, or a local window for a pin. Tile math and credits live in `apps/web/src/components/Locations/placeImagery.ts`.

### 2.3 MOLA elevation mosaic (not a map type)
- **Layer Identifier:** `Mars_MGS_MOLA_DEM_mosaic_global_463m_8`
- **WMTS Capabilities:** `https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_DEM_mosaic_global_463m_8/1.0.0/WMTSCapabilities.xml`
- **Tile Template:** `https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_DEM_mosaic_global_463m_8/1.0.0/default/default028mm/{TileMatrix}/{TileRow}/{TileCol}.png`
- **Spatial Resolution:** about 463 meters/pixel, global coverage, greyscale elevation (published tiles through level 5)
- **Mission / Instrument:** NASA Mars Global Surveyor — Mars Orbiter Laser Altimeter (MOLA)
- **Provider / Credit:** Courtesy NASA / Goddard Space Flight Center, MOLA Science Team
- **License / Terms:** Public Domain (U.S. Government / NASA open planetary science data)
- **Usage in Project:** Not shown. The map types are Satellite and Terrain. This greyscale elevation mosaic is not a basemap.

### 1.6 MOLA Global Digital Elevation Model (`mola128_mola64_merge_90Nto90S_SimpleC_clon0.tif`)
- **Product:** Mars MGS MOLA DEM, 128 pixels/degree merged with 64 ppd where 128 ppd is unavailable (~463 m/pixel), Simple Cylindrical, centre longitude 0°, Int16 metres relative to the Mars areoid
- **Distribution:** USGS Astrogeology Science Center (`https://astrogeology.usgs.gov/search/map/mars_mgs_mola_dem_463m`), derived from the PDS MOLA Mission Experiment Gridded Data Records (MEGDR)
- **Mission / Instrument:** NASA Mars Global Surveyor (MGS) — Mars Orbiter Laser Altimeter (MOLA)
- **Provider / Credit:** MOLA Science Team, NASA Goddard Space Flight Center; mosaic by USGS Astrogeology Science Center
- **License / Terms:** Public Domain (U.S. Government / NASA & USGS open planetary science data)
- **Usage in Project:** Read by the API (`apps/api/app/modules/routing`) as a small window around a route destination to build a slope-filtered terrain graph for topography-aware safe routing (shortest / fastest / safest routes). The ~2 GB file is downloaded locally into `apps/api/data/` and is not committed.

---

### 2.4 Hypothetical Olympus Mons crew sites
- **Landform coordinates:** Center points for Olympus Mons, Olympus Rupes, Olympus Paterae, Lycus Sulci, Pangboche, and Karzok are taken from the USGS gazetteer snapshot in §1.4.
- **Usage in Project:** `apps/web/src/components/Outposts/olympusSites.ts` places fictional rehearsal infrastructure (base camp, habitat, science stops, and a short-walk sample pad) on those landforms. These camps are original scenario content. They are not NASA, JPL, or mission facilities, and the app labels them as hypothetical.
- **Navigation:** **Start pin** and **End pin** place the two ends. **Remove pin**, then a click on the Start or End pin, clears that end. A pin on unnamed ground shows Viking and MOLA photos of that spot. The safe-route overlay does not add A or B markers. Rehearsal speeds are 1.5 km/h (person), 10 km/h (rover), and 25 km/h (hypothetical crew vehicle, not a NASA vehicle). `apps/web/src/features/route-planner/energyPath.ts` finds the corridor. Inside the Olympus MOLA window (32°N–12°N, 208°E–242°E) the cost is mechanical energy on the MOLA grid: potential energy m × 3.71 m/s² × climb, kinetic energy ½mv² to reach cruise speed, and rolling work Crr × m × g × distance. A walk stops above 15°, the crew car above 18°, and a rover above 25°. A walk that fits in 8 hours is preferred; otherwise the lower-energy of the car and the rover is chosen. Rehearsal masses are 180 kg (suited person), 900 kg (rover), and 1,500 kg (hypothetical crew car, not a NASA vehicle). Rolling coefficients are 0.25, 0.18, and 0.12. They are scenario assumptions, not flight data. Outside that window the line stays straight and the climb is not checked. Dust does not change the route. See §4.

## 3. Open-Source Libraries & Tooling

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
| **JetBrains Mono** | SIL Open Font License 1.1 | `https://github.com/JetBrains/JetBrainsMono` | Monospaced typography for the map HUD and route bar. |
| **HTTPX (`httpx`), runtime use** | BSD-3-Clause | `https://github.com/encode/httpx` | Downloads PDS mosaics and verifies the curated rover Street View stops against NASA sources. |
| **Pillow (`pillow`)** | MIT-CMU (HPND) | `https://github.com/python-pillow/Pillow` | Resizes ~60 MB PDS Navcam mosaics into cached, browser-sized JPEG panoramas. |
| **Photo Sphere Viewer (`@photo-sphere-viewer/core`)** | MIT | `https://github.com/mistic100/Photo-Sphere-Viewer` | Interactive 360° panorama viewer for the Rover Street View (partial/cropped equirectangular panoramas). |
| **three.js (`three`, Photo Sphere Viewer dependency)** | MIT | `https://github.com/mrdoob/three.js` | WebGL rendering underlying Photo Sphere Viewer. |

---

## 4. Topography used to choose a route

MOLA topography feeds the Olympus Mons rehearsal and the best-direction search between the Start and End pins. The straight line is the short wish. The path the crew may take bends around steep ground. Dust storms are not drawn and are not used to choose or close a route.

### 4.1 MGS MOLA topography (MEGDR)
- **Product:** `MEGT90N000EB.IMG`, median topography, 16 pixels per degree (about 3.7 km)
- **Dataset:** `MGS-M-MOLA-5-MEGDR-L3-V1.0`
- **Label:** `https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016/megt90n000eb.lbl`
- **Image:** `https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg016/megt90n000eb.img`
- **Catalog:** `https://pds-geosciences.wustl.edu/missions/mgs/megdr.html`
- **Mission / Instrument:** NASA Mars Global Surveyor — Mars Orbiter Laser Altimeter (MOLA), Mapping and Extended missions, 1999–2001
- **What a pixel is:** Planetary radius minus the areoid, in meters, IAU 2000. Signed 16-bit integer.
- **Provider / Credit:** Courtesy NASA / Goddard Space Flight Center. MOLA team, principal investigator David E. Smith. Archived at the NASA PDS Geosciences Node.
- **License / Terms:** Public domain (U.S. Government / NASA)
- **Usage in Project:** `apps/web/src/components/Outposts/molaOlympus.json` keeps the rows from 32°N to 12°N and 208°E to 242°E. The router turns neighboring elevations into a slope. A Marswalk stops above 15°. A hypothetical crew car stops above 18°. A rover stops above 25°. The best-direction search uses those corridors when both pins fall in this window.

### 4.2 MRO MCS column dust optical depth (gridded, Mars Year 36)
- **Product:** Gridded column dust optical depth, version 2.5, Mars Year 36. Infrared absorption at 9.3 μm, normalized to 610 Pa. One map per sol on a 5° latitude by 6° longitude grid.
- **File:** `https://www-mars.lmd.jussieu.fr/mars/dust_climatology/dataset_v2/griddedcdod_MY36_v2-5.nc` (created 8 February 2023)
- **Catalog:** `https://www-mars.lmd.jussieu.fr/mars/dust_climatology/index.html`
- **Observations:** NASA Mars Reconnaissance Orbiter — Mars Climate Sounder (MCS), v5.2 retrievals
- **Method and citation:** Montabone, L., et al. (2015), *Icarus*, doi:10.1016/j.icarus.2014.12.034. Montabone, L., et al. (2020), *JGR Planets*, doi:10.1029/2019JE006111. Version 2.5 for Mars Year 36.
- **Provider / Credit:** Luca Montabone and co-authors, from NASA MRO MCS observations. Contact listed on the file: Luca Montabone.
- **License / Terms:** Creative Commons Attribution-ShareAlike 3.0 (`https://creativecommons.org/licenses/by-sa/3.0/`). This dust grid is not public-domain. Credit the authors, and keep that license on adaptations.
- **Why this is not a live feed:** MCS profile files at the PDS Atmospheres Node (`https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/aerosols.html`) are the nearer-to-present archive, but they are along-track profiles, not a filled map, and the published volumes lag the current Earth date.
- **Usage in Project:** The grid is stored in `apps/web/src/components/Outposts/dustSeason.json` for the Olympus rehearsal. It is not drawn on the map. The best-direction search does not close a route because of dust. The crew-facing path follows MOLA topography only (§4.1 and §1.6).

---

## 5. Rover Street View imagery

Real ground-level 360° panoramas for the curated Perseverance tour in Jezero Crater. Full provenance: `docs/streetview_data_sources.md`.

### 5.1 Mars 2020 Perseverance Rover Waypoints & Mission Map Layers (NASA/JPL MMGIS)
- **Endpoints:**
  - Waypoints: `https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json`
  - Samples: `https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_SAMPLE_v3.json`
  - Surface milestones: `https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_surfaceexperience.json`
  - Ingenuity airfields: `https://mars.nasa.gov/mmgis-maps/M20/Layers/json/m20_heli_waypoints.json`
  - Sample depot: `https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_TF_Sample_Depot.json`
- **Mission:** NASA Mars 2020 Perseverance rover
- **Provider / Credit:** Courtesy NASA/JPL-Caltech
- **License / Terms:** NASA public mission data; JPL Image Use Policy (`https://www.jpl.nasa.gov/jpl-image-use-policy`)
- **Usage in Project:** Positions (lat/lon, sol, site/drive) and milestone/sample facts for the 10 curated Rover Street View stops in `apps/api/app/modules/rover_images/showcase_stops.json`. The milestone texts only restate these layers' fields. Provenance is re-checkable with `python -m app.modules.rover_images.verify_showcase`. See `docs/streetview_data_sources.md`.

### 5.2 Mars 2020 Navcam Cylindrical Mosaics (NASA PDS Imaging Node)
- **Bundle:** `mars2020_navcam_ops_mosaic` (`https://planetarydata.jpl.nasa.gov/img/data/mars2020/mars2020_navcam_ops_mosaic/`)
- **Products Used:** 10 color cylindrical browse mosaics (`N_LRGB_*_CYL_*`, product IDs listed in `docs/streetview_data_sources.md`) and their PDS4 XML labels (azimuth/elevation coverage)
- **Mission / Instrument:** NASA Mars 2020 Perseverance — Navigation Cameras (Navcam)
- **Provider / Credit:** Courtesy NASA/JPL-Caltech (shown on every panorama, with a per-image provenance section and links to the originals)
- **License / Terms:** Public NASA planetary data (PDS); JPL Image Use Policy: usable for any purpose with credit line, no implied endorsement, no NASA/JPL logos
- **Usage in Project:** 360° ground-level panoramas for the Rover Street View. The API downloads each original from PDS on first use, **resizes it only** (≤8192 px JPEG, no cropping, colour or content edits), and caches it in `apps/api/data/` (gitignored).
