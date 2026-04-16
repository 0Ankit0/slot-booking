from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from enum import Enum
from typing import Optional, TYPE_CHECKING

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from src.apps.iam.models.user import User


class ProviderStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    SUSPENDED = "suspended"


class SlotStatus(str, Enum):
    OPEN = "open"
    HELD = "held"
    BOOKED = "booked"
    BLOCKED = "blocked"


class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"


class ReviewStatus(str, Enum):
    PUBLISHED = "published"
    HIDDEN = "hidden"


class DisputeStatus(str, Enum):
    OPEN = "open"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    REJECTED = "rejected"


class RefundStatus(str, Enum):
    NONE = "none"
    PENDING = "pending"
    REFUNDED = "refunded"
    PARTIAL = "partial"
    FAILED = "failed"


class PayoutStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    PAID = "paid"
    FAILED = "failed"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    PAID = "paid"
    VOID = "void"


class Provider(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenant.id", index=True, ondelete="CASCADE")
    name: str = Field(max_length=120, index=True)
    description: str = Field(default="", max_length=1000)
    status: ProviderStatus = Field(default=ProviderStatus.PENDING, index=True)
    created_by_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ResourceCategory(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("tenant_id", "slug", name="uq_resource_category_tenant_slug"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenant.id", index=True, ondelete="CASCADE")
    name: str = Field(max_length=120)
    slug: str = Field(max_length=80, index=True)
    description: str = Field(default="", max_length=500)


class ResourceAmenity(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("tenant_id", "slug", name="uq_resource_amenity_tenant_slug"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenant.id", index=True, ondelete="CASCADE")
    name: str = Field(max_length=120)
    slug: str = Field(max_length=80, index=True)


class ResourceLocation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenant.id", index=True, ondelete="CASCADE")
    name: str = Field(max_length=120)
    address_line_1: str = Field(max_length=255)
    address_line_2: str = Field(default="", max_length=255)
    city: str = Field(max_length=120)
    state: str = Field(default="", max_length=120)
    postal_code: str = Field(default="", max_length=30)
    country: str = Field(default="US", max_length=2)
    latitude: Optional[float] = Field(default=None)
    longitude: Optional[float] = Field(default=None)


class Resource(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    provider_id: int = Field(foreign_key="provider.id", index=True, ondelete="CASCADE")
    tenant_id: int = Field(foreign_key="tenant.id", index=True, ondelete="CASCADE")
    location_id: Optional[int] = Field(default=None, foreign_key="resourcelocation.id", index=True, ondelete="SET NULL")
    category_id: Optional[int] = Field(default=None, foreign_key="resourcecategory.id", index=True, ondelete="SET NULL")
    name: str = Field(max_length=120, index=True)
    description: str = Field(default="", max_length=2000)
    category: str = Field(default="general", max_length=80, index=True)
    timezone: str = Field(default="UTC", max_length=80)
    base_price_minor: int = Field(default=0, ge=0)
    currency: str = Field(default="USD", max_length=3)
    max_group_size: int = Field(default=1, ge=1, le=500)
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ResourceAmenityMap(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("resource_id", "amenity_id", name="uq_resource_amenity_map"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    resource_id: int = Field(foreign_key="resource.id", index=True, ondelete="CASCADE")
    amenity_id: int = Field(foreign_key="resourceamenity.id", index=True, ondelete="CASCADE")


class AvailabilityRule(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    resource_id: int = Field(foreign_key="resource.id", index=True, ondelete="CASCADE")
    tenant_id: int = Field(foreign_key="tenant.id", index=True, ondelete="CASCADE")
    day_of_week: int = Field(ge=0, le=6, description="0=Monday, 6=Sunday")
    start_minute: int = Field(ge=0, le=1439)
    end_minute: int = Field(ge=1, le=1440)
    slot_duration_min: int = Field(default=30, ge=5, le=720)
    valid_from: Optional[datetime] = Field(default=None)
    valid_to: Optional[datetime] = Field(default=None)
    is_active: bool = Field(default=True)


class AvailabilityException(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    resource_id: int = Field(foreign_key="resource.id", index=True, ondelete="CASCADE")
    tenant_id: int = Field(foreign_key="tenant.id", index=True, ondelete="CASCADE")
    starts_at: datetime = Field(index=True)
    ends_at: datetime = Field(index=True)
    is_available: bool = Field(default=False)
    reason: str = Field(default="", max_length=255)


class Slot(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint("resource_id", "starts_at", "ends_at", name="uq_slot_resource_time"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    resource_id: int = Field(foreign_key="resource.id", index=True, ondelete="CASCADE")
    tenant_id: int = Field(foreign_key="tenant.id", index=True, ondelete="CASCADE")
    starts_at: datetime = Field(index=True)
    ends_at: datetime = Field(index=True)
    status: SlotStatus = Field(default=SlotStatus.OPEN, index=True)
    hold_expires_at: Optional[datetime] = Field(default=None, index=True)


class PricingRule(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    resource_id: int = Field(foreign_key="resource.id", index=True, ondelete="CASCADE")
    tenant_id: int = Field(foreign_key="tenant.id", index=True, ondelete="CASCADE")
    name: str = Field(max_length=120)
    starts_at: Optional[datetime] = Field(default=None)
    ends_at: Optional[datetime] = Field(default=None)
    percentage_delta: float = Field(default=0)
    fixed_delta_minor: int = Field(default=0)
    priority: int = Field(default=0)
    is_active: bool = Field(default=True)


class PromoCode(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_promo_code_tenant_code"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenant.id", index=True, ondelete="CASCADE")
    code: str = Field(max_length=40, index=True)
    description: str = Field(default="", max_length=255)
    percentage_off: float = Field(default=0, ge=0, le=100)
    fixed_off_minor: int = Field(default=0, ge=0)
    max_redemptions: Optional[int] = Field(default=None, ge=1)
    redeemed_count: int = Field(default=0, ge=0)
    starts_at: Optional[datetime] = Field(default=None)
    ends_at: Optional[datetime] = Field(default=None)
    is_active: bool = Field(default=True)


class Booking(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_booking_idempotency_key"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenant.id", index=True, ondelete="CASCADE")
    provider_id: int = Field(foreign_key="provider.id", index=True, ondelete="RESTRICT")
    resource_id: int = Field(foreign_key="resource.id", index=True, ondelete="RESTRICT")
    user_id: int = Field(foreign_key="user.id", index=True, ondelete="RESTRICT")
    status: BookingStatus = Field(default=BookingStatus.PENDING, index=True)
    payment_status: PaymentStatus = Field(default=PaymentStatus.PENDING, index=True)
    refund_status: RefundStatus = Field(default=RefundStatus.NONE, index=True)
    amount_minor: int = Field(ge=0)
    currency: str = Field(default="USD", max_length=3)
    promo_code: Optional[str] = Field(default=None, max_length=40)
    promo_discount_minor: int = Field(default=0, ge=0)
    idempotency_key: str = Field(max_length=128, index=True)
    external_payment_id: Optional[str] = Field(default=None, max_length=128, index=True)
    notes: str = Field(default="", max_length=2000)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    cancelled_at: Optional[datetime] = Field(default=None)

    user: Optional["User"] = Relationship()


class BookingSlot(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint("booking_id", "slot_id", name="uq_booking_slot"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    booking_id: int = Field(foreign_key="booking.id", index=True, ondelete="CASCADE")
    slot_id: int = Field(foreign_key="slot.id", index=True, ondelete="RESTRICT")


class Review(SQLModel, table=True):
    __table_args__ = (
        UniqueConstraint("booking_id", "user_id", name="uq_review_booking_user"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenant.id", index=True, ondelete="CASCADE")
    booking_id: int = Field(foreign_key="booking.id", index=True, ondelete="CASCADE")
    resource_id: int = Field(foreign_key="resource.id", index=True, ondelete="CASCADE")
    user_id: int = Field(foreign_key="user.id", index=True, ondelete="CASCADE")
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=3000)
    status: ReviewStatus = Field(default=ReviewStatus.PUBLISHED, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class WaitlistEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenant.id", index=True, ondelete="CASCADE")
    resource_id: int = Field(foreign_key="resource.id", index=True, ondelete="CASCADE")
    user_id: int = Field(foreign_key="user.id", index=True, ondelete="CASCADE")
    desired_start_at: datetime = Field(index=True)
    desired_end_at: datetime = Field(index=True)
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Dispute(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenant.id", index=True, ondelete="CASCADE")
    booking_id: int = Field(foreign_key="booking.id", index=True, ondelete="CASCADE")
    opened_by_user_id: int = Field(foreign_key="user.id", ondelete="RESTRICT")
    reason: str = Field(max_length=1500)
    status: DisputeStatus = Field(default=DisputeStatus.OPEN, index=True)
    resolution_note: str = Field(default="", max_length=2000)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class RefundRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenant.id", index=True, ondelete="CASCADE")
    booking_id: int = Field(foreign_key="booking.id", index=True, ondelete="CASCADE")
    amount_minor: int = Field(ge=0)
    currency: str = Field(default="USD", max_length=3)
    status: RefundStatus = Field(default=RefundStatus.PENDING, index=True)
    reason: str = Field(default="", max_length=500)
    external_refund_id: Optional[str] = Field(default=None, max_length=120)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Invoice(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("invoice_no", name="uq_invoice_no"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenant.id", index=True, ondelete="CASCADE")
    booking_id: int = Field(foreign_key="booking.id", index=True, ondelete="CASCADE")
    invoice_no: str = Field(max_length=60, index=True)
    status: InvoiceStatus = Field(default=InvoiceStatus.DRAFT, index=True)
    subtotal_minor: int = Field(default=0)
    discount_minor: int = Field(default=0)
    tax_minor: int = Field(default=0)
    total_minor: int = Field(default=0)
    issued_at: Optional[datetime] = Field(default=None)
    paid_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Receipt(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("booking_id", name="uq_receipt_booking"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenant.id", index=True, ondelete="CASCADE")
    booking_id: int = Field(foreign_key="booking.id", index=True, ondelete="CASCADE")
    receipt_no: str = Field(max_length=60, index=True)
    issued_at: datetime = Field(default_factory=datetime.utcnow)


class Payout(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenant.id", index=True, ondelete="CASCADE")
    provider_id: int = Field(foreign_key="provider.id", index=True, ondelete="CASCADE")
    booking_id: Optional[int] = Field(default=None, foreign_key="booking.id", index=True, ondelete="SET NULL")
    amount_minor: int = Field(ge=0)
    currency: str = Field(default="USD", max_length=3)
    status: PayoutStatus = Field(default=PayoutStatus.PENDING, index=True)
    external_reference: Optional[str] = Field(default=None, max_length=128)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class BookingAuditEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenant.id", index=True, ondelete="CASCADE")
    booking_id: int = Field(foreign_key="booking.id", index=True, ondelete="CASCADE")
    event_type: str = Field(max_length=120, index=True)
    actor_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    payload_json: str = Field(default="{}")
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


def default_hold_expiry(minutes: int = 10) -> datetime:
    return datetime.utcnow() + timedelta(minutes=minutes)


def calculate_refund_amount(amount_minor: int, starts_at: datetime, cancelled_at: datetime) -> int:
    """Basic cancellation policy.

    - >= 24h before start: 100%
    - >= 1h before start: 50%
    - < 1h before start: 0%
    """
    if cancelled_at <= starts_at - timedelta(hours=24):
        return amount_minor
    if cancelled_at <= starts_at - timedelta(hours=1):
        return int((Decimal(amount_minor) * Decimal("0.5")).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    return 0
