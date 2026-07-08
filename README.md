# Medical Product MVP

A minimal viable product (MVP) for a **home-health clinical prep assistant**. It pairs a
FastAPI backend with a React + Vite frontend so clinicians can review a patient's medical
history, read and write encounter transcripts, and get a short AI-generated visit summary
before walking into an appointment.

The repository is split into two top-level applications:

- `backend/` — FastAPI API with **in-memory** storage (no database).
- `frontend/` — React client served by Vite on a separate port.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Manual Startup](#manual-startup)
- [Demo Login Accounts](#demo-login-accounts)
- [How It Works](#how-it-works)
  - [Data Model](#data-model)
  - [API Reference](#api-reference)
  - [Authentication](#authentication)
  - [Optimistic Concurrency](#optimistic-concurrency)
  - [Presence / Active Editors](#presence--active-editors)
  - [AI Summary Generation](#ai-summary-generation)
- [AI Configuration](#ai-configuration)
- [MVP Notes & Limitations](#mvp-notes--limitations)
- [Environment Variables](#environment-variables)

---

## Project Structure

```text
medical-product/
├── backend/
│   ├── app/
│   │   └── services/
│   │       ├── ai_provider.py      # LLM clients (OpenAI / Anthropic)
│   │       ├── auth_service.py     # login + token session resolution
│   │       ├── patient_service.py  # CRUD, versioning, presence
│   │       └── summary_service.py  # background summary generation loop
│   │   ├── config.py               # settings loaded from .env
│   │   ├── models.py               # dataclasses + Pydantic response models
│   │   └── store.py                # thread-safe in-memory store + seed data
│   ├── main.py                     # FastAPI app and route definitions
│   ├── pyproject.toml
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/             # UI screens (Login, PatientList, PatientDetail, ...)
│   │   ├── hooks/                  # data + presence orchestration hooks
│   │   ├── ui/                     # primitive UI elements (Button, Card, Input, ...)
│   │   ├── api.js                  # fetch wrapper around the backend API
│   │   └── App.jsx                 # top-level router (login vs. workspace)
│   ├── package.json
│   └── vite.config.js
├── bootstrap-and-start.sh          # install deps (backend + frontend) then start
└── start-local.sh                  # start both servers (deps assumed installed)
```

---

## Quick Start

1. Prepare backend config:

   ```bash
   cp backend/.env.example backend/.env
   ```

2. Prepare frontend config:

   ```bash
   cp frontend/.env.example frontend/.env
   ```

3. Install dependencies for both apps and start everything from the repository root:

   ```bash
   ./bootstrap-and-start.sh
   ```

If dependencies are already installed, start both services with:

```bash
./start-local.sh
```

The frontend runs on `http://localhost:5173` and the backend runs on `http://localhost:8000`.

---

## Manual Startup

Backend (from `backend/`):

```bash
cp .env.example .env
uv sync
./.venv/bin/python -m uvicorn main:app --reload --port 8000
```

Frontend (from `frontend/`):

```bash
cp .env.example .env
npm install
npm run dev
```

CORS is configured to allow the frontend origin (`http://localhost:5173` by default,
override with `FRONTEND_ORIGIN`).

---

## Demo Login Accounts

Authentication uses hardcoded accounts (see `backend/app/store.py`). Use any of these:

| Username      | Password    | Display name |
|---------------|-------------|--------------|
| `ava.clark`   | `Aster@101` | Ava Clark    |
| `nolan.reed`  | `Harbor@202`| Nolan Reed   |
| `priya.shah`  | `Cedar@303` | Priya Shah   |
| `marco.ellis` | `Pine@404`  | Marco Ellis  |
| `dana.cho`    | `River@505` | Dana Cho     |

The seed data also includes two patients (`patient-1`, `patient-2`), each with a medical
history and one encounter transcript, so the UI is populated on first run.

---

## How It Works

### Data Model

Defined in `backend/app/models.py` and persisted in `backend/app/store.py` (in memory):

- **User** — `id`, `username`, `password`, `display_name`.
- **Patient** — `id`, `full_name`, `dob`.
- **MedicalHistory** — one per patient (`patient_id`, `text`, `version`, `updated_at`, `updated_by`).
- **Encounter** — many per patient (`id`, `patient_id`, `title`, `text`, `version`, `created_at`, `updated_at`, `updated_by`).
- **Summary** — one per patient (`status`, `patient_status_summary`, `watch_items`, `next_encounter_focus`, `generated_at`, `input_hash`, `last_error`).
- **Presence** — per-patient map of `user_id -> last_seen_at` for active-editor tracking.

All writes are guarded by a single `threading.RLock` on the store.

### API Reference

All routes require a `Bearer <token>` header (returned by login) and are mounted under `/api`.

| Method | Path                                      | Description                                            |
|--------|-------------------------------------------|--------------------------------------------------------|
| GET    | `/api/health`                             | Liveness check (`{"status": "ok"}`).                   |
| POST   | `/api/auth/login`                         | Exchange username/password for a token.                |
| GET    | `/api/me`                                 | Return the current authenticated user.                 |
| GET    | `/api/patients`                           | List patients (summary status + active editors).       |
| GET    | `/api/patients/{patient_id}`              | Full patient detail (history, encounters, summary).    |
| PUT    | `/api/patients/{patient_id}/medical-history` | Save medical history (optimistic-concurrency).     |
| POST   | `/api/patients/{patient_id}/encounters`   | Create a new encounter.                                |
| GET    | `/api/encounters/{encounter_id}`          | Load a single encounter transcript.                    |
| PUT    | `/api/encounters/{encounter_id}`          | Save an encounter (optimistic-concurrency).            |
| POST   | `/api/presence`                           | Send a presence heartbeat for a patient.               |

The frontend client wrapper lives in `frontend/src/api.js`.

### Authentication

`auth_service.login` verifies the password against the in-memory users and returns a random
UUID token, stored in `store.sessions`. `get_current_user` resolves that token from the
`Authorization: Bearer ...` header on every protected route. Sessions are not expired on a
timer — they live for the lifetime of the process.

### Optimistic Concurrency

Medical history and encounter edits carry an `expected_version`. The service rejects a save
with HTTP **409 Conflict** (a `VersionConflictError` translated by the handler in `main.py`)
when the stored version no longer matches, returning the current text/version/editor so the
client can surface an "active editor changed this" warning instead of silently overwriting.
No-op saves (identical text) skip the version bump.

### Presence / Active Editors

The frontend sends a heartbeat to `POST /api/presence` on an interval while a patient is
open. The store records `last_seen_at` per user; entries older than `PRESENCE_TTL_SECONDS`
(default 15s) are considered stale and dropped. Patient list/detail responses include
`active_editors` (everyone currently present except the requesting user), which the UI shows
as a "X is also viewing this patient" warning.

### AI Summary Generation

Saving a medical history or encounter calls `summary_service.schedule_generation`. The service:

- Skips regeneration when the inputs are unchanged (compared via a SHA-256 `input_hash` of
  history + latest encounter text).
- Coalesces concurrent requests into a single background worker thread per patient.
- Runs a loop that re-snapshots inputs and regenerates until they stabilize.
- Falls back to a placeholder summary when no encounter transcript exists yet.
- On `AIProviderError`, marks the summary `failed` and stores `last_error`. The UI shows:
  *"It seems we're encountering difficulty in our AI engine."*

The latest completed summary stays visible while a new one is generating.

---

## AI Configuration

Backend `.env` fields (defaults in `backend/app/config.py`):

```env
AI_PROVIDER=openai
AI_REQUEST_TIMEOUT_SECONDS=20

LLM_API_KEY=
LLM_MODEL=gpt-4.1-mini
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_VERSION=2023-06-01
```

- `AI_PROVIDER=openai` — OpenAI-compatible endpoints (OpenAI, OpenRouter, etc.). Uses the
  `/chat/completions` route with `response_format: json_object`.
- `AI_PROVIDER=anthropic` — Anthropic's native Messages API (`/messages`). `LLM_API_VERSION`
  is sent as the `anthropic-version` header.
- The default `LLM_MODEL` is `claude-3-5-haiku-latest` for Anthropic, `gpt-4.1-mini` otherwise.

The system prompt instructs the model to return strict JSON with keys
`patient_status_summary`, `watch_items` (0–2 items), and `next_encounter_focus`.

---

## MVP Notes & Limitations

- **In-memory storage only.** Restarting the backend wipes all data; seed data is reloaded on boot.
- **Hardcoded demo accounts.** No real user management, password hashing, or session expiry.
- **One medical history per patient; many encounters per patient.**
- **Summaries run only on committed saves**, not on every keystroke.
- **Freeform edits use optimistic concurrency** to avoid silent overwrites.
- **Presence heartbeats** show when another user is actively viewing/editing a patient.
- **No audit log surfacing** — audit events are recorded in memory but not yet exposed via API.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable                     | Default                  | Purpose                                  |
|------------------------------|--------------------------|------------------------------------------|
| `AI_PROVIDER`                | `openai`                 | `openai` or `anthropic`.                 |
| `AI_REQUEST_TIMEOUT_SECONDS` | `20`                     | HTTP timeout for LLM calls.              |
| `LLM_API_KEY`                | (empty)                  | Provider API key.                        |
| `LLM_MODEL`                  | provider-specific        | Model name.                              |
| `LLM_BASE_URL`               | provider-specific        | API base URL.                            |
| `LLM_API_VERSION`            | `2023-06-01`             | API version header (Anthropic).          |
| `FRONTEND_ORIGIN`            | `http://localhost:5173`  | Allowed CORS origin.                     |
| `PRESENCE_TTL_SECONDS`       | `15`                     | Stale-after threshold for presence.      |

### Frontend (`frontend/.env`)

| Variable              | Default                  | Purpose                                  |
|-----------------------|--------------------------|------------------------------------------|
| `VITE_API_BASE_URL`   | `http://localhost:8000`  | Base URL the client calls for the API.   |

See `backend/README.md` for backend-specific notes.
