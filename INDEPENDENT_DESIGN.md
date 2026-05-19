# Design notes and decisions

Following will be my own engineering work before the assistance of AI tools.

I will be planning the creation of a Swipe-to-Vote Mobile Web App. This design file is created to satisfy the Core (must have) functionality. Stretch goals will be addressed later given enough time.

## High-level Functional Specifications

- Mobile-first; while a web application, it will be designed with an emphasis on being used on mobile devices
- Theme will be voting on adoptable pets
- Uses classical swipe right = yes, swipe left = skip, and swipe down will show the overall results aggregated across all users for all pets
- An API will be used to gather 100 different pet images and populate a database with those pet entities for use in voting by users in the client (each entity will include at least a short label)
- Swiping in any direction will have visual gesture feedback (swiping left or right will show the current card moving in that direction, fading out the current and fading in the next pet in the background; swiping down does the same to current but fades in the aggregation preview)
- The swipe transitions should fade with a color tint (toward yes = green, toward skip = red)
- There will be navigation/gesture symbols at the bottom of the page to help with user direction (the symbols should also do the same action as the swipe when pressed)
- Voting will persist on the application backend via database (no localStorage unless needed for caching, but we will opt not to include this cache unless otherwise needed later)
- Once all of the pets have been voted on by the current user, a end-of-deck state card will be shown saying "You've voted on all of the pets -- see how others voted!" (this end card will have a button for bringing the user down to the aggregation section; they can also still swipe down from here; swiping left/right should not be an option from this card)
- User authentication via username, email, password (no email verification or higher-security check needed for now, we will require a strong password be created with some minimal requirements)

### Voting Theme - Adoptable Pets

The theme of the voting application will be based on pet adoption. All of the users can vote on whether or not they are interested in adopting the pet presently shown to them. At any point, a user can swipe down to view an aggregation of voting results for each pet based on the responses from all users.

### Aggregation/Results Section

The results section, reachable by swiping down or clicking the button when shown, will display a list of every pet and their voting results (percentage yes votes). This list should be sortable based on most-loved, most-devisive, most-skipped and it should be search filterable.

## Technical Specifications

### Frontend

- Mobile web application
- React.js frontend based on my own familiarity so that I can more quickly review AI outputs and make adjustments
- Touch gestures must work for mobile and mouse drag on desktop for grading
- No styling issues (layout shift, overflow, broken images on viewport)
- Must work and look correct on 390 x 844 viewport (iPhone-class) at minimum

### Backend

- Using FastAPI backend here, and again for familiarity and recency bias
- FastAPI will be more than enough to supply basic API endpoints for the web client to call
- Exposes a minimum of GET /items (list of items to vote on), POST /vote (record a vote {itemId, choice, sessionId}), GET /results (aggregate yes/no counts per item)
- A single user voting twice on the same item should not double-count (avoid this by putting rather than posting, one vote per user-pet)
- Want to run this environment in docker containers, so the database will be a SQLite db for minimum db overhead on the VM running our containers

### Data

- 100 pets
- Seed these pets with a script file (note which API is used to gather images)
- Each pet needs a stable id, display label, and an image URL/path

### Quality Bar

- Commit readable, organized code in logical chunks
- README explains how to run the app, the architecture in 1-2 paragraphs, and the trade-offs made
- Input validation on the backend (we will handle a lot of this with Pydantic/FastAPI)

## Plan for Claude

- As recommended, I will scaffold the project and implement features vertically with minimal data entities and mocks to begin with
- I will transition toward full API integration, then populating the dataset with the minimum 100 pets once all of the Core features (+ user authentication) have been manually validated as complete and functional
- For the swipe-deck/voting slice specifically, the mock data (3 pets) is persisted as real rows in the SQLite DB rather than returned from hardcoded endpoint responses. This way the deck and voting code paths are exercised against the same Pet model that the eventual Dog/Cat API seed will populate -- only the seeding source changes later.
- Usage of AI will be documented in the README

## AI Usage Notes

Running log of how AI (Claude Code) is being used on this project. Kept brief and updated as work progresses.

- **Design phase (pre-implementation):** All design decisions in the sections above were authored by me without AI assistance. AI was first engaged after this spec was finalized.
- **Clarification pass:** Claude reviewed the spec and surfaced ambiguities (auth vs. session-id relationship, skip-vs-no semantics in the aggregation, password rules, gesture-library choice, pet image API) before any code was written. Resolutions are folded back into this document.
- **Scaffolding & vertical slices:** Used to bootstrap the React frontend, FastAPI backend, SQLite schema, and Docker setup. Each vertical slice (auth, swipe deck, voting, aggregation, seeding) is manually validated by me on the 390x844 viewport before moving on.
- **Code review:** I review AI-generated diffs in logical commit chunks rather than accepting wholesale; my React/FastAPI familiarity (noted above) is what makes this feasible.
- **Swipe-deck slice — mock data lives in the DB:** I asked Claude to back the 3 swipe-deck mock pets with real DB rows (via a small idempotent seeder run at startup if the pets table is empty) rather than hardcoding them into the GET /pets response. The reason was to keep the read/write code paths under test against the real Pet model so that swapping the seeding source for the Dog/Cat API later is a one-spot change.
- **Real seed slice — 100 pets from dog.ceo + The Cat API:** Replaced the 3-mock auto-seeder with [app/seed_real.py](backend/app/seed_real.py), a script (importable + runnable as `python -m app.seed_real`) that fetches 50 dog images from dog.ceo (with breed parsed from the URL path) and 50 cat images from The Cat API. Mock seed retained only as a network-failure fallback. Two notes worth recording:
  1. **Sourcing substitution:** Originally locked as "The Dog API + The Cat API" because both are free and key-less. Discovered The Dog API drops breed metadata on the free tier, which would have left us with generic "Adoptable Dog #N" labels for every dog. Swapped dogs to dog.ceo (also key-less; encodes breed in the URL) so the breed-name goal from the original locked decision is preserved.
  2. **dog.ceo slug ordering isn't consistent:** most paths read `{breed}-{subbreed}` (e.g. `retriever-golden`) but some are inverted (`rough-collie`). Added a one-shot fetch of dog.ceo's canonical breed list, then use set membership to pick which segment is the breed proper — the variety reads first in English.
- **Demo voting data:** Extended the seed script to create 10 test users (`testuser1@example.com`...`testuser10@example.com`, password `TestPass1`) and have each cast 50-100 random votes after the pets land. Per-pet "appeal" is a hidden uniform(0.2, 0.85) score so each pet has its own bias instead of every pet hovering near 50% -- the aggregation page's three sort modes (most loved / most divisive / most skipped) all have meaningful winners on first boot. Reason for doing this in the seed instead of building a separate /admin tool: the grader gets a populated, interesting aggregation page from a single `docker compose up` with no manual data entry.