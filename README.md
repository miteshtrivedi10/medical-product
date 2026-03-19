# Medical Product MVP

This repository is split into two top-level applications:

- `backend/` contains the FastAPI API and in-memory data store.
- `frontend/` contains the React + Vite client.

## Project Structure

```text
medical-product/
├── backend/
│   ├── app/
│   ├── main.py
│   ├── pyproject.toml
│   └── README.md
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── bootstrap-and-start.sh
└── start-local.sh
```

## Quick Start

1. Prepare backend config:

   ```bash
   cp backend/.env.example backend/.env
   ```

2. Prepare frontend config:

   ```bash
   cp frontend/.env.example frontend/.env
   ```

3. Install and start everything from the repository root:

   ```bash
   ./bootstrap-and-start.sh
   ```

If dependencies are already installed, start both services with:

```bash
./start-local.sh
```

The frontend runs on `http://localhost:5173` and the backend runs on `http://localhost:8000`.

## Manual Startup

Backend:

```bash
cd backend
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0
```

See `backend/README.md` for backend-specific notes and demo credentials.
