# Red Condors API

FastAPI modular monolith for the Martian Map. Product capabilities live under
`app/modules/<domain>/`; shared transport and configuration live under `app/api/` and
`app/core/`. See [`docs/architecture.md`](../../docs/architecture.md) for the boundaries.

## Run it

The easiest way, from the repo root:

```bash
./scripts/dev.sh api      # sets up the venv if needed, then runs on http://localhost:8000
```

Manually, from `apps/api/`:

```bash
# bash / Git Bash / macOS / Linux
python -m venv .venv
source .venv/bin/activate          # Git Bash on Windows: source .venv/Scripts/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

```powershell
# PowerShell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

- Health check: <http://localhost:8000/api/health>
- Interactive docs (Swagger): <http://localhost:8000/api/docs>

Settings come from `RC_*` environment variables or a local `.env` file (see `.env.example`).

## Check it

```bash
ruff check .        # lint
pytest              # tests
```

## Add a domain module

1. Create `app/modules/<domain>/` with `__init__.py`, `router.py`, `schemas.py`, and `service.py`.
2. Keep `router.py` thin: it validates input, calls `service.py`, and returns a schema.
3. Register the router in `app/api/router.py`.
4. Add tests under `tests/unit/` (service logic) and `tests/integration/` (HTTP endpoints).
5. Log any new dataset or library in [`docs/source_attributions.md`](../../docs/source_attributions.md).
