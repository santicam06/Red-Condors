# Red Condors — Martian Map

[![Web lint](https://github.com/santicam06/Red-Condors/actions/workflows/lint.yml/badge.svg)](https://github.com/santicam06/Red-Condors/actions/workflows/lint.yml)

Red Condors is an independent NASA Space Apps hackathon prototype for the
**Interplanetary Survival Guide: Martian Map** challenge. It is intended to become
a mission-planning and rehearsal interface for Mars: a Mars Trek-inspired map that
combines planetary context, rover observations, environmental conditions, and
future EVA and rover route planning.

> **Project status:** The repository currently contains the structural baseline and
> an interactive web map. Route planning, surface imagery, environmental overlays,
> and mission workflows are planned capabilities, not yet complete.

## Why it is useful

The current web experience provides:

- A CesiumJS **3D globe** and **2D equirectangular map** of Mars.
- A NASA Mars Trek Viking global color mosaic streamed through the public WMTS
  service.
- Toggleable Mars nomenclature labels from a cached GeoJSON snapshot.
- Cursor latitude/longitude readout and Mars Trek-inspired navigation controls.
- An approximate **Perseverance MEDA** point in Jezero Crater with historical
  weather dataset summary information.
- A foundation for feature-isolated rover imagery, weather, outpost, routing, and
  scientific mission modules.

The application does not use a Cesium Ion token or proprietary map service.

## Getting started

### Prerequisites

- Node.js 22 or newer
- npm 10 or newer

### Install and run the web app

From the repository root:

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. The default development server is normally
available at `http://localhost:5173`.

### Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Type-check and create a production build. |
| `npm run preview` | Preview the production build locally. |
| `npm run lint` | Run ESLint with warnings treated as errors. |
| `npm run fetch:nomenclature` | Refresh the cached Mars nomenclature GeoJSON. |

The commands above are workspace scripts defined in the root
[package.json](./package.json). The frontend package is located in
[apps/web/](./apps/web/).

### Using the map

1. Start the development server.
2. Use the **3D / 2D** control to switch between globe and map views.
3. Use the zoom controls or mouse navigation to explore Mars.
4. Toggle **Nomenclature** to show or hide Mars feature labels.
5. Select the Perseverance MEDA point to inspect the historical dataset snapshot.

The displayed MEDA coordinate is explicitly approximate, and the weather values
are historical research data rather than live conditions.

## Repository structure

```text
apps/
├── web/                  React + TypeScript + Vite + CesiumJS frontend
│   ├── src/components/   Shared viewport and HUD components
│   ├── src/core/         Dataset-agnostic Cesium map engine
│   └── src/features/     Isolated product capabilities
└── api/                  Reserved Python modular-monolith boundary
    ├── app/api/          Shared HTTP transport
    ├── app/core/         Shared configuration and infrastructure
    └── app/modules/      Domain modules
docs/
├── architecture.md       Current boundaries and dependency direction
├── challenge.md          NASA Space Apps challenge brief
└── source_attributions.md Dataset, service, and dependency credits
```

The API boundary is reserved for future dataset access, validation, calculations,
pagination, and provenance. It currently has no backend runtime or database.

## Data, attribution, and policy

This project is independent and is **not endorsed by, affiliated with, or an
official product of NASA, JPL, Caltech, or USGS**. It does not use official NASA
or JPL logos.

The map uses NASA Mars Trek services and open planetary science data. The full
list of datasets, services, credits, licenses, and third-party dependencies is
maintained in [docs/source_attributions.md](./docs/source_attributions.md).
Please update that document whenever a new dataset, API, imagery source, or
library is introduced.

## Contributing

Team Red Condors maintains this project for the NASA Space Apps hackathon.
Contributions are welcome through focused pull requests that preserve the
frontend/API boundaries and document new data sources. Before opening a pull
request:

```bash
npm run lint
npm run build
```

For architectural decisions, read [docs/architecture.md](./docs/architecture.md)
and [AGENTS.md](./AGENTS.md). For challenge scope and mission context, see
[docs/challenge.md](./docs/challenge.md).

## Help and project resources

- [Architecture](./docs/architecture.md)
- [Challenge brief](./docs/challenge.md)
- [Source attributions](./docs/source_attributions.md)
- [API boundary notes](./apps/api/README.md)
- [GitHub Issues](https://github.com/santicam06/Red-Condors/issues) for bugs,
  questions, and feature proposals

