# Red Condors — Martian Map

[![CI](https://github.com/santicam06/Red-Condors/actions/workflows/lint.yml/badge.svg)](https://github.com/santicam06/Red-Condors/actions/workflows/lint.yml)

A "Google Earth for Mars" mission-planning and rehearsal tool built by **Team Red Condors** for the
**NASA Space Apps Challenge — Toronto (November 14–15, 2026)**, challenge
**"Interplanetary Survival Guide: Martian Map"** ([brief](docs/challenge.md)). It combines a
Mars Trek-inspired map with rover observations, environmental conditions, and future EVA and rover
route planning.

> **Disclaimer:** This is an independent hackathon prototype. It is **not** endorsed by,
> affiliated with, or an official product of NASA, JPL, Caltech, or USGS. No official NASA or JPL
> logos are used.

> **Project status:** The repo currently contains the structural baseline, an interactive web map,
> and a minimal FastAPI backend. Route planning, surface imagery, environmental overlays, and
> mission workflows are planned and not yet complete.

## Features

| # | Feature | Status |
| :-: | :--- | :--- |
| 1 | 3D globe & 2D map of Mars with Mars Trek imagery, nomenclature labels, coordinate readout, zoom | ✅ Implemented |
| 2 | Martian "Street View": rover surface imagery as clickable dots | 🛠 Planned |
| 3 | Outpost locations & EVA / rover route rehearsals (distance, ETA) | 🟡 Started: hypothetical Olympus Mons crew sites, plus the route bar |
| 4 | Climate & environmental tracking with dynamic rerouting | 🟡 Started: Olympus dust-season rehearsal reroutes a traverse |
| 5 | Topography-aware safe routing (craters, slopes, ridges) | 🟡 Started: Olympus routes avoid steep MOLA slopes |
| 6 | Scientific research missions at waypoints | 🛠 Planned |

The full product vision is in [`AGENTS.md`](AGENTS.md).

## Tech stack

| Part | Stack |
| :--- | :--- |
| Frontend (`apps/web`) | React 19, TypeScript, Vite, CesiumJS (no Ion token), Zustand, Tailwind CSS |
| Backend (`apps/api`) | Python ≥ 3.12, FastAPI, Uvicorn, Pydantic, pytest, Ruff |
| Database | TBD |
| CI | GitHub Actions: web lint, plus API lint and tests |

No API keys or paid services are required to run the app.

## Repository structure

```text
apps/
├── web/                     Frontend: the one and only web app
│   ├── src/components/      Shared viewport and HUD components
│   ├── src/core/            Dataset-agnostic Cesium map engine
│   └── src/features/        Isolated product capabilities (route planner)
└── api/                     Backend: the one and only API (FastAPI modular monolith)
    └── app/modules/<domain>/  points, rover_images, weather, ...
docs/
├── architecture.md          Boundaries and dependency direction
├── challenge.md             NASA Space Apps challenge brief
└── source_attributions.md   Dataset, service, and dependency credits
scripts/dev.sh               One command to set up, run, and check everything
```

## Prerequisites

- **Node.js ≥ 22** (with npm ≥ 10): <https://nodejs.org>
- **Python ≥ 3.12**: <https://www.python.org/downloads/>
- **Bash**, needed only for `scripts/dev.sh`. It ships with macOS and Linux; on Windows use
  **Git Bash**, which comes with Git for Windows.

## How to run

### Option A: everything with one command (recommended)

```bash
./scripts/dev.sh          # installs what's missing, then runs web + API. Ctrl+C stops both.
```

| Command | What it does |
| :--- | :--- |
| `./scripts/dev.sh` | Set up if needed, then run frontend and backend together |
| `./scripts/dev.sh setup` | (Re)install all dependencies: `npm ci` plus the Python venv. Run this after pulling. |
| `./scripts/dev.sh web` | Run only the frontend |
| `./scripts/dev.sh api` | Run only the backend |
| `./scripts/dev.sh check` | Run every check CI runs (web lint and build, Ruff, pytest) |

`npm run dev:all` is an alias for `./scripts/dev.sh`.

### Option B: frontend only

```bash
npm ci        # from the repo root; re-run after pulling if package-lock.json changed
npm run dev   # http://localhost:5173
```

The map works without the backend. Any `/api` calls fail until the API is running.

### Option C: backend only

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate            # Git Bash on Windows: source .venv/Scripts/activate
                                     # PowerShell:          .venv\Scripts\Activate.ps1
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

More details are in [`apps/api/README.md`](apps/api/README.md).

### Database

Not chosen yet. When the team picks one, its setup (for example a `docker compose` service) will
be documented here and added to `scripts/dev.sh`.

### URLs

| URL | What |
| :--- | :--- |
| <http://localhost:5173> | The web app |
| <http://localhost:8000/api/health> | API health check |
| <http://localhost:8000/api/docs> | Interactive API docs (Swagger) |

The frontend calls the API through relative `/api/...` URLs. In development, Vite proxies them to
port 8000, so no CORS setup is needed.

### Other scripts

| Command | What |
| :--- | :--- |
| `npm run build` | Type-check and build the frontend into `apps/web/dist` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Lint the frontend (ESLint, warnings treated as errors) |
| `npm run fetch:nomenclature` | Refresh `apps/web/public/data/mars_nomenclature.geojson` from Mars Trek |

## Using the map

1. Start the app (Option A or B) and open <http://localhost:5173>.
2. Use the **3D / 2D** control to switch between the globe and the flat map.
3. Use the zoom buttons or the mouse (drag to pan, scroll to zoom) to explore Mars.
4. Toggle **Nomenclature** to show or hide Mars feature labels.
5. Hover a feature name to enlarge it and turn it blue. Click the name to open its location card.
6. Use the route bar to pick a source and destination, or the Olympus Mons panel to rehearse a
   slope- and dust-aware traverse. The Olympus crew sites are hypothetical.

## Contributing

1. Work on a branch named after the change (for example `feat/rover-street-view`) and open a PR
   into `main`.
2. Run `./scripts/dev.sh check` before pushing. CI runs the same checks.
3. Put frontend features in `apps/web/src/features/<feature>/`.
4. Put backend features in `apps/api/app/modules/<domain>/` (`router.py`, `schemas.py`,
   `service.py`).
5. Never add a second frontend or backend app.
6. Log **every** new dataset, API, imagery source, or library in
   [`docs/source_attributions.md`](docs/source_attributions.md). This is required by the Space Apps rules.

For architectural decisions, read [`docs/architecture.md`](docs/architecture.md) and
[`AGENTS.md`](AGENTS.md).

## Data & credits

Mars imagery and nomenclature: Courtesy NASA/JPL-Caltech/USGS, via
[NASA Mars Trek](https://trek.nasa.gov/mars/). Olympus routes also use MOLA topography and a
published MRO dust climatology. The full list of sources and open-source
licenses is in [`docs/source_attributions.md`](docs/source_attributions.md).

## Help and project resources

- [Architecture](docs/architecture.md)
- [Challenge brief](docs/challenge.md)
- [Source attributions](docs/source_attributions.md)
- [API notes](apps/api/README.md)
- [GitHub Issues](https://github.com/santicam06/Red-Condors/issues) for bugs, questions, and
  feature proposals

## Team

Team Red Condors. 

- Santiago Camacho Moyano (Team Lead - AI Developer)
- Fabricio Alejandro Ortiz Fiallos (Front-end Developer)
- Samuel Esteban Pineda Benavides (Back-end Developer)
- Miguel Rincon (Full-Stack Developer)

## License

TBD.
