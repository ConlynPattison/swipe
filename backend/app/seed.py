from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Pet

# Three mock pets persisted to the DB so the deck/vote code paths run against
# the real Pet table. The picsum.photos seeds produce stable, deterministic
# images; the `source = "mock"` marker makes these rows trivial to identify
# and delete when the Dog/Cat API seed slice replaces them.
_MOCK_PETS: list[dict[str, str]] = [
    {
        "label": "Mock Pet #1",
        "image_url": "https://picsum.photos/seed/swipe-pet-1/400/400",
    },
    {
        "label": "Mock Pet #2",
        "image_url": "https://picsum.photos/seed/swipe-pet-2/400/400",
    },
    {
        "label": "Mock Pet #3",
        "image_url": "https://picsum.photos/seed/swipe-pet-3/400/400",
    },
]


def seed_mock_pets(db: Session) -> int:
    existing = db.scalar(select(func.count()).select_from(Pet))
    if existing and existing > 0:
        return 0
    for entry in _MOCK_PETS:
        db.add(Pet(label=entry["label"], image_url=entry["image_url"], source="mock"))
    db.commit()
    return len(_MOCK_PETS)
