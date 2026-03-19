#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

FRONTEND_PID=""

cleanup() {
  if [[ -n "${FRONTEND_PID}" ]] && kill -0 "${FRONTEND_PID}" 2>/dev/null; then
    kill "${FRONTEND_PID}" 2>/dev/null || true
    wait "${FRONTEND_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

if [[ ! -d "$BACKEND_DIR" ]]; then
  echo "Backend directory not found: $BACKEND_DIR" >&2
  exit 1
fi

if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "Frontend directory not found: $FRONTEND_DIR" >&2
  exit 1
fi

if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  echo "Missing backend .env file. Copy backend/.env.example to backend/.env first." >&2
  exit 1
fi

if [[ ! -f "$FRONTEND_DIR/.env" ]]; then
  echo "Missing frontend .env file. Copy frontend/.env.example to frontend/.env first." >&2
  exit 1
fi

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "Missing frontend dependencies. Run 'cd frontend && npm install' first." >&2
  exit 1
fi

echo "Starting frontend on http://localhost:5173 ..."
(
  cd "$FRONTEND_DIR"
  npm run dev -- --host 0.0.0.0
) &
FRONTEND_PID=$!

sleep 2

echo "Starting backend on http://localhost:8000 ..."
cd "$BACKEND_DIR"

if [[ -x "$BACKEND_DIR/.venv/bin/python" ]]; then
  exec "$BACKEND_DIR/.venv/bin/python" -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
fi

exec uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
