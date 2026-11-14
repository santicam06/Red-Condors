# AGENTS.md — Red Condors (Martian Map)

## Project Context
This repository contains **Red Condors'** project for the **NASA Space Apps Hackathon in Toronto (November 14–15)**, tackling the challenge **"Interplanetary Survival Guide: Martian Map"** (see `docs/challenge.md`).

> **Current Stage — Structural Baseline:**
> The repository is a monorepo with exactly **one frontend** (React + Vite + TypeScript +
> CesiumJS in `apps/web`) and exactly **one backend** (**FastAPI** modular monolith in
> `apps/api`). The frontend reaches the backend through relative `/api/*` URLs (proxied by
> Vite in development). The target region, database, and specific scientific mission
> scenarios remain TBD.

## Vision
We are building a **"Google Earth for Mars"** style interactive mission-planning and rehearsal application that bridges global/regional planetary maps with hyperlocalized astronaut surface operations (Marswalks / EVAs and rover traverses).

## Core Product Features

1. **3D Globe & 2D Map Views of Mars (Mars Trek Fidelity)**
   - Provide both an interactive **3D Globe** and a **2D Map** view of Mars.
   - Reuse map layers and imagery from **NASA's Mars Trek (`trek.nasa.gov/mars/`)** via its public WMTS tile services so our maps look and feel as close to Mars Trek as possible.
   - *Scope note for now:* Ignore 3D elevation/relief mesh details initially (draping Mars Trek imagery over a smooth Martian sphere/2D map is sufficient for the initial baseline).

2. **Martian "Street View" Mode (Rover Surface Imagery)**
   - Emulate the **Google Street View** "pegman / stickman" experience adapted for Mars.
   - Because rover imagery consists of discrete capture points rather than continuous road coverage, display available rover surface photos / 360° panoramas as **interactive dots on the map** (similar to static 360° user photo spheres on Google Maps).
   - Dropping the stickman onto (or clicking) a dot opens a ground-level view of the real imagery captured by NASA rovers at that location.

3. **Outpost Locations & Displacement Rehearsals (Route Planning)**
   - Focus on a dedicated **Area of Interest** on Mars *(exact region TBD)*.
   - Populate the region with hypothetical human-mission infrastructure distributed at realistic distances (e.g., NASA habitats, science modules, base camps, and waypoints such as Point A → Point B → Point C).
   - Allow users to rehearse crew displacements—both **astronaut Marswalks (EVAs)** and **rover transport**—calculating operational metrics including **distance** and **ETA**.

4. **Climate & Environmental Condition Tracking (Dynamic Rerouting)**
   - Track environmental/climate conditions within the chosen Area of Interest.
   - Conditions may combine **real NASA Mars datasets** (e.g., thermal, dust, atmospheric, or space-weather/radiation data) and **simulated scenarios** designed for rehearsal training.
   - Inclement or hazardous conditions (e.g., local dust storms, extreme temperatures, radiation spikes) should impact traversal rehearsals, such as triggering warnings or **rerouting paths**.

5. **Topography-Aware Safe Routing**
   - Displacement routes must account for Martian topography—such as **craters, steep slopes, ridges, and mountains**—actively avoiding terrain hazards so the crew arrives **safely** at each destination.

6. **Scientific Research Missions at Waypoints**
   - Assign theoretical crew objectives to complete at each location of interest *(exact missions TBD)*.
   - Every mission objective must be grounded in **real Martian scientific research** (e.g., geological sampling, mineral/spectral investigation, subsurface water-ice search, or astrobiology).

## Repository Structure (Current)
- `README.md` — Team-facing overview and how to run the app.
- `AGENTS.md` — Project context and guidelines for AI coding agents.
- `scripts/dev.sh` — Single entry point to set up, run, and check the whole app.
- `apps/web/` — React, TypeScript, Vite, and CesiumJS frontend.
- `apps/web/src/features/` — Isolated frontend product capabilities.
- `apps/api/` — FastAPI modular monolith (Python ≥ 3.12), organized by domain module under `app/modules/`.
- `docs/architecture.md` — Current repository boundaries and dependency direction.
- `docs/challenge.md` — Official NASA Space Apps challenge brief (*Interplanetary Survival Guide: Martian Map*).
- `docs/source_attributions.md` — Central log for citing all datasets, APIs, imagery, and open-source libraries used.

## Rules & Constraints for AI Agents
- **Track All Citations (`docs/source_attributions.md`):** Per NASA Space Apps legal rules, **every** NASA dataset, Mars Trek layer, API, and third-party open-source tool/library introduced into the project **must** be documented in `docs/source_attributions.md`.
- **NASA & JPL Media Policy Compliance:**
  - Include proper credit lines in the UI/docs (e.g., `"Courtesy NASA/JPL-Caltech"` plus specific mission/instrument credits where applicable).
  - **Never** use official NASA logos (Meatball, Worm, Seal) or the JPL logo in the app UI or assets.
  - **Never** imply official endorsement by NASA, JPL, or Caltech.
- **Open-Source Dependencies Only:** Any third-party libraries, map engines, or datasets must use **OSI-approved open-source licenses** or be unrestricted public-domain/open data. Avoid locking core features behind proprietary SaaS tokens.
- **Protect Architecture Decisions:** The backend framework is **FastAPI** (decided).
  Confirm the database, target region, and other cross-cutting choices before
  implementation. Keep backend product behavior inside `apps/api/app/modules/<domain>`
  rather than creating separate deployable services, and never add a second frontend or
  backend app.
- **Verify Before Committing:** Run `./scripts/dev.sh check` (web lint + build, Ruff,
  pytest — the same checks CI runs) before committing.
