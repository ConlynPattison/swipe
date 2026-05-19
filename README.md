# Swipe — Swipe-to-Vote Mobile Web App

A mobile-first swipe-to-vote web app for adoptable pets. Built for SJSU CMPE-285.

See [INDEPENDENT_DESIGN.md](INDEPENDENT_DESIGN.md) for the full design spec and decisions.

## Quick start (Docker)

```bash
docker compose up --build
```

Open [http://localhost:5173](http://localhost:5173) in a browser. The layout targets a 390×844 (iPhone-class) viewport — your browser's responsive / device mode gives the best feel.

First boot takes 5–10 seconds while the backend fetches ~100 pets from upstream APIs and seeds demo voting data. Then sign in with one of the seeded users:

- Email: `testuser1@example.com` through `testuser10@example.com`
- Password: `TestPass1`

…or sign up your own account from the link on the login screen. Each demo user has already cast 50–100 random votes, so the results page is populated as soon as you arrive.

### Service layout

- Frontend (React + Vite, built into static assets and served by nginx) on port `5173`. nginx proxies `/api/*` into the backend container.
- Backend (FastAPI + SQLite) on port `8000`.
- SQLite data persists in the `backend_data` named Docker volume.

To wipe the database (pets, votes, users) and start fresh:

```bash
docker compose down -v && docker compose up --build
```

## Architecture (in brief)

Two-tier. A React/TypeScript SPA (Vite-bundled, Framer Motion for the swipe gestures, Tailwind for layout) talks to a FastAPI backend over `/api/*`. nginx serves the built SPA and proxies API calls into the backend container so the browser sees a single origin — no CORS to think about in production. Auth is JWT bearer tokens issued on signup/login, stored in `localStorage`, and re-validated against `/auth/me` on every reload; passwords are bcrypt-hashed server-side under the locked rules (8+ chars, upper, lower, digit). Pets, users, and votes live in a single SQLite database mounted on a Docker volume. The vote row is `UNIQUE(user_id, pet_id)` so revoting is an upsert and undo is just `DELETE /votes/{pet_id}`. The results endpoint aggregates votes per pet in one round trip (LEFT JOIN + grouped sum) and supports three sort modes (most loved, most divisive with a 5-vote floor, most skipped) plus case-insensitive substring search.

On first boot the backend auto-seeds 50 dogs from [dog.ceo](https://dog.ceo) (breed parsed from the URL path, disambiguated against dog.ceo's canonical breed list) plus 50 cats from [The Cat API](https://thecatapi.com), with a 3-pet mock fallback if either upstream is unreachable. It then creates the 10 demo users above and casts their 50–100 votes weighted by a hidden per-pet "appeal" score in [0.2, 0.85] so the aggregation page has clear winners across all three sort modes rather than every pet hovering near 50%. Every step of the seed is idempotent — restarts with the volume intact do nothing.

To force a re-seed without dropping the volume (drops pets, votes, and demo users):

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

## Core Features Completed

[x] 1.	Pick a voting theme. Document it clearly in your README.  
[x] 2.	Provide at least 100 distinct items to vote on. Items must include at least an image (or generated visual) and a short label or description.  
[x] 3.	Implement a swipe-card interface as the primary voting UI  
[x] 4.	Implement a results view reachable by a downward swipe or a clearly visible tab/button. The results view must show aggregate yes/no counts across all users for every item, sortable or filterable in at least one meaningful way (e.g. most-loved, most-divisive, most-skipped).  
[x] 5.	Persist all votes to a backend you control. localStorage may be used as a cache or for the user’s own session, but the source of truth must live on the server. You can pick an implementation for a server.  
[x] 6.	Handle the end-of-deck state gracefully (e.g., “You’ve voted on everything — see how others voted”).  

## Stretch Features Completed

[x] 7.	User identity: anonymous session ID at minimum, or a lightweight sign-in (email magic link, OAuth, or simple username) so a user’s own votes are remembered across reloads. *Completed with simple username, email, password auth*  
[x] 8.  Undo last swipe. *User can undo any of their last swipes from the current session*


## AI usage

This project uses Claude Code as a coding assistant. See the **AI Usage Notes** section in [INDEPENDENT_DESIGN.md](INDEPENDENT_DESIGN.md) for the running log of each utilization/change.


**Which parts of the system did Claude write end-to-end?**  
I used Claude to generate most of the feature code after my initial design and decision making. Before using the tool to create the output, I worked on an independent designing of the system with the technologies, features, and core functionality that I required before getting external input. There were a number of prompts used to change the implementation or clarify my design to assist with Claude's understanding of my requirements.

Each feature created by the tool was manually tested and Claude also generated, initiated, and tore-down numerous scripted tests to validate the output of namely the backend API endpoints and docker functionality.

**Where did you have to push back on, fix, or rewrite Claude’s output? Give one concrete example.**  
For the majority of the prompts provided to the tool, my local design document and answers to clarifying questions helped reduce the number of push backs, fixes, and rewrites needed on my part after Claude generated its outputs. I still, however, had to change many implementation details from Claude's output. Rather than utilizing hard-coded mock data for vertical testing as Claude initially recommended, I prompted the tool to script 3 pet entities for the API to leverage and have them actually persisting within the SQLite database to better emulate the API-database flow.


**One thing Claude did better than you expected, and one thing it did worse.**  
Claude did much better than I expected at resolving issues that it found itself in the middle of a feature implementation. During the utilization of the external APIs to populate the database with the 100 entities, Claude recognized that the schema returned by the API both had reversed breed naming and did not initially provide the name of the breed with the image. Claude resolved the naming issue and integrated another API call to resolve the missing data before I was required to interact with the results.

One thing that Claude did worse than I was expecting was the validation of the code. In previous iterations, I have used Claude and it has generated some saved, automated testing code for me to return to and run for iterative additions. While it does a good job of creating and running its own code to test features as they arrive, it does not always test all of the previous code or features when committing. My manual smoke testing helped with closing this gap, but explicitly having Claude generate unit and integration testing would help with my assurance that features remain working following the addition of new work.

**If you used other AI tools alongside Claude, what role did each play?**  
I did not use additional tools alongside Claude (Opus 4.7)
