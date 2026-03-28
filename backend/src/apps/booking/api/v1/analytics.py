from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import func, select

from src.apps.booking.models import (
    Booking,
    BookingStatus,
    Dispute,
    DisputeStatus,
    Payout,
    PayoutStatus,
    WaitlistEntry,
)
from src.apps.booking.schemas import BookingAnalyticsSummary, ProviderEarningsSummary, decode_hashid_or_int
from src.apps.iam.api.deps import get_current_active_superuser, get_db
from src.apps.iam.models.user import User

router = APIRouter(prefix="/admin/booking-analytics", tags=["booking-analytics"])


@router.get("/summary", response_model=BookingAnalyticsSummary)
async def get_booking_analytics_summary(
    tenant_id: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
) -> BookingAnalyticsSummary:
    filters = []
    if tenant_id:
        filters.append(Booking.tenant_id == decode_hashid_or_int(tenant_id))

    total = await db.scalar(select(func.count(Booking.id)).where(*filters)) or 0
    confirmed = await db.scalar(select(func.count(Booking.id)).where(*filters, Booking.status == BookingStatus.CONFIRMED)) or 0
    cancelled = await db.scalar(select(func.count(Booking.id)).where(*filters, Booking.status == BookingStatus.CANCELLED)) or 0
    completed = await db.scalar(select(func.count(Booking.id)).where(*filters, Booking.status == BookingStatus.COMPLETED)) or 0
    disputes_open = await db.scalar(select(func.count(Dispute.id)).where(Dispute.status == DisputeStatus.OPEN)) or 0
    waitlist_active = await db.scalar(select(func.count(WaitlistEntry.id)).where(WaitlistEntry.is_active)) or 0
    gross = await db.scalar(select(func.coalesce(func.sum(Booking.amount_minor), 0)).where(*filters)) or 0

    return BookingAnalyticsSummary(
        total_bookings=int(total),
        confirmed_bookings=int(confirmed),
        cancelled_bookings=int(cancelled),
        completed_bookings=int(completed),
        disputes_open=int(disputes_open),
        waitlist_active=int(waitlist_active),
        gross_revenue_minor=int(gross),
    )


@router.get("/providers/{provider_id}/earnings", response_model=ProviderEarningsSummary)
async def get_provider_earnings_summary(
    provider_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_active_superuser),
) -> ProviderEarningsSummary:
    provider_db_id = decode_hashid_or_int(provider_id)

    completed_count = await db.scalar(
        select(func.count(Booking.id)).where(
            Booking.provider_id == provider_db_id,
            Booking.status == BookingStatus.COMPLETED,
        )
    ) or 0

    gross = await db.scalar(
        select(func.coalesce(func.sum(Booking.amount_minor), 0)).where(
            Booking.provider_id == provider_db_id,
            Booking.status == BookingStatus.COMPLETED,
        )
    ) or 0

    pending_payout = await db.scalar(
        select(func.coalesce(func.sum(Payout.amount_minor), 0)).where(
            Payout.provider_id == provider_db_id,
            Payout.status.in_([PayoutStatus.PENDING, PayoutStatus.PROCESSING]),
        )
    ) or 0

    paid_payout = await db.scalar(
        select(func.coalesce(func.sum(Payout.amount_minor), 0)).where(
            Payout.provider_id == provider_db_id,
            Payout.status == PayoutStatus.PAID,
        )
    ) or 0

    return ProviderEarningsSummary(
        provider_id=provider_id,
        completed_bookings=int(completed_count),
        gross_earnings_minor=int(gross),
        pending_payout_minor=int(pending_payout),
        paid_payout_minor=int(paid_payout),
    )
