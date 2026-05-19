from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import Pet, User, Vote
from app.schemas import VoteRequest, VoteResponse

router = APIRouter(prefix="/votes", tags=["votes"])


@router.put("/{pet_id}", response_model=VoteResponse)
def upsert_vote(
    pet_id: int,
    payload: VoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VoteResponse:
    if db.get(Pet, pet_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found")

    vote = db.scalar(
        select(Vote).where(Vote.user_id == current_user.id, Vote.pet_id == pet_id)
    )
    if vote is None:
        vote = Vote(user_id=current_user.id, pet_id=pet_id, choice=payload.choice)
        db.add(vote)
    else:
        vote.choice = payload.choice
    db.commit()
    db.refresh(vote)
    return VoteResponse(pet_id=vote.pet_id, choice=vote.choice, updated_at=vote.updated_at)


@router.delete("/{pet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vote(
    pet_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    vote = db.scalar(
        select(Vote).where(Vote.user_id == current_user.id, Vote.pet_id == pet_id)
    )
    if vote is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No vote to delete"
        )
    db.delete(vote)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
