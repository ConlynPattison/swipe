from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import Pet, User, Vote
from app.schemas import ResultRow, SortOption

router = APIRouter(prefix="/results", tags=["results"])

# Locked: divisive sort uses |yes% - 50%| ascending with a minimum total-vote
# floor so a single 1-vs-1 pet doesn't beat a 100/120 split.
DIVISIVE_VOTE_FLOOR = 5


@router.get("", response_model=list[ResultRow])
def get_results(
    sort: SortOption = "most_loved",
    q: str | None = Query(default=None, max_length=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ResultRow]:
    yes_count = func.coalesce(
        func.sum(case((Vote.choice == "yes", 1), else_=0)), 0
    ).label("yes_count")
    no_count = func.coalesce(
        func.sum(case((Vote.choice == "no", 1), else_=0)), 0
    ).label("no_count")
    total = func.coalesce(func.count(Vote.id), 0).label("total_votes")

    stmt = (
        select(Pet, yes_count, no_count, total)
        .outerjoin(Vote, Vote.pet_id == Pet.id)
        .group_by(Pet.id)
    )
    if q:
        stmt = stmt.where(Pet.label.ilike(f"%{q}%"))

    rows = db.execute(stmt).all()

    results: list[ResultRow] = []
    for pet, yc, nc, tv in rows:
        yes_c = int(yc)
        no_c = int(nc)
        total_c = int(tv)
        yes_pct = (yes_c / total_c * 100.0) if total_c > 0 else 0.0
        results.append(
            ResultRow(
                id=pet.id,
                label=pet.label,
                image_url=pet.image_url,
                yes_count=yes_c,
                no_count=no_c,
                total_votes=total_c,
                yes_percent=yes_pct,
            )
        )

    if sort == "most_loved":
        results.sort(key=lambda r: (-r.yes_percent, -r.total_votes, r.id))
    elif sort == "most_skipped":
        results.sort(key=lambda r: (-r.no_count, -r.total_votes, r.id))
    elif sort == "most_divisive":
        results.sort(
            key=lambda r: (
                abs(r.yes_percent - 50.0) if r.total_votes >= DIVISIVE_VOTE_FLOOR else 1e9,
                -r.total_votes,
                r.id,
            )
        )

    return results
