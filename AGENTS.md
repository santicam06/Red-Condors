# AGENTS.md — Red Condors (Martian Map)

## Project Context
This repository contains **Red Condors'** project for the **NASA Space Apps Hackathon in Toronto (November 14–15, 2026)**, tackling the challenge **"Interplanetary Survival Guide: Martian Map"** (see `docs/challenge.md`).

> **Current Stage — Interactive Map, Olympus Rupes Outposts & Safe Routing Baseline:**
> The repository is a monorepo with exactly **one frontend** (React + Vite + TypeScript +
> CesiumJS in `apps/web`) and exactly **one backend** (**FastAPI** modular monolith in
> `apps/api`). The frontend reaches the backend through relative `/api/*` URLs (proxied by
> Vite in development). The app currently delivers the 3D/2D Mars Trek map with USGS
> nomenclature place cards, **7 color-coded fictitious crew camps around Olympus Rupes /
> Olympus Mons**, a Google Maps–style lateral route planner, dust-season and MOLA-slope
> rehearsal routing, and a FastAPI MOLA DEM safe-routing endpoint (`POST /api/routes`) with
> a toggleable traversable-area slope overlay, a curated 10-stop Perseverance (Jezero) rover
> "Street View" with real NASA 360° panoramas, and a Google Maps–style map search bar. Full
> waypoint mission workflows and a database remain planned/TBD.

## Vision
We are building a **"Google Earth for Mars"** style interactive mission-planning and rehearsal application that bridges global/regional planetary maps with hyperlocalized astronaut surface operations (Marswalks / EVAs and rover traverses).

## Core Product Features

1. **3D Globe & 2D Map Views of Mars (Mars Trek Fidelity) + Interactive Nomenclature** *(Implemented)*
   - Interactive **3D Globe** (`SCENE3D`) and **2D Equirectangular Map** (`SCENE2D`) of Mars over the IAU 2000 ellipsoid (`CesiumJS` with Cesium Ion disabled), preserving camera framing across switches, paired with a Tycho-2 3D starfield skybox, a 2D `StarfieldBackdrop`, `+`/`-` zoom controls, and a live 60 FPS cursor `Lat / Lon` readout.
   - Streams **NASA's Mars Trek (`trek.nasa.gov/mars/`)** `Mars_Viking_MDIM21_ClrMosaic_global_232m` public WMTS basemap tiles for 1:1 visual fidelity with Mars Trek (*scope note:* 3D elevation/relief mesh exaggeration on the globe remains deferred; imagery is draped over a smooth Martian ellipsoid/2D map).
   - **Toggleable Mars Nomenclature & USGS Location Details Cards:** Renders 1,783 approved IAU/USGS Martian feature labels (`combinedNom`) with zoom-level hierarchy filtering (`level` 1–7) and 3D far-side globe occlusion. Hovering a visible label enlarges and highlights it in blue; clicking opens a **Location Details Panel** inside the left sidebar with cropped Mars Trek WMTS place photos (*Viking VIS Color Mosaic* and *MGS MOLA Color Shaded Relief*), IAU morphological descriptor definitions, spatial extent, name origin, and direct links to the official USGS Gazetteer record.

2. **Martian "Street View" Mode (Rover Surface Imagery)** *(Implemented — Perseverance tour)*
   - Emulate the **Google Street View** "pegman / stickman" experience adapted for Mars.
   - Because rover imagery consists of discrete capture points rather than continuous road coverage, display available rover surface photos / 360° panoramas as **interactive dots on the map** (similar to static 360° user photo spheres on Google Maps).
   - Dropping the stickman onto (or clicking) a dot opens a ground-level view of the real imagery captured by NASA rovers at that location.
   - **Implemented:** a draggable astronaut/rover avatar (HUD, bottom-right) drops onto **10 curated Perseverance stops in Jezero Crater** (numbered yellow badges, visible below ~120 km) and opens a full-screen 360° Photo Sphere Viewer of the real **NASA PDS Mars 2020 Navcam cylindrical mosaics**, with milestone/sample info, tour Previous/Next and an in-app provenance section. Frontend: `apps/web/src/features/rover-streetview/`; API: `apps/api/app/modules/rover_images/` (`/api/rover-images/stops`, `/nearest`, `/stops/{id}/panorama.jpg`). Every stop is declared in `showcase_stops.json` and re-checkable with `python -m app.modules.rover_images.verify_showcase` (see `docs/streetview_data_sources.md`). No rover has visited Olympus Mons, so no ground imagery exists there.

3. **Outpost Locations & Displacement Rehearsals (Olympus Rupes Crew Camps & Route Planner)** *(Started)*
   - **Fictitious Crew Camps near Olympus Rupes / Olympus Mons (`apps/web/src/components/Outposts/`):**
     - Uses **Olympus Mons and Olympus Rupes** as an initial rehearsal Area of Interest, pinning **7 hypothetical human-mission camps/sites** to real USGS-named landforms while explicitly labeling them in the UI as fictional/not real NASA facilities.
     - Rendered on the map (`olympus-outposts` overlay channel) as **interactive white-outlined colored dots** categorized by outpost role (`OutpostKind`):
       - **Gold (`#F5C542`) — Base Camp:** **Lycus Base Camp** (*Lycus Sulci aureole*, `24.20°N, 218.40°E`) — landing and logistics staging camp northwest of the basal cliff.
       - **Orange (`#E07A3D`) — Habitat:** **Scarp Habitat** (*Olympus Rupes*, `20.60°N, 220.90°E`) — pressurized habitat at the foot of the basal escarpment.
       - **Light Blue (`#7EB6FF`) — Waypoints:** **Aureole Sample Pad** (*Lycus Sulci*, `27.65°N, 226.00°E`) and **Flank Relay** (*Olympus Mons shield*, `19.60°N, 223.60°E`).
       - **Emerald Green (`#3DDC97`) — Science Stations:** **Caldera Rim Observatory** (*Olympus Paterae*, `19.04°N, 226.81°E`), **Pangboche Station** (*Pangboche crater*, `17.28°N, 226.15°E`), and **Karzok Cache** (*Karzok crater*, `18.40°N, 228.65°E`).
     - Selecting a colored dot on the map or from the **Olympus Mons** rehearsal panel enlarges the active marker, flies the camera to frame the site (or the full volcano), shows its site brief, and provides a one-click **Indications** button to load it into the route planner (active origin/destination camps display slightly enlarged map labels without brackets).
   - **Google Maps–Style Lateral Route Planner (`RouteLateralBar` in `apps/web/src/features/route-planner/`):**
     - Collapsible left sidebar supporting both **Astronaut Marswalk (EVA, ~1.5 km/h)** and **Rover (~10 km/h)** travel modes, origin/destination autocomplete search exclusively across crew camps/outposts (planetary nomenclature features are used only for viewing details, never route calculations), camp-dot map-click picking, origin/destination swapping, dashed traverse polylines, geodesic **distance (`km`)**, and per-mode **ETA**.

4. **Climate & Environmental Condition Tracking (Dynamic Rerouting)** *(Started)*
   - Track environmental/climate conditions combining **real NASA Mars datasets** and **simulated rehearsal scenarios** so hazardous conditions trigger warnings, slow traversal speeds, or reroute/close paths.
   - **Olympus Dust-Season Rehearsal (`dustSeason.json`, `terrain.ts`, `safeRoute.ts`):** Integrates **MRO Mars Climate Sounder (MCS)** Mars Year 36 gridded column dust optical depth ($\tau$ at 9.3 µm) to compare **present season** ($L_s \approx 21.5^\circ$, clear northern spring) against a **regional dust-storm rehearsal** ($L_s = 315^\circ$, $\tau \approx 0.5\text{–}1.1$). Dust degrades EVA/rover speeds and enforces optical-depth safety cutoffs ($\tau \le 1.0$ for Marswalk, $\tau \le 1.3$ for Rover), closing suited walks before rovers in storm conditions.

5. **Topography-Aware Safe Routing & Traversable Area Overlay** *(Started)*
   - Displacement routes actively account for Martian topography—such as **craters, steep slopes, scarps (*Olympus Rupes*), ridges, and mountains**—avoiding terrain hazards so the crew arrives **safely**.
   - **Backend MOLA DEM Safe-Routing Engine (`POST /api/routes` in `apps/api/app/modules/routing/` & `apps/web/src/features/routing/`):** Reads local windows of the **MGS MOLA ~463 m/pixel GeoTIFF DEM** (`rasterio` + `numpy`), builds a slope-filtered `networkx` terrain graph within a 20 km planning radius, and computes **shortest**, **fastest**, and **safest** routes via Dijkstra's algorithm with rover and EVA grade-adjusted ETAs.
   - **Traversable Area HUD Overlay & Slope Legend (`WalkableAreaToggle`, `WalkableAreaLegend`):** Classifies terrain around a destination into **Gentle**, **Moderate**, **Steep (no-go)**, and **Cut off (walled-in)** cells, rendered on the map with a toggle switch and dynamic slope-threshold legend in the HUD.
   - **Olympus Regional Rehearsal Router (`molaOlympus.json` + `safeRoute.ts`):** Runs client-side A* pathfinding over MGS MOLA MEGDR (16 ppd) elevations across the Olympus Mons / Olympus Rupes region, rejecting hazardous straight-line cliff traverses and finding corridors under `15°` (Marswalk) and `25°` (Rover) grade limits.

6. **Scientific Research Missions at Waypoints** *(Started — Site Briefs; Interactive Workflows Planned)*
   - Every location of interest pairs crew displacement with objectives grounded in **real Martian scientific research** (e.g., geological sampling, mineral/spectral investigation, subsurface water-ice search, or astrobiology).
   - Each of the 7 hypothetical **Olympus Rupes / Olympus Mons** camps already includes a geology-grounded field brief (`olympusSites.ts` — aureole giant-landslide block sampling in *Lycus Sulci*, exposed lava-flow stratigraphy at the *Olympus Rupes* basal scarp, nested pit collapse history at *Olympus Paterae*, and impact-exposed flank lava cross-sections/ejecta at *Pangboche* and *Karzok*). Full interactive mission checklists/workflows remain planned.

7. **Map Search Bar** *(Implemented)*
   - Google Maps–style search (`apps/web/src/features/map-search/`) floating top-left and docking on top of the lateral bar: finds IAU place names (opens the place card), Olympus crew camps (opens the camp card via `components/Outposts/useOutpostSelection.ts`), the Perseverance 360° stops (opens the panorama) and typed `lat, lon` coordinates (flies there with a pin). Accent-insensitive; `/` focuses it.

## Repository Structure (Current)
- `README.md` — Team-facing overview, feature status table, and how to run the app.
- `AGENTS.md` — Project context, current feature inventory, and guidelines for AI coding agents.
- `AGENTS_mapping.md` — Detailed engineering spec for Core Feature 1 (3D/2D Mars Trek fidelity & USGS nomenclature cards).
- `scripts/dev.sh` — Single entry point to set up, run, and check the whole app.
- `apps/web/` — React 19, TypeScript, Vite, Tailwind CSS, Zustand, and CesiumJS frontend.
- `apps/web/src/core/` — Dataset-agnostic CesiumJS planetary engine (`MarsViewerController`), coordinate picking, Viking WMTS basemap, and GPU nomenclature layer manager.
- `apps/web/src/components/` — Shared viewport (`MarsViewport`, `StarfieldBackdrop`), HUD controls (`hud/`), USGS nomenclature place cards & cropped WMTS imagery (`Locations/`), shared location info panel (`location/`), and the **Olympus Mons / Olympus Rupes** color-coded crew camps & rehearsal logic (`Outposts/`).
- `apps/web/src/features/` — Isolated frontend product capabilities (`route-planner/` lateral bar, location search & map click picker; `routing/` safe-route API client, Cesium route/walkable-area overlay & HUD controls).
- `apps/api/` — FastAPI modular monolith (Python ≥ 3.12), organized by domain module under `app/modules/` (`routing/` for MOLA DEM safe pathfinding & walkable-area grids, `rover_images/` for the curated rover Street View panoramas, plus scaffolded `points/` and `weather/` modules).
- `docs/architecture.md` — Current repository boundaries and dependency direction.
- `docs/challenge.md` — Official NASA Space Apps challenge brief (*Interplanetary Survival Guide: Martian Map*).
- `docs/source_attributions.md` — Central log for citing all datasets, APIs, imagery, and open-source libraries used.

## Rules & Constraints for AI Agents
- **Track All Citations (`docs/source_attributions.md`):** Per NASA Space Apps legal rules, **every** NASA dataset, Mars Trek layer, planetary gazetteer/climatology product, API, and third-party open-source tool/library introduced into the project **must** be documented in `docs/source_attributions.md` (including share-alike attributions such as CC BY-SA 3.0 on the MRO MCS dust climatology grid).
- **NASA & JPL Media Policy Compliance:**
  - Include proper credit lines in the UI/docs (e.g., `"Courtesy NASA/JPL-Caltech"` plus specific mission/instrument/USGS credits where applicable).
  - Clearly label fictional rehearsal infrastructure (such as the **Olympus Rupes / Olympus Mons** crew camps) as **hypothetical** so they are never mistaken for real or official NASA facilities.
  - **Never** use official NASA logos (Meatball, Worm, Seal) or the JPL logo in the app UI or assets.
  - **Never** imply official endorsement by NASA, JPL, Caltech, or USGS.
- **Open-Source Dependencies Only:** Any third-party libraries, map engines, or datasets must use **OSI-approved open-source licenses** or be unrestricted public-domain/open data. Avoid locking core features behind proprietary SaaS tokens (keep `Cesium.Ion.defaultAccessToken = ''`).
- **Protect Architecture Decisions:** The backend framework is **FastAPI** (decided).
  Confirm the database, additional target regions, and other cross-cutting choices before
  implementation. Keep backend product behavior inside `apps/api/app/modules/<domain>`
  rather than creating separate deployable services, and never add a second frontend or
  backend app.
- **Verify Before Committing:** Run `./scripts/dev.sh check` (web lint + build, Ruff,
  pytest — the same checks CI runs) before committing.
