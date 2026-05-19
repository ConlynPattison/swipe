# Swipe — Swipe-to-Vote Mobile Web App

A mobile-first swipe-to-vote web app for adoptable pets. Built for SJSU CMPE-285.

See [INDEPENDENT_DESIGN.md](INDEPENDENT_DESIGN.md) for the full design spec and decisions.

## Quick start (Docker)

```bash
docker compose up --build
```

Then open the app at [http://localhost:5173](http://localhost:5173).

- Frontend (React + Vite, built and served by nginx) is on port `5173`.
- Backend (FastAPI + SQLite) is on port `8000`. nginx proxies `/api/*` from the frontend container to the backend.
- SQLite data persists in the `backend_data` named volume.

To wipe the database between runs:

```bash
docker compose down -v
```

## Architecture (in brief)

Two-tier: a React/TypeScript frontend (Vite-built, Framer Motion gestures, Tailwind utility CSS) talks to a FastAPI backend over `/api/*`. The backend persists users, pets, and votes in a single SQLite database keyed by `(user_id, pet_id)` so revoting is idempotent. On first boot the backend auto-seeds ~100 pets (50 dogs from [dog.ceo](https://dog.ceo) + 50 cats from [The Cat API](https://thecatapi.com)); if either upstream is unreachable it falls back to a 3-pet mock set so the app stays usable. The seed is idempotent — restarts with a persistent volume don't re-fetch.

To force a re-seed (e.g. after schema changes):

```bash
docker compose exec backend python -m app.seed_real --reset
```

For local development without Docker, see [Development](#development) below.

## Development

Backend (Python 3.12+):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend (Node 20+):

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server runs on `http://localhost:5173` and proxies `/api/*` to `http://localhost:8000`.

## AI usage

This project uses Claude Code as a coding assistant. See the **AI Usage Notes** section in [INDEPENDENT_DESIGN.md](INDEPENDENT_DESIGN.md) for the running log.
