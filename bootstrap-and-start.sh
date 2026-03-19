#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

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

echo "Installing backend dependencies ..."
(
  cd "$BACKEND_DIR"
  uv sync
)

echo "Installing frontend dependencies ..."
(
  cd "$FRONTEND_DIR"
  npm install
)

exec "$ROOT_DIR/start-local.sh"
