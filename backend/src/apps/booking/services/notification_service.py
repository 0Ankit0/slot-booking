from sqlalchemy.ext.asyncio import AsyncSession

from src.apps.notification.schemas.notification import NotificationCreate
from src.apps.notification.models.notification import NotificationType
from src.apps.notification.services.notification import create_notification


async def notify_booking_created(db: AsyncSession, *, user_id: int, booking_id: int) -> None:
    await create_notification(
        db,
        NotificationCreate(
            user_id=user_id,
            title="Booking confirmed",
            body=f"Your booking #{booking_id} has been confirmed.",
            type=NotificationType.SUCCESS,
            extra_data={"booking_id": booking_id, "event": "booking.created"},
        ),
    )


async def notify_booking_cancelled(db: AsyncSession, *, user_id: int, booking_id: int) -> None:
    await create_notification(
        db,
        NotificationCreate(
            user_id=user_id,
            title="Booking cancelled",
            body=f"Your booking #{booking_id} has been cancelled.",
            type=NotificationType.WARNING,
            extra_data={"booking_id": booking_id, "event": "booking.cancelled"},
        ),
    )


async def notify_booking_reminder(db: AsyncSession, *, user_id: int, booking_id: int) -> None:
    await create_notification(
        db,
        NotificationCreate(
            user_id=user_id,
            title="Booking reminder",
            body=f"Reminder: booking #{booking_id} is coming up soon.",
            type=NotificationType.INFO,
            extra_data={"booking_id": booking_id, "event": "booking.reminder"},
        ),
    )
