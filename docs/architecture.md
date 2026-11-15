# Project architecture

Red Condors is a monorepo with exactly **one frontend** (React web app) and exactly **one
backend** (FastAPI modular monolith).

```text
apps/
├── web/                       React, TypeScript, Vite, and CesiumJS
│   └── src/
│       ├── components/        Shared presentation and HUD components
│       ├── config/            Planetary and map configuration
│       ├── core/              Generic Cesium map engine
│       ├── features/          Map layers, route planner, energy path, safe-route overlay
│       └── store/             Shared map-only state
└── api/                       FastAPI modular monolith (Python ≥ 3.12)
    ├── pyproject.toml         Dependencies, Ruff and pytest configuration
    ├── app/
    │   ├── main.py            create_app(): builds the FastAPI application
    │   ├── api/               Shared HTTP transport (router aggregation, /health)
    │   ├── core/              Shared configuration (RC_* settings) and infrastructure
    │   └── modules/           Independently owned domain modules
    │       ├── routing/       MOLA DEM safe pathfinding. The traversable-area overlay is not shown.
    │       ├── points/        Outposts and waypoints (scaffolded)
    │       ├── rover_images/  Rover surface imagery ("street view", scaffolded)
    │       └── weather/       Scaffolded. Dust is not drawn and does not change a route.
    └── tests/
        ├── unit/
        └── integration/
scripts/dev.sh                 Set up, run, and check everything with one command
```

## Boundaries

- `apps/web` owns rendering, interaction, charts, and calls to the API.
- `apps/api` owns dataset access, validation, calculations, pagination, and provenance.
- Backend product behavior is organized by domain under `app/modules`; it remains one
  deployable application and one process.
- `src/core` remains dataset-agnostic. Feature-specific map adapters belong under
  `src/features/<feature>/map`.
- Large downloaded datasets, generated build output, and dependency folders are not committed.

## Backend module pattern

Each domain module under `apps/api/app/modules/<domain>/` follows the same shape:

| File | Responsibility |
| :--- | :--- |
| `router.py` | FastAPI `APIRouter` with the module's endpoints (thin: parse input, call service, return schema). |
| `schemas.py` | Pydantic request/response models. |
| `service.py` | Domain logic, calculations, and dataset access. |

Dependency direction: `app/api/router.py` → `app/modules/<domain>` → `app/core`. Modules never
import each other; shared code moves to `app/core`. New modules are registered in
`app/api/router.py`.

## Frontend ↔ backend

- All API routes live under `/api` (e.g. `GET /api/health`). Interactive docs: `/api/docs`.
- The frontend always calls **relative** URLs (`fetch('/api/...')`). In development, Vite
  proxies `/api` to `http://127.0.0.1:8000` (override with the `API_URL` env var), so no CORS
  configuration is needed.

No database is selected yet. The web app reads a local Olympus MOLA window for the
best-direction search. `POST /api/routes` reads a local MOLA GeoTIFF when that file
is present and returns 503 when it is not.
