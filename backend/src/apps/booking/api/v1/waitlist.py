from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from src.apps.booking.models import WaitlistEntry
from src.apps.booking.schemas import WaitlistCreate, WaitlistRead, WaitlistUpdate, decode_hashid_or_int
from src.apps.iam.api.deps import get_current_user, get_db
from src.apps.iam.models.user import User
from src.apps.analytics.dependencies import get_analytics
from src.apps.analytics.events import BookingEvents
from src.apps.analytics.service import AnalyticsService

router = APIRouter(prefix="/waitlist", tags=["waitlist"])


@router.get("/", response_model=list[WaitlistRead])
async def list_waitlist(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    analytics: AnalyticsService = Depends(get_analytics),
) -> list[WaitlistRead]:
    result = await db.execute(
        select(WaitlistEntry)
        .where(WaitlistEntry.user_id == current_user.id)
        .order_by(WaitlistEntry.id.desc())
    )
    return [WaitlistRead.model_validate(item) for item in result.scalars().all()]


@router.post("/", response_model=WaitlistRead, status_code=status.HTTP_201_CREATED)
async def create_waitlist_entry(
    payload: WaitlistCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    analytics: AnalyticsService = Depends(get_analytics),
) -> WaitlistRead:
    entry = WaitlistEntry(
        tenant_id=decode_hashid_or_int(payload.tenant_id),
        resource_id=decode_hashid_or_int(payload.resource_id),
        user_id=current_user.id,
        desired_start_at=payload.desired_start_at,
        desired_end_at=payload.desired_end_at,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    await analytics.capture(str(current_user.id), BookingEvents.WAITLIST_JOINED, {"resource_id": entry.resource_id})
    return WaitlistRead.model_validate(entry)


@router.get("/{entry_id}", response_model=WaitlistRead)
async def get_waitlist_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WaitlistRead:
    entry = await db.get(WaitlistEntry, decode_hashid_or_int(entry_id))
    if entry is None or entry.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waitlist entry not found")
    return WaitlistRead.model_validate(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_waitlist_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    entry = await db.get(WaitlistEntry, decode_hashid_or_int(entry_id))
    if entry is None or entry.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waitlist entry not found")
    await db.delete(entry)
    await db.commit()


@router.patch("/{entry_id}", response_model=WaitlistRead)
async def update_waitlist_entry(
    entry_id: str,
    payload: WaitlistUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WaitlistRead:
    entry = await db.get(WaitlistEntry, decode_hashid_or_int(entry_id))
    if entry is None or entry.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waitlist entry not found")

    updates = payload.model_dump(exclude_none=True)
    for field, value in updates.items():
        setattr(entry, field, value)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return WaitlistRead.model_validate(entry)
