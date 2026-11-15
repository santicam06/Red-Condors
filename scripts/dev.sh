#!/usr/bin/env bash
# Red Condors — one command to set up, run and check the whole app.
#
#   ./scripts/dev.sh          Update dependencies if needed, then run web + API together
#   ./scripts/dev.sh setup    Force a clean reinstall of all dependencies
#   ./scripts/dev.sh web      Run only the frontend   (http://localhost:5173)
#   ./scripts/dev.sh api      Run only the backend    (http://localhost:8000/api/docs)
#   ./scripts/dev.sh check    Run every check CI runs (lint, build, ruff, pytest)
#   ./scripts/dev.sh lock     Re-pin exact backend versions after editing apps/api/pyproject.toml
#
# Every command first makes sure dependencies match the committed files, so after a
# `git pull` you never need a manual install step:
#   - frontend: package-lock.json (exact versions, installed with `npm ci`)
#   - backend:  apps/api/pyproject.toml + apps/api/requirements.lock (exact versions)
# A fingerprint of those files is stored after each successful install; when it no
# longer matches (someone added or upgraded a package), the install runs again.
#
# Works in Git Bash (Windows), macOS and Linux.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$ROOT/apps/api"
VENV="$API_DIR/.venv"
API_LOCK="$API_DIR/requirements.lock"
API_PORT="${API_PORT:-8000}"
STAMP_NAME=".red-condors-deps"

info() { printf '\033[1;34m[dev]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[dev] %s\033[0m\n' "$*" >&2; exit 1; }

find_python() {
  for candidate in python3 python py; do
    if command -v "$candidate" >/dev/null 2>&1 &&
       "$candidate" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)' 2>/dev/null; then
      echo "$candidate"; return 0
    fi
  done
  return 1
}

venv_bin() {
  if [ -d "$VENV/Scripts" ]; then echo "$VENV/Scripts"; else echo "$VENV/bin"; fi
}

venv_python() { echo "$(venv_bin)/python"; }

# True when the venv exists and its interpreter runs and is new enough.
venv_ok() {
  "$(venv_python)" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)' \
    >/dev/null 2>&1
}

check_node() {
  command -v node >/dev/null 2>&1 || fail "Node.js >= 22 is required (https://nodejs.org)."
  local major
  major="$(node -p 'process.versions.node.split(".")[0]')"
  [ "$major" -ge 22 ] || fail "Node.js >= 22 is required (found $(node --version))."
}

# Fingerprint of dependency files (git is always available in a clone; same result on every OS).
deps_hash() {
  local files=()
  for f in "$@"; do [ -f "$ROOT/$f" ] && files+=("$f"); done
  (cd "$ROOT" && git hash-object -- "${files[@]}" | tr -d '\r' | tr '\n' ' ')
}

web_hash() { deps_hash package-lock.json package.json apps/web/package.json; }

api_hash() {
  printf '%s%s' "$(deps_hash apps/api/pyproject.toml apps/api/requirements.lock)" \
    "$("$(venv_python)" -c 'import sys; print(sys.version.split()[0])' 2>/dev/null)"
}

stamp_matches() { [ -f "$1" ] && [ "$(cat "$1")" = "$2" ]; }

# --- Frontend -----------------------------------------------------------------------------

# Clean install of the exact versions in package-lock.json (deletes node_modules first).
install_web_clean() {
  info "$1 — installing frontend dependencies (npm ci)..."
  (cd "$ROOT" && npm ci) ||
    fail "npm ci failed. Stop any running dev server or editor using node_modules and run this again."
  web_hash > "$ROOT/node_modules/$STAMP_NAME"
}

# Brings an existing node_modules to the exact locked versions, touching only packages that
# changed, so a dev server or editor that is still open does not block it (Windows file locks).
install_web_update() {
  info "$1 — updating frontend dependencies..."
  (cd "$ROOT" && npm install --no-save --no-audit --no-fund) ||
    fail "npm install failed. Stop any running dev server using node_modules, then run: ./scripts/dev.sh setup"
  web_hash > "$ROOT/node_modules/$STAMP_NAME"
}

ensure_web() {
  check_node
  if [ ! -d "$ROOT/node_modules" ]; then
    install_web_clean "node_modules is missing"
  elif ! stamp_matches "$ROOT/node_modules/$STAMP_NAME" "$(web_hash)"; then
    install_web_update "Frontend dependencies changed (package-lock.json)"
  fi
}

# --- Backend ------------------------------------------------------------------------------

install_api() {
  info "$1 — installing backend dependencies..."
  local constraints=()
  [ -f "$API_LOCK" ] && constraints=(-c "$API_LOCK")
  "$(venv_python)" -m pip install --quiet --upgrade pip
  (cd "$API_DIR" && "$(venv_python)" -m pip install --quiet -e ".[dev]" ${constraints[@]+"${constraints[@]}"}) ||
    fail "Backend install failed (see the pip output above)."
  api_hash > "$VENV/$STAMP_NAME"
}

ensure_api() {
  if ! venv_ok; then
    local py
    py="$(find_python)" || fail "Python >= 3.12 is required (https://www.python.org/downloads/)."
    if [ -d "$VENV" ]; then
      info "apps/api/.venv is broken or uses an old Python — recreating it..."
      rm -rf "$VENV"
    else
      info "Creating Python virtual environment in apps/api/.venv..."
    fi
    "$py" -m venv "$VENV"
    install_api "New virtual environment"
  elif ! stamp_matches "$VENV/$STAMP_NAME" "$(api_hash)"; then
    install_api "Backend dependencies changed (apps/api/pyproject.toml / requirements.lock)"
  fi
}

# --- Commands -----------------------------------------------------------------------------

setup() {
  check_node
  install_web_clean "Clean reinstall requested"
  rm -f "$VENV/$STAMP_NAME"
  ensure_api
  info "Setup complete."
}

lock() {
  ensure_api
  info "Pinning exact backend versions in apps/api/requirements.lock..."
  (cd "$API_DIR" && "$(venv_python)" -m pip install --quiet -e ".[dev]")
  {
    echo "# Exact backend versions used by everyone (installed by scripts/dev.sh as pip constraints)."
    echo "# Do not edit by hand. After changing apps/api/pyproject.toml run: ./scripts/dev.sh lock"
    echo "# Generated with Python $("$(venv_python)" -c 'import sys; print(sys.version.split()[0])')."
    "$(venv_python)" -m pip freeze --exclude-editable | tr -d '\r'
  } > "$API_LOCK"
  api_hash > "$VENV/$STAMP_NAME"
  info "Updated apps/api/requirements.lock — commit it together with pyproject.toml."
}

run_web() { cd "$ROOT" && exec npm run dev; }

run_api() {
  cd "$API_DIR" && exec "$(venv_python)" -m uvicorn app.main:app --reload --port "$API_PORT"
}

# Stop a background job and all of its children (uvicorn's reload worker, Vite, ...).
kill_tree() {
  local pid="$1"
  [ -n "$pid" ] || return 0
  if [ -r "/proc/$pid/winpid" ] && command -v taskkill >/dev/null 2>&1; then
    taskkill //F //T //PID "$(cat "/proc/$pid/winpid")" >/dev/null 2>&1 || true  # Git Bash
  else
    kill "$pid" 2>/dev/null || true  # macOS / Linux: servers shut down their own children
  fi
}

API_PID=""
WEB_PID=""
stop_all() {
  trap - INT TERM
  info "Stopping..."
  kill_tree "$API_PID"
  kill_tree "$WEB_PID"
  wait 2>/dev/null || true
  exit 0
}

run_all() {
  ensure_web
  ensure_api
  info "Starting API on http://localhost:$API_PORT and web on http://localhost:5173 (Ctrl+C stops both)"
  ( run_api ) & API_PID=$!
  ( run_web ) & WEB_PID=$!
  trap stop_all INT TERM
  wait
}

check() {
  ensure_web
  ensure_api
  info "Web: lint";  (cd "$ROOT" && npm run lint)
  info "Web: build"; (cd "$ROOT" && npm run build)
  info "API: ruff";  (cd "$API_DIR" && "$(venv_python)" -m ruff check .)
  info "API: tests"; (cd "$API_DIR" && "$(venv_python)" -m pytest -q)
  info "All checks passed."
}

case "${1:-all}" in
  all)   run_all ;;
  setup) setup ;;
  web)   ensure_web; run_web ;;
  api)   ensure_api; run_api ;;
  check) check ;;
  lock)  lock ;;
  *)     fail "Unknown command '$1'. Use: all | setup | web | api | check | lock" ;;
esac
