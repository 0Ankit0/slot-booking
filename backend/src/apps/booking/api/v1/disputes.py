from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from src.apps.booking.models import Dispute
from src.apps.booking.schemas import DisputeCreate, DisputeRead, DisputeUpdate, decode_hashid_or_int
from src.apps.iam.api.deps import get_current_user, get_db
from src.apps.iam.models.user import User
from src.apps.analytics.dependencies import get_analytics
from src.apps.analytics.events import BookingEvents
from src.apps.analytics.service import AnalyticsService

router = APIRouter(prefix="/disputes", tags=["disputes"])


@router.get("/", response_model=list[DisputeRead])
async def list_disputes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    analytics: AnalyticsService = Depends(get_analytics),
) -> list[DisputeRead]:
    result = await db.execute(
        select(Dispute)
        .where(Dispute.opened_by_user_id == current_user.id)
        .order_by(Dispute.id.desc())
    )
    return [DisputeRead.model_validate(item) for item in result.scalars().all()]


@router.post("/", response_model=DisputeRead, status_code=status.HTTP_201_CREATED)
async def create_dispute(
    payload: DisputeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    analytics: AnalyticsService = Depends(get_analytics),
) -> DisputeRead:
    dispute = Dispute(
        tenant_id=decode_hashid_or_int(payload.tenant_id),
        booking_id=decode_hashid_or_int(payload.booking_id),
        opened_by_user_id=current_user.id,
        reason=payload.reason,
    )
    db.add(dispute)
    await db.commit()
    await db.refresh(dispute)
    await analytics.capture(str(current_user.id), BookingEvents.DISPUTE_OPENED, {"booking_id": dispute.booking_id})
    return DisputeRead.model_validate(dispute)


@router.get("/{dispute_id}", response_model=DisputeRead)
async def get_dispute(
    dispute_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DisputeRead:
    dispute = await db.get(Dispute, decode_hashid_or_int(dispute_id))
    if dispute is None or dispute.opened_by_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute not found")
    return DisputeRead.model_validate(dispute)


@router.patch("/{dispute_id}", response_model=DisputeRead)
async def update_dispute(
    dispute_id: str,
    payload: DisputeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DisputeRead:
    dispute = await db.get(Dispute, decode_hashid_or_int(dispute_id))
    if dispute is None or dispute.opened_by_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispute not found")

    updates = payload.model_dump(exclude_none=True)
    for field, value in updates.items():
        setattr(dispute, field, value)
    db.add(dispute)
    await db.commit()
    await db.refresh(dispute)
    return DisputeRead.model_validate(dispute)
