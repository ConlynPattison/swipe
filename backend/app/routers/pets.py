from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import Pet, User, Vote
from app.schemas import PetResponse

router = APIRouter(prefix="/pets", tags=["pets"])


@router.get("", response_model=list[PetResponse])
def list_pets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PetResponse]:
    stmt = (
        select(Pet, Vote.choice)
        .outerjoin(
            Vote,
            (Vote.pet_id == Pet.id) & (Vote.user_id == current_user.id),
        )
        .order_by(Pet.id)
    )
    rows = db.execute(stmt).all()
    return [
        PetResponse(
            id=pet.id,
            label=pet.label,
            image_url=pet.image_url,
            your_vote=choice,
        )
        for pet, choice in rows
    ]
