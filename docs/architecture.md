# Project architecture

Red Condors uses a monorepo with a React web application and a Python modular monolith.

```text
apps/
├── web/                       React, TypeScript, Vite, and CesiumJS
│   └── src/
│       ├── components/        Shared presentation and HUD components
│       ├── config/            Planetary and map configuration
│       ├── core/              Generic Cesium map engine
│       ├── features/          Isolated product capabilities
│       └── store/             Shared map-only state
└── api/                       Python modular monolith
    ├── app/
    │   ├── api/               Shared HTTP transport
    │   ├── core/              Shared configuration and infrastructure
    │   └── modules/           Independently owned domain modules
    └── tests/
        ├── unit/
        └── integration/
```

## Boundaries

- `apps/web` owns rendering, interaction, charts, and calls to the API.
- `apps/api` will own dataset access, validation, calculations, pagination, and provenance.
- Backend product behavior is organized by domain under `app/modules`; it remains one
  deployable application and one process.
- `src/core` remains dataset-agnostic. Feature-specific map adapters belong under
  `src/features/<feature>/map`.
- Large downloaded datasets, generated build output, and dependency folders are not committed.

No database, background worker, dataset integration, or API implementation is selected by this
structural baseline.
