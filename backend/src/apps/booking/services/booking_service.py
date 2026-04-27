from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from src.apps.booking.models import (
    AvailabilityException,
    AvailabilityRule,
    Booking,
    BookingAuditEvent,
    BookingSlot,
    BookingStatus,
    Invoice,
    InvoiceStatus,
    PaymentStatus,
    RefundRecord,
    RefundStatus,
    Resource,
    PromoCode,
    Slot,
    SlotStatus,
    WaitlistEntry,
    calculate_refund_amount,
    default_hold_expiry,
)
from src.apps.core.cache import RedisCache
from src.apps.notification.models.notification import Notification, NotificationType


@dataclass
class SlotHoldResult:
    slot_id: int
    hold_expires_at: datetime


@dataclass
class BookingQuoteResult:
    resource: Resource
    base_amount_minor: int
    promo_discount_minor: int
    group_surcharge_minor: int
    final_amount_minor: int


@dataclass
class SlotBookingContext:
    slot: Slot
    resource: Resource


MIN_ADVANCE_HOURS = 1
MAX_ADVANCE_DAYS = 90
DEFAULT_SLOT_DURATION_MINUTES = 30
WAITLIST_PROMOTION_HOLD_MINUTES = 30


def _utcnow() -> datetime:
    return datetime.utcnow()


def _normalise_expired_hold(slot: Slot, *, now: datetime) -> None:
    if slot.status == SlotStatus.HELD and slot.hold_expires_at and slot.hold_expires_at <= now:
        slot.status = SlotStatus.OPEN
        slot.hold_expires_at = None


async def get_booking_by_idempotency_key(
    *,
    db: AsyncSession,
    idempotency_key: str,
    user_id: int,
) -> Booking | None:
    result = await db.execute(
        select(Booking).where(
            Booking.idempotency_key == idempotency_key,
            Booking.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def get_slot_hold_owner(*, slot_id: int) -> int | None:
    redis = await RedisCache.get_client()
    if redis is None:
        return None

    current_holder = await redis.get(f"booking:slot-hold:{slot_id}")
    if current_holder is None:
        return None
    if isinstance(current_holder, bytes):
        current_holder = current_holder.decode()
    try:
        return int(current_holder)
    except (TypeError, ValueError):
        return None


async def build_booking_quote(
    *,
    db: AsyncSession,
    tenant_id: int,
    resource_id: int,
    promo_code: str | None = None,
    group_size: int = 1,
) -> BookingQuoteResult:
    resource = await db.get(Resource, resource_id)
    if resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    if resource.tenant_id != tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resource does not belong to tenant")

    base_amount = resource.base_price_minor
    group_surcharge = max(group_size - 1, 0) * 100

    promo_discount = 0
    if promo_code:
        now = _utcnow()
        promo_result = await db.execute(
            select(PromoCode).where(
                PromoCode.tenant_id == tenant_id,
                PromoCode.code == promo_code,
                PromoCode.is_active,
            )
        )
        promo = promo_result.scalar_one_or_none()
        if promo is not None:
            if promo.starts_at and promo.starts_at > now:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Promo code is not active yet")
            if promo.ends_at and promo.ends_at < now:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Promo code has expired")
            if promo.max_redemptions is not None and promo.redeemed_count >= promo.max_redemptions:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Promo code is no longer available")
            promo_discount = int(base_amount * (promo.percentage_off / 100)) + promo.fixed_off_minor

    final_amount = max(base_amount + group_surcharge - promo_discount, 0)
    return BookingQuoteResult(
        resource=resource,
        base_amount_minor=base_amount,
        promo_discount_minor=min(promo_discount, base_amount + group_surcharge),
        group_surcharge_minor=group_surcharge,
        final_amount_minor=final_amount,
    )


async def validate_slot_booking_request(
    *,
    db: AsyncSession,
    slot_id: int,
    resource_id: int,
    provider_id: int,
    tenant_id: int,
    current_user_id: int,
) -> SlotBookingContext:
    slot = await db.get(Slot, slot_id)
    if slot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot not found")

    resource = await db.get(Resource, slot.resource_id)
    if resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    if resource.id != resource_id or slot.resource_id != resource_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slot does not belong to resource")
    if resource.provider_id != provider_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resource does not belong to provider")
    if resource.tenant_id != tenant_id or slot.tenant_id != tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slot does not belong to tenant")
    if not resource.is_active:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Resource is inactive")

    now = _utcnow()
    _normalise_expired_hold(slot, now=now)

    if slot.status == SlotStatus.BOOKED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slot unavailable")
    if slot.status == SlotStatus.BLOCKED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slot blocked")
    if slot.ends_at <= slot.starts_at:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="INVALID_SLOT_DURATION")

    duration_minutes = int((slot.ends_at - slot.starts_at).total_seconds() // 60)
    if duration_minutes <= 0 or duration_minutes % DEFAULT_SLOT_DURATION_MINUTES != 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="INVALID_SLOT_DURATION")

    lead_time = slot.starts_at - now
    if lead_time < timedelta(hours=MIN_ADVANCE_HOURS) or lead_time > timedelta(days=MAX_ADVANCE_DAYS):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="BOOKING_WINDOW_VIOLATION")

    hold_owner_id = await get_slot_hold_owner(slot_id=slot_id)
    if hold_owner_id is not None and hold_owner_id != current_user_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slot already held")
    if (
        slot.status == SlotStatus.HELD
        and slot.hold_expires_at
        and slot.hold_expires_at > now
        and hold_owner_id != current_user_id
    ):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slot already held")

    return SlotBookingContext(slot=slot, resource=resource)


async def hold_slot_with_ttl(*, slot_id: int, holder_user_id: int, ttl_seconds: int = 600) -> SlotHoldResult:
    redis = await RedisCache.get_client()
    if redis is None:
        return SlotHoldResult(slot_id=slot_id, hold_expires_at=default_hold_expiry(ttl_seconds // 60))

    key = f"booking:slot-hold:{slot_id}"
    hold_until = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)
    success = await redis.set(key, str(holder_user_id), ex=ttl_seconds, nx=True)
    if not success:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slot already held")

    return SlotHoldResult(slot_id=slot_id, hold_expires_at=hold_until.replace(tzinfo=None))


async def release_slot_hold(*, slot_id: int, holder_user_id: int) -> bool:
    redis = await RedisCache.get_client()
    if redis is None:
        return True

    key = f"booking:slot-hold:{slot_id}"
    current_holder = await redis.get(key)
    if current_holder and str(current_holder) == str(holder_user_id):
        await redis.delete(key)
        return True
    return False


async def create_or_get_idempotent_booking(
    *,
    db: AsyncSession,
    booking: Booking,
    slot: Slot,
    hold_minutes: int = 10,
) -> Booking:
    existing = await get_booking_by_idempotency_key(
        db=db,
        idempotency_key=booking.idempotency_key,
        user_id=booking.user_id,
    )
    if existing:
        return existing

    hold_expires_at = slot.hold_expires_at
    if hold_expires_at is None or hold_expires_at <= _utcnow():
        hold_expires_at = default_hold_expiry(hold_minutes)

    booking.status = BookingStatus.PENDING
    booking.payment_status = PaymentStatus.PENDING
    db.add(booking)
    await db.flush()

    db.add(BookingSlot(booking_id=booking.id, slot_id=slot.id))
    db.add(
        BookingAuditEvent(
            tenant_id=booking.tenant_id,
            booking_id=booking.id,
            actor_user_id=booking.user_id,
            event_type="booking.created",
            payload_json='{"source":"api"}',
        )
    )

    slot.status = SlotStatus.HELD
    slot.hold_expires_at = hold_expires_at
    db.add(slot)
    db.add(booking)

    invoice = Invoice(
        tenant_id=booking.tenant_id,
        booking_id=booking.id,
        invoice_no=f"INV-{booking.tenant_id}-{booking.id}",
        status=InvoiceStatus.DRAFT,
        subtotal_minor=booking.amount_minor,
        total_minor=booking.amount_minor,
        issued_at=_utcnow(),
    )
    db.add(invoice)

    await release_slot_hold(slot_id=slot.id, holder_user_id=booking.user_id)
    await db.flush()
    return booking


async def get_booking_slots(*, db: AsyncSession, booking_id: int) -> list[Slot]:
    result = await db.execute(
        select(Slot)
        .join(BookingSlot, BookingSlot.slot_id == Slot.id)
        .where(BookingSlot.booking_id == booking_id)
        .order_by(Slot.starts_at.asc())
    )
    return result.scalars().all()


async def promote_waitlist_entries_for_slots(
    *,
    db: AsyncSession,
    released_slots: list[Slot],
) -> list[int]:
    promoted_booking_ids: list[int] = []
    for slot in released_slots:
        entry_result = await db.execute(
            select(WaitlistEntry)
            .where(
                WaitlistEntry.is_active,
                WaitlistEntry.resource_id == slot.resource_id,
                WaitlistEntry.desired_start_at <= slot.starts_at,
                WaitlistEntry.desired_end_at >= slot.ends_at,
            )
            .order_by(WaitlistEntry.created_at.asc())
        )
        entry = entry_result.scalar_one_or_none()
        if entry is None:
            continue

        resource = await db.get(Resource, slot.resource_id)
        if resource is None:
            continue

        promoted_booking = await create_or_get_idempotent_booking(
            db=db,
            booking=Booking(
                tenant_id=entry.tenant_id,
                provider_id=resource.provider_id,
                resource_id=resource.id,
                user_id=entry.user_id,
                amount_minor=resource.base_price_minor,
                currency=resource.currency,
                idempotency_key=f"waitlist:{entry.id}:{slot.id}",
                notes="Auto-promoted from waitlist. Complete checkout before the hold expires.",
            ),
            slot=slot,
            hold_minutes=WAITLIST_PROMOTION_HOLD_MINUTES,
        )
        db.add(
            BookingAuditEvent(
                tenant_id=promoted_booking.tenant_id,
                booking_id=promoted_booking.id,
                actor_user_id=entry.user_id,
                event_type="waitlist.promoted",
                payload_json=f'{{"waitlist_entry_id":{entry.id},"slot_id":{slot.id}}}',
            )
        )
        db.add(
            Notification(
                user_id=entry.user_id,
                title="Waitlist promotion available",
                body="A matching slot has been reserved for you. Complete checkout within 30 minutes to confirm it.",
                type=NotificationType.INFO,
                extra_data={"booking_id": promoted_booking.id, "slot_id": slot.id, "event": "waitlist.promoted"},
            )
        )
        entry.is_active = False
        db.add(entry)
        promoted_booking_ids.append(promoted_booking.id)

    await db.flush()
    return promoted_booking_ids


async def cancel_booking(*, db: AsyncSession, booking_id: int, actor_user_id: int) -> Booking:
    booking = await db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    if booking.status not in {BookingStatus.PENDING, BookingStatus.CONFIRMED}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Booking cannot be cancelled")

    released_slots = await get_booking_slots(db=db, booking_id=booking.id)
    first_slot_start = released_slots[0].starts_at if released_slots else _utcnow()
    for slot in released_slots:
        slot.status = SlotStatus.OPEN
        slot.hold_expires_at = None
        db.add(slot)

    cancelled_at = _utcnow()
    refund_amount = 0
    if booking.payment_status == PaymentStatus.COMPLETED:
        refund_amount = calculate_refund_amount(booking.amount_minor, first_slot_start, cancelled_at)

    booking.status = BookingStatus.CANCELLED
    booking.cancelled_at = cancelled_at
    booking.updated_at = cancelled_at
    if refund_amount:
        booking.refund_status = RefundStatus.PENDING
        if refund_amount == booking.amount_minor:
            booking.payment_status = PaymentStatus.REFUNDED
    else:
        booking.refund_status = RefundStatus.NONE
    db.add(booking)

    if refund_amount:
        db.add(
            RefundRecord(
                tenant_id=booking.tenant_id,
                booking_id=booking.id,
                amount_minor=refund_amount,
                currency=booking.currency,
                status=RefundStatus.PENDING,
                reason="policy_cancellation",
                )
        )

    promoted_booking_ids = await promote_waitlist_entries_for_slots(db=db, released_slots=released_slots)
    db.add(
        BookingAuditEvent(
            tenant_id=booking.tenant_id,
            booking_id=booking.id,
            actor_user_id=actor_user_id,
            event_type="booking.cancelled",
            payload_json=(
                f'{{"refund_amount_minor":{refund_amount},"promoted_booking_ids":{promoted_booking_ids}}}'
            ),
        )
    )

    await db.flush()
    return booking


async def generate_slots_for_resource(
    *,
    db: AsyncSession,
    resource_id: int,
    window_start: datetime,
    window_end: datetime,
) -> int:
    resource = await db.get(Resource, resource_id)
    if resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    tz = ZoneInfo(resource.timezone)
    start_local = window_start.astimezone(tz)
    end_local = window_end.astimezone(tz)

    rules_result = await db.execute(
        select(AvailabilityRule).where(AvailabilityRule.resource_id == resource_id, AvailabilityRule.is_active)
    )
    rules = rules_result.scalars().all()

    exceptions_result = await db.execute(
        select(AvailabilityException).where(AvailabilityException.resource_id == resource_id)
    )
    exceptions = exceptions_result.scalars().all()

    created = 0
    current = start_local.replace(hour=0, minute=0, second=0, microsecond=0)
    while current < end_local:
        weekday = current.weekday()
        day_rules = [r for r in rules if r.day_of_week == weekday]

        for rule in day_rules:
            rule_start = current + timedelta(minutes=rule.start_minute)
            rule_end = current + timedelta(minutes=rule.end_minute)
            cursor = max(rule_start, start_local)

            while cursor + timedelta(minutes=rule.slot_duration_min) <= min(rule_end, end_local):
                slot_end = cursor + timedelta(minutes=rule.slot_duration_min)

                blocked = any(
                    ex.starts_at < slot_end.astimezone(timezone.utc).replace(tzinfo=None)
                    and ex.ends_at > cursor.astimezone(timezone.utc).replace(tzinfo=None)
                    and not ex.is_available
                    for ex in exceptions
                )
                if not blocked:
                    starts_at_utc = cursor.astimezone(timezone.utc).replace(tzinfo=None)
                    ends_at_utc = slot_end.astimezone(timezone.utc).replace(tzinfo=None)
                    existing = await db.execute(
                        select(Slot).where(
                            Slot.resource_id == resource_id,
                            Slot.starts_at == starts_at_utc,
                            Slot.ends_at == ends_at_utc,
                        )
                    )
                    if existing.scalar_one_or_none() is None:
                        db.add(
                            Slot(
                                resource_id=resource_id,
                                tenant_id=resource.tenant_id,
                                starts_at=starts_at_utc,
                                ends_at=ends_at_utc,
                                status=SlotStatus.OPEN,
                            )
                        )
                        created += 1

                cursor = slot_end

        current += timedelta(days=1)

    await db.flush()
    return created
