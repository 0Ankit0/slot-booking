from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from src.apps.booking.models import Review
from src.apps.booking.schemas import ReviewCreate, ReviewRead, ReviewUpdate, decode_hashid_or_int
from src.apps.iam.api.deps import get_current_user, get_db
from src.apps.iam.models.user import User

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("/", response_model=list[ReviewRead])
async def list_reviews(db: AsyncSession = Depends(get_db)) -> list[ReviewRead]:
    result = await db.execute(select(Review).order_by(Review.id.desc()))
    return [ReviewRead.model_validate(item) for item in result.scalars().all()]


@router.post("/", response_model=ReviewRead, status_code=status.HTTP_201_CREATED)
async def create_review(
    payload: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReviewRead:
    review = Review(
        tenant_id=decode_hashid_or_int(payload.tenant_id),
        booking_id=decode_hashid_or_int(payload.booking_id),
        resource_id=decode_hashid_or_int(payload.resource_id),
        user_id=current_user.id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return ReviewRead.model_validate(review)


@router.get("/{review_id}", response_model=ReviewRead)
async def get_review(
    review_id: str,
    db: AsyncSession = Depends(get_db),
) -> ReviewRead:
    review = await db.get(Review, decode_hashid_or_int(review_id))
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    return ReviewRead.model_validate(review)


@router.patch("/{review_id}", response_model=ReviewRead)
async def update_review(
    review_id: str,
    payload: ReviewUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReviewRead:
    review = await db.get(Review, decode_hashid_or_int(review_id))
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    if review.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to update review")

    updates = payload.model_dump(exclude_none=True)
    for field, value in updates.items():
        setattr(review, field, value)
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return ReviewRead.model_validate(review)


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    review = await db.get(Review, decode_hashid_or_int(review_id))
    if review is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    if review.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to delete review")
    await db.delete(review)
    await db.commit()
