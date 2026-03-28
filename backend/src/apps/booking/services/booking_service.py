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
    RefundRecord,
    RefundStatus,
    Resource,
    Slot,
    SlotStatus,
    calculate_refund_amount,
    default_hold_expiry,
)
from src.apps.core.cache import RedisCache


@dataclass
class SlotHoldResult:
    slot_id: int
    hold_expires_at: datetime


async def reserve_slot_for_booking(*, db: AsyncSession, slot_id: int) -> Slot:
    slot = await db.get(Slot, slot_id)
    if slot is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot not found")
    if slot.status != SlotStatus.OPEN:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slot unavailable")

    slot.status = SlotStatus.HELD
    slot.hold_expires_at = default_hold_expiry()
    db.add(slot)
    await db.flush()
    return slot


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


async def create_or_get_idempotent_booking(*, db: AsyncSession, booking: Booking, slot: Slot) -> Booking:
    existing_result = await db.execute(select(Booking).where(Booking.idempotency_key == booking.idempotency_key))
    existing = existing_result.scalar_one_or_none()
    if existing:
        return existing

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

    slot.status = SlotStatus.BOOKED
    slot.hold_expires_at = None
    booking.status = BookingStatus.CONFIRMED
    db.add(slot)
    db.add(booking)

    invoice = Invoice(
        tenant_id=booking.tenant_id,
        booking_id=booking.id,
        invoice_no=f"INV-{booking.tenant_id}-{booking.id}",
        status=InvoiceStatus.ISSUED,
        subtotal_minor=booking.amount_minor,
        total_minor=booking.amount_minor,
        issued_at=datetime.utcnow(),
    )
    db.add(invoice)

    await db.flush()
    return booking


async def cancel_booking(*, db: AsyncSession, booking_id: int, actor_user_id: int) -> Booking:
    booking = await db.get(Booking, booking_id)
    if booking is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    if booking.status not in {BookingStatus.PENDING, BookingStatus.CONFIRMED}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Booking cannot be cancelled")

    booking_slots_result = await db.execute(select(BookingSlot).where(BookingSlot.booking_id == booking.id))
    booking_slots = booking_slots_result.scalars().all()

    first_slot_start = datetime.utcnow()
    if booking_slots:
        slot = await db.get(Slot, booking_slots[0].slot_id)
        if slot:
            slot.status = SlotStatus.OPEN
            slot.hold_expires_at = None
            db.add(slot)
            first_slot_start = slot.starts_at

    cancelled_at = datetime.utcnow()
    refund_amount = calculate_refund_amount(booking.amount_minor, first_slot_start, cancelled_at)

    booking.status = BookingStatus.CANCELLED
    booking.cancelled_at = cancelled_at
    booking.updated_at = cancelled_at
    booking.refund_status = RefundStatus.REFUNDED if refund_amount else RefundStatus.NONE
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

    db.add(
        BookingAuditEvent(
            tenant_id=booking.tenant_id,
            booking_id=booking.id,
            actor_user_id=actor_user_id,
            event_type="booking.cancelled",
            payload_json=f'{{"refund_amount_minor":{refund_amount}}}',
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
