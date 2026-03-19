# Medical Product MVP

This workspace now contains:

- A FastAPI backend with in-memory storage only
- A standalone React frontend running on a separate port
- Hardcoded demo login accounts
- Configurable AI provider settings through `.env`
- Edit conflict protection and active-editor warnings

## Backend

From `backend/`:

```bash
cp .env.example .env
uv sync
./.venv/bin/python -m uvicorn main:app --reload --port 8000
```

The backend uses in-memory storage only. Restarting the process resets all data.

## Frontend

From `frontend/`:

```bash
cp .env.example .env
npm install
npm run dev
```

The frontend expects the backend at `http://localhost:8000` by default.

If you are starting from the repository root, use:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
./bootstrap-and-start.sh
```

## Demo Login Accounts

- `ava.clark` / `Aster@101`
- `nolan.reed` / `Harbor@202`
- `priya.shah` / `Cedar@303`
- `marco.ellis` / `Pine@404`
- `dana.cho` / `River@505`

## AI Configuration

Backend `.env` fields:

```env
AI_PROVIDER=openai
AI_REQUEST_TIMEOUT_SECONDS=20

LLM_API_KEY=
LLM_MODEL=gpt-4.1-mini
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_VERSION=2023-06-01
```

Use `AI_PROVIDER=openai` for OpenAI-compatible endpoints such as OpenAI or OpenRouter.
Use `AI_PROVIDER=anthropic` for Anthropic's native Messages API.
`LLM_API_VERSION` is mainly relevant for providers that require an explicit API version header, such as Anthropic.

If the selected AI provider is missing a key or returns an error, the frontend shows:

`It seems we're encountering difficulty in our AI engine`

## MVP Notes

- Medical history is one-per-patient
- Encounter transcripts are many-per-patient
- Summary generation runs only on committed saves, not on every keystroke
- The latest completed summary stays visible while a new one is generating
- Freeform text edits use optimistic concurrency checks to avoid silent overwrites
- Presence heartbeats show when another user is actively viewing/editing a patient
