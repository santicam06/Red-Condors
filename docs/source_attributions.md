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
- **Usage in Project:** Cached in `public/data/mars_nomenclature.geojson` (via `scripts/fetch-nomenclature.mjs`, 1,783 approved Martian surface feature names and priority levels `1`–`7`) to render toggleable Martian area and landform labels matching Mars Trek. Visible labels can be hovered (enlarged, blue) and clicked to open a location-details card.

### 1.4 USGS Gazetteer of Planetary Nomenclature — Target: Mars
- **Catalog page:** `https://planetarynames.wr.usgs.gov/Page/MARS/target`
- **Gazetteer home:** `https://planetarynames.wr.usgs.gov/`
- **Descriptor terms:** `https://planetarynames.wr.usgs.gov/DescriptorTerms` (morphological class definitions shown in the location card; terms describe shape, not geologic origin)
- **Center-point download:** `https://asc-planetarynames-data.s3.us-west-2.amazonaws.com/MARS_nomenclature_center_pts.zip` (linked from the Mars target page under GIS Downloads; snapshot dated 2026-11-14)
- **Provider / Credit:** International Astronomical Union (IAU) Working Group for Planetary System Nomenclature (WGPSN) / USGS Astrogeology Science Center
- **License / Terms:** Public Domain / Open Scientific Data (U.S. Government)
- **Usage in Project:** `src/components/Locations/usgsGazetteer.json` stores the approved Mars center-point attributes (name, center, extent, diameter, origin, approval, quadrangle, and feature-page URL). The location card looks up the clicked label by clean name and cites `https://planetarynames.wr.usgs.gov/Page/MARS/target` as the source. Individual records link to `https://planetarynames.wr.usgs.gov/Feature/{id}` when the gazetteer includes that feature.

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
- **Usage in Project:** First photo in the location card (`src/components/Locations/PlacePhoto.tsx`). This is the same mosaic as the globe basemap, cropped around the clicked feature. Cross-origin tile reads are allowed (`Access-Control-Allow-Origin: *`).

### 2.2 Mars Global Surveyor MOLA Color Shaded Relief (place photo)
- **Layer Identifier:** `Mars_MGS_MOLA_ClrShade_merge_global_463m`
- **WMTS Capabilities:** `https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/WMTSCapabilities.xml`
- **Tile Template:** `https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{TileMatrix}/{TileRow}/{TileCol}.jpg`
- **Spatial Resolution:** about 463 meters/pixel, global coverage
- **Mission / Instrument:** NASA Mars Global Surveyor — Mars Orbiter Laser Altimeter (MOLA), color shaded relief
- **Provider / Credit:** Courtesy NASA / JPL-Caltech / Goddard Space Flight Center (GSFC)
- **Portal:** NASA Mars Trek (`https://trek.nasa.gov/mars/`)
- **License / Terms:** Public Domain (U.S. Government / NASA open planetary science data)
- **Usage in Project:** Second photo in the location card, switched with the on-image arrows. Zoom follows the feature’s diameter so a crater and a regional terra are both framed. Tile math and credits live in `src/components/Locations/placeImagery.ts`.

---

### 1.5 Hypothetical Olympus Mons crew sites
- **Landform coordinates:** Center points for Olympus Mons, Olympus Rupes, Olympus Paterae, Lycus Sulci, Pangboche, and Karzok are taken from the USGS gazetteer snapshot in §1.4.
- **Usage in Project:** `src/components/Outposts/olympusSites.ts` places fictional rehearsal infrastructure (base camp, habitat, science stops, and a short-walk sample pad) on those landforms. These camps are original scenario content. They are not NASA, JPL, or mission facilities, and the app labels them as hypothetical.
- **Navigation:** The Olympus rehearsal compares the straight ellipsoid line with a slope-and-dust path for a rover and a suited walk. Speeds are rehearsal values: 10 km/h (rover) and 1.5 km/h (Marswalk). See §4.

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
| **Roboto Font** | Apache-2.0 | `https://fonts.google.com/specimen/Roboto` | Typography matching NASA Mars Trek's HUD and map nomenclature labels. |

---

## 4. Topography and dust used to choose a route

These products feed the Olympus Mons rehearsal. The straight line is drawn in red when it is too steep or too dusty. A blue line is the rover path. A gold line is the walking path. There is no public live global dust-storm API, so “now” means the current Mars season on the latest complete daily maps, not a picture from today’s downlink.

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
- **Usage in Project:** `src/components/Outposts/molaOlympus.json` keeps the rows from 32°N to 12°N and 208°E to 242°E. The router turns neighboring elevations into a slope. A Marswalk stops above 15°. A rover stops above 25°.

### 4.2 MRO MCS column dust optical depth (gridded, Mars Year 36)
- **Product:** Gridded column dust optical depth, version 2.5, Mars Year 36. Infrared absorption at 9.3 μm, normalized to 610 Pa. One map per sol on a 5° latitude by 6° longitude grid.
- **File:** `https://www-mars.lmd.jussieu.fr/mars/dust_climatology/dataset_v2/griddedcdod_MY36_v2-5.nc` (created 8 February 2023)
- **Catalog:** `https://www-mars.lmd.jussieu.fr/mars/dust_climatology/index.html`
- **Observations:** NASA Mars Reconnaissance Orbiter — Mars Climate Sounder (MCS), v5.2 retrievals
- **Method and citation:** Montabone, L., et al. (2015), *Icarus*, doi:10.1016/j.icarus.2014.12.034. Montabone, L., et al. (2020), *JGR Planets*, doi:10.1029/2019JE006111. Version 2.5 for Mars Year 36.
- **Provider / Credit:** Luca Montabone and co-authors, from NASA MRO MCS observations. Contact listed on the file: Luca Montabone.
- **License / Terms:** Creative Commons Attribution-ShareAlike 3.0 (`https://creativecommons.org/licenses/by-sa/3.0/`). This dust grid is not public-domain. Credit the authors, and keep that license on adaptations.
- **Why this is not a live feed:** MCS profile files at the PDS Atmospheres Node (`https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/aerosols.html`) are the nearer-to-present archive, but they are along-track profiles, not a filled map, and the published volumes lag the current Earth date. The route uses the newest full daily maps (Mars Year 36).
- **Usage in Project:** `src/components/Outposts/dustSeason.json` stores two sols from that file.
  - **Present season:** sol at Ls 21.5°, chosen because 14 November 2026 falls at about Ls 21.6° (northern spring, usually clear). Dust over Olympus is about 0.05–0.12.
  - **Dust-storm season:** sol at Ls 315°, the dustiest stretch of Mars Year 36 in this file. A rehearsal case, not today’s weather. Dust over this region rises to about 0.5–1.1.
- **How the route uses it:** A walking step is refused above optical depth 1.0. A rover step is refused above 1.3. Below those caps, dust slows the ETA. In the present season the dust is too light to move the path, so MOLA slope picks the corridor. In the storm rehearsal, dusty cells can close the walk before they close the rover.
