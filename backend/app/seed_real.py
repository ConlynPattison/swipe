"""
Seed the Pet table from public dog and cat image APIs.

Sources
-------
- Dogs:  https://dog.ceo  -- 50 random dog images. Breed is embedded in the
  image URL (e.g. .../breeds/retriever-golden/...) so we can derive a label
  without an API key.
- Cats:  https://thecatapi.com  -- 50 random cat images via 5 batches of 10.
  Breed metadata requires an API key on the free tier; without one, every
  cat gets a monotonic "Adoptable Cat #N" label.

Both endpoints are free and require no auth at the request sizes used here.
The original spec called for "The Dog API + The Cat API"; we swapped The Dog
API for dog.ceo when we discovered The Dog API drops breed data without a
key, which would have given us all-generic labels. See INDEPENDENT_DESIGN.md
AI Usage Notes for the longer story.

Usage
-----
    python -m app.seed_real           # idempotent; skips if pets table is non-empty
    python -m app.seed_real --reset   # clears pets + votes first, then re-seeds

If both upstream APIs fail (e.g. no network), falls back to the 3-pet mock
seed so the app is still usable.
"""

from __future__ import annotations

import argparse
import logging
import re
import sys
from dataclasses import dataclass

import httpx
from sqlalchemy import delete, func, select

from app.db import Base, SessionLocal, engine
from app.models import Pet, Vote
from app.seed import seed_mock_pets

logger = logging.getLogger("seed_real")

DOG_URL = "https://dog.ceo/api/breeds/image/random/50"
DOG_BREEDS_URL = "https://dog.ceo/api/breeds/list/all"
CAT_URL = "https://api.thecatapi.com/v1/images/search?limit=10"
CAT_BATCHES = 5  # The Cat API ignores `limit` on the free tier, so loop.
HTTP_TIMEOUT = 10.0

DOG_SOURCE = "dog_ceo"
CAT_SOURCE = "cat_api"

_BREED_PATH_RE = re.compile(r"/breeds/([^/]+)/")


@dataclass
class FetchedPet:
    image_url: str
    source: str
    breed: str | None


def _fetch_dog_breeds(client: httpx.Client) -> set[str]:
    """dog.ceo's canonical breed list. Lets us tell which segment of a two-part
    slug is the breed proper, since the storage-path word order isn't
    consistent (e.g. `retriever-golden` vs `rough-collie`)."""
    try:
        resp = client.get(DOG_BREEDS_URL, timeout=HTTP_TIMEOUT)
        resp.raise_for_status()
        return set((resp.json().get("message") or {}).keys())
    except (httpx.HTTPError, ValueError) as e:
        logger.warning("dog.ceo breed list fetch failed: %s", e)
        return set()


def _parse_dog_breed(image_url: str, breeds: set[str]) -> str | None:
    """Parse breed from a dog.ceo URL like `.../breeds/{a}-{b}/file.jpg`. The
    breed-list set picks which side is the canonical breed; the other side is
    the variety/subbreed and reads first in English. Falls back to titlecasing
    the whole slug when neither side is in the list (e.g. for breeds dog.ceo
    has images of but doesn't list)."""
    m = _BREED_PATH_RE.search(image_url)
    if not m:
        return None
    slug = m.group(1)
    parts = slug.split("-")
    if len(parts) == 1:
        return parts[0].title()
    if len(parts) == 2:
        a, b = parts
        if b in breeds:
            return f"{a.title()} {b.title()}"
        if a in breeds:
            return f"{b.title()} {a.title()}"
    return slug.replace("-", " ").title()


def _fetch_dogs(client: httpx.Client) -> list[FetchedPet]:
    breeds = _fetch_dog_breeds(client)
    try:
        resp = client.get(DOG_URL, timeout=HTTP_TIMEOUT)
        resp.raise_for_status()
        urls = resp.json().get("message") or []
    except (httpx.HTTPError, ValueError) as e:
        logger.warning("dog.ceo image fetch failed: %s", e)
        return []
    return [
        FetchedPet(image_url=url, source=DOG_SOURCE, breed=_parse_dog_breed(url, breeds))
        for url in urls
        if isinstance(url, str)
    ]


def _fetch_cats(client: httpx.Client) -> list[FetchedPet]:
    seen: set[str] = set()
    cats: list[FetchedPet] = []
    for _ in range(CAT_BATCHES):
        try:
            resp = client.get(CAT_URL, timeout=HTTP_TIMEOUT)
            resp.raise_for_status()
            items = resp.json()
        except (httpx.HTTPError, ValueError) as e:
            logger.warning("thecatapi batch failed: %s", e)
            continue
        for item in items:
            image_url = item.get("url")
            item_id = item.get("id")
            if not image_url or item_id in seen:
                continue
            seen.add(item_id)
            cats.append(FetchedPet(image_url=image_url, source=CAT_SOURCE, breed=None))
    return cats


def _fetch_pets() -> list[FetchedPet]:
    with httpx.Client(follow_redirects=True) as client:
        return _fetch_dogs(client) + _fetch_cats(client)


def _label_pets(pets: list[FetchedPet]) -> list[tuple[str, str, str]]:
    """Resolve each pet to a (label, image_url, source) row. Unbreeded pets
    get a monotonic per-species number so the labels stay readable."""
    dog_n = 1
    cat_n = 1
    rows: list[tuple[str, str, str]] = []
    for pet in pets:
        if pet.breed:
            label = pet.breed
        elif pet.source == DOG_SOURCE:
            label = f"Adoptable Dog #{dog_n}"
            dog_n += 1
        else:
            label = f"Adoptable Cat #{cat_n}"
            cat_n += 1
        rows.append((label, pet.image_url, pet.source))
    return rows


def _pets_count() -> int:
    with SessionLocal() as db:
        return db.scalar(select(func.count()).select_from(Pet)) or 0


def _reset_db() -> None:
    with SessionLocal() as db:
        # Votes first: SQLite doesn't enforce ON DELETE CASCADE without
        # PRAGMA foreign_keys=ON, so do it explicitly.
        db.execute(delete(Vote))
        db.execute(delete(Pet))
        db.commit()


def seed_real_pets() -> int:
    """Idempotent: seeds the Pet table only if it's empty. Returns the number
    of rows inserted. Falls back to the 3-pet mock seed if both upstream APIs
    return nothing so the app is always usable."""
    if (existing := _pets_count()) > 0:
        logger.info("Pets table already has %d rows; nothing to do.", existing)
        return 0

    logger.info("Fetching pets from dog.ceo and thecatapi...")
    fetched = _fetch_pets()
    if not fetched:
        logger.warning("Both APIs returned 0 pets. Falling back to mock seed.")
        with SessionLocal() as db:
            return seed_mock_pets(db)

    rows = _label_pets(fetched)
    with SessionLocal() as db:
        for label, image_url, source in rows:
            db.add(Pet(label=label, image_url=image_url, source=source))
        db.commit()

    dogs = sum(1 for r in rows if r[2] == DOG_SOURCE)
    cats = sum(1 for r in rows if r[2] == CAT_SOURCE)
    logger.info("Inserted %d pets (dogs=%d, cats=%d).", len(rows), dogs, cats)
    return len(rows)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    parser = argparse.ArgumentParser(
        description="Seed the Pet table from dog.ceo and The Cat API."
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete existing pets and votes before seeding.",
    )
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)

    if args.reset:
        logger.info("Reset requested -- clearing pets and votes.")
        _reset_db()

    seed_real_pets()
    return 0


if __name__ == "__main__":
    sys.exit(main())
