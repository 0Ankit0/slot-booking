from datetime import datetime

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from src.apps.booking.models import Booking, Slot, SlotStatus
from src.apps.booking.schemas import BookingCancelResponse, SlotRead, decode_hashid_or_int
from src.apps.booking.services.booking_service import (
    cancel_booking,
    generate_slots_for_resource,
    hold_slot_with_ttl,
    release_slot_hold,
)
from src.apps.iam.api.deps import get_current_user, get_db
from src.apps.iam.models.user import User
from src.apps.analytics.dependencies import get_analytics
from src.apps.analytics.events import BookingEvents
from src.apps.analytics.service import AnalyticsService

router = APIRouter(prefix="/slots", tags=["slots"])


@router.get("/", response_model=list[SlotRead])
async def list_slots(
    resource_id: str,
    from_ts: datetime,
    to_ts: datetime,
    db: AsyncSession = Depends(get_db),
) -> list[SlotRead]:
    result = await db.execute(
        select(Slot)
        .where(
            Slot.resource_id == decode_hashid_or_int(resource_id),
            Slot.starts_at >= from_ts,
            Slot.ends_at <= to_ts,
        )
        .order_by(Slot.starts_at.asc())
    )
    return [SlotRead.model_validate(item) for item in result.scalars().all()]


@router.post("/generate")
async def generate_slots(
    resource_id: str,
    from_ts: datetime,
    to_ts: datetime,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict[str, int]:
    created = await generate_slots_for_resource(
        db=db,
        resource_id=decode_hashid_or_int(resource_id),
        window_start=from_ts,
        window_end=to_ts,
    )
    await db.commit()
    return {"created": created}


@router.post("/{slot_id}/hold")
async def hold_slot(
    slot_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    analytics: AnalyticsService = Depends(get_analytics),
) -> dict[str, str]:
    result = await hold_slot_with_ttl(slot_id=decode_hashid_or_int(slot_id), holder_user_id=current_user.id)
    slot = await db.get(Slot, result.slot_id)
    if slot:
        slot.hold_expires_at = result.hold_expires_at
        db.add(slot)
        await db.commit()
    await analytics.capture(str(current_user.id), BookingEvents.SLOT_HELD, {"slot_id": decode_hashid_or_int(slot_id)})
    return {"hold_expires_at": result.hold_expires_at.isoformat()}


@router.post("/{slot_id}/release")
async def release_slot(
    slot_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    analytics: AnalyticsService = Depends(get_analytics),
) -> dict[str, bool]:
    released = await release_slot_hold(slot_id=decode_hashid_or_int(slot_id), holder_user_id=current_user.id)
    if released:
        slot = await db.get(Slot, decode_hashid_or_int(slot_id))
        if slot and slot.status == SlotStatus.HELD:
            slot.status = SlotStatus.OPEN
            slot.hold_expires_at = None
            db.add(slot)
            await db.commit()
    if released:
        await analytics.capture(str(current_user.id), BookingEvents.SLOT_RELEASED, {"slot_id": decode_hashid_or_int(slot_id)})
    return {"released": released}


@router.post("/bookings/{booking_id}/cancel", response_model=BookingCancelResponse)
async def cancel_booking_route(
    booking_id: str,
    request_id: str = Header(alias="X-Request-Id", min_length=4, max_length=128),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    analytics: AnalyticsService = Depends(get_analytics),
) -> BookingCancelResponse:
    booking = await cancel_booking(db=db, booking_id=decode_hashid_or_int(booking_id), actor_user_id=current_user.id)
    await db.commit()
    await analytics.capture(str(current_user.id), BookingEvents.BOOKING_CANCELLED, {"booking_id": decode_hashid_or_int(booking_id)})
    return BookingCancelResponse(
        booking_id=booking_id,
        status=booking.status.value,
        refund_status=booking.refund_status.value,
        request_id=request_id,
    )


@router.get("/bookings/{booking_id}")
async def get_booking(
    booking_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    tenant_id: str | None = Query(default=None),
) -> Booking:
    booking = await db.get(Booking, decode_hashid_or_int(booking_id))
    if not booking or booking.user_id != current_user.id:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if tenant_id and booking.tenant_id != decode_hashid_or_int(tenant_id):
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    return booking
