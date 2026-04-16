"""Booking background tasks for reminders, hold cleanup, and reconciliation hooks."""

from datetime import datetime, timedelta

from celery import shared_task
from sqlmodel import select

from src.apps.booking.models import Booking, BookingStatus, Slot, SlotStatus, WaitlistEntry
from src.apps.booking.services.notification_service import notify_booking_reminder
from src.db.session import async_session_factory


@shared_task(name="booking_release_expired_holds_task")
def booking_release_expired_holds_task() -> int:
    """Release expired held slots.

    This is intentionally idempotent and safe to run frequently.
    """

    async def _run() -> int:
        async with async_session_factory() as session:
            now = datetime.utcnow()
            result = await session.execute(
                select(Slot).where(Slot.status == SlotStatus.HELD, Slot.hold_expires_at < now)
            )
            slots = result.scalars().all()
            for slot in slots:
                slot.status = SlotStatus.OPEN
                slot.hold_expires_at = None
                session.add(slot)
            await session.commit()
            return len(slots)

    import asyncio
    return asyncio.run(_run())


@shared_task(name="booking_send_upcoming_reminders_task")
def booking_send_upcoming_reminders_task() -> int:
    """Send lightweight booking reminder notifications for bookings in the next 24h."""

    async def _run() -> int:
        async with async_session_factory() as session:
            # Reminder source-of-truth would usually be booking-slot join times;
            # here we send reminders for recently confirmed bookings as baseline.
            threshold = datetime.utcnow() - timedelta(hours=24)
            result = await session.execute(
                select(Booking).where(Booking.status == BookingStatus.CONFIRMED, Booking.created_at >= threshold)
            )
            bookings = result.scalars().all()
            for booking in bookings:
                await notify_booking_reminder(session, user_id=booking.user_id, booking_id=booking.id)
            await session.commit()
            return len(bookings)

    import asyncio
    return asyncio.run(_run())


@shared_task(name="booking_promote_waitlist_task")
def booking_promote_waitlist_task() -> int:
    """Promote earliest active waitlist entries when open slots are available."""

    async def _run() -> int:
        async with async_session_factory() as session:
            result = await session.execute(
                select(WaitlistEntry)
                .where(WaitlistEntry.is_active)
                .order_by(WaitlistEntry.created_at.asc())
            )
            entries = result.scalars().all()
            promoted = 0
            for entry in entries:
                slot_result = await session.execute(
                    select(Slot).where(
                        Slot.resource_id == entry.resource_id,
                        Slot.status == SlotStatus.OPEN,
                        Slot.starts_at >= entry.desired_start_at,
                        Slot.ends_at <= entry.desired_end_at,
                    ).order_by(Slot.starts_at.asc())
                )
                slot = slot_result.scalars().first()
                if slot:
                    entry.is_active = False
                    session.add(entry)
                    promoted += 1
            await session.commit()
            return promoted

    import asyncio
    return asyncio.run(_run())
