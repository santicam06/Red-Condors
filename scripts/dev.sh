#!/usr/bin/env bash
# Red Condors — one command to set up, run and check the whole app.
#
#   ./scripts/dev.sh          Set up (if needed) and run web + API together
#   ./scripts/dev.sh setup    Install all dependencies (npm ci + Python venv)
#   ./scripts/dev.sh web      Run only the frontend   (http://localhost:5173)
#   ./scripts/dev.sh api      Run only the backend    (http://localhost:8000/api/docs)
#   ./scripts/dev.sh check    Run every check CI runs (lint, build, ruff, pytest)
#
# Works in Git Bash (Windows), macOS and Linux.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$ROOT/apps/api"
VENV="$API_DIR/.venv"
API_PORT="${API_PORT:-8000}"

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

check_node() {
  command -v node >/dev/null 2>&1 || fail "Node.js >= 22 is required (https://nodejs.org)."
  local major
  major="$(node -p 'process.versions.node.split(".")[0]')"
  [ "$major" -ge 22 ] || fail "Node.js >= 22 is required (found $(node --version))."
}

setup_web() {
  check_node
  info "Installing frontend dependencies (npm ci)..."
  (cd "$ROOT" && npm ci)
}

setup_api() {
  local py
  py="$(find_python)" || fail "Python >= 3.12 is required (https://www.python.org/downloads/)."
  if [ ! -d "$VENV" ]; then
    info "Creating Python virtual environment in apps/api/.venv..."
    "$py" -m venv "$VENV"
  fi
  info "Installing backend dependencies..."
  "$(venv_bin)/python" -m pip install --quiet --upgrade pip
  (cd "$API_DIR" && "$(venv_bin)/python" -m pip install --quiet -e ".[dev]")
}

setup() { setup_web; setup_api; info "Setup complete."; }

ensure_setup() {
  [ -d "$ROOT/node_modules" ] || setup_web
  [ -x "$(venv_bin)/python" ] || [ -x "$(venv_bin)/python.exe" ] || setup_api
}

run_web() { check_node; cd "$ROOT" && exec npm run dev; }

run_api() {
  cd "$API_DIR" && exec "$(venv_bin)/python" -m uvicorn app.main:app --reload --port "$API_PORT"
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
  ensure_setup
  info "Starting API on http://localhost:$API_PORT and web on http://localhost:5173 (Ctrl+C stops both)"
  ( run_api ) & API_PID=$!
  ( run_web ) & WEB_PID=$!
  trap stop_all INT TERM
  wait
}

check() {
  ensure_setup
  info "Web: lint";  (cd "$ROOT" && npm run lint)
  info "Web: build"; (cd "$ROOT" && npm run build)
  info "API: ruff";  (cd "$API_DIR" && "$(venv_bin)/python" -m ruff check .)
  info "API: tests"; (cd "$API_DIR" && "$(venv_bin)/python" -m pytest -q)
  info "All checks passed."
}

case "${1:-all}" in
  all)   run_all ;;
  setup) setup ;;
  web)   ensure_setup; run_web ;;
  api)   ensure_setup; run_api ;;
  check) check ;;
  *)     fail "Unknown command '$1'. Use: all | setup | web | api | check" ;;
esac
