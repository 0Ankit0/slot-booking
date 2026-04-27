from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_serializer

from src.apps.booking.models import (
    BookingStatus,
    DisputeStatus,
    PaymentStatus,
    ProviderStatus,
    RefundStatus,
    ReviewStatus,
    SlotStatus,
)
from src.apps.iam.utils.hashid import decode_id, encode_id


class ProviderCreate(BaseModel):
    tenant_id: int | str
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=1000)

    @field_serializer("tenant_id")
    def _serialize_tenant(self, value: int | str) -> str:
        return str(value)


class ProviderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    name: str
    description: str
    status: ProviderStatus

    @field_serializer("id", "tenant_id")
    def _serialize_ids(self, value: int) -> str:
        return encode_id(value)


class ProviderUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    status: ProviderStatus | None = None


class ResourceCreate(BaseModel):
    provider_id: int | str
    tenant_id: int | str
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=2000)
    category: str = Field(default="general", max_length=80)
    timezone: str = Field(default="UTC", max_length=80)
    base_price_minor: int = Field(ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    max_group_size: int = Field(default=1, ge=1, le=500)


class ResourceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    provider_id: int
    tenant_id: int
    name: str
    description: str
    category: str
    timezone: str
    base_price_minor: int
    currency: str
    max_group_size: int
    is_active: bool

    @field_serializer("id", "provider_id", "tenant_id")
    def _serialize_ids(self, value: int) -> str:
        return encode_id(value)


class ResourceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    category: str | None = Field(default=None, max_length=80)
    timezone: str | None = Field(default=None, max_length=80)
    base_price_minor: int | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    max_group_size: int | None = Field(default=None, ge=1, le=500)
    is_active: bool | None = None


class BookingCreate(BaseModel):
    tenant_id: int | str
    provider_id: int | str
    resource_id: int | str
    slot_id: int | str
    amount_minor: int = Field(ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    promo_code: Optional[str] = Field(default=None, max_length=40)
    group_size: int = Field(default=1, ge=1, le=500)
    notes: str = Field(default="", max_length=2000)


class BookingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    provider_id: int
    resource_id: int
    user_id: int
    status: BookingStatus
    payment_status: PaymentStatus
    refund_status: RefundStatus
    amount_minor: int
    currency: str
    created_at: datetime

    @field_serializer("id", "tenant_id", "provider_id", "resource_id", "user_id")
    def _serialize_ids(self, value: int) -> str:
        return encode_id(value)


class ReviewCreate(BaseModel):
    tenant_id: int | str
    booking_id: int | str
    resource_id: int | str
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=3000)


class ReviewRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    booking_id: int
    resource_id: int
    user_id: int
    rating: int
    comment: str
    status: ReviewStatus
    created_at: datetime

    @field_serializer("id", "tenant_id", "booking_id", "resource_id", "user_id")
    def _serialize_ids(self, value: int) -> str:
        return encode_id(value)


class ReviewUpdate(BaseModel):
    rating: int | None = Field(default=None, ge=1, le=5)
    comment: str | None = Field(default=None, max_length=3000)
    status: ReviewStatus | None = None


class WaitlistCreate(BaseModel):
    tenant_id: int | str
    resource_id: int | str
    desired_start_at: datetime
    desired_end_at: datetime


class WaitlistRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    resource_id: int
    user_id: int
    desired_start_at: datetime
    desired_end_at: datetime
    is_active: bool

    @field_serializer("id", "tenant_id", "resource_id", "user_id")
    def _serialize_ids(self, value: int) -> str:
        return encode_id(value)


class WaitlistUpdate(BaseModel):
    desired_start_at: datetime | None = None
    desired_end_at: datetime | None = None
    is_active: bool | None = None


class DisputeCreate(BaseModel):
    tenant_id: int | str
    booking_id: int | str
    reason: str = Field(min_length=3, max_length=1500)


class DisputeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tenant_id: int
    booking_id: int
    opened_by_user_id: int
    reason: str
    status: DisputeStatus
    resolution_note: str

    @field_serializer("id", "tenant_id", "booking_id", "opened_by_user_id")
    def _serialize_ids(self, value: int) -> str:
        return encode_id(value)


class DisputeUpdate(BaseModel):
    reason: str | None = Field(default=None, min_length=3, max_length=1500)
    status: DisputeStatus | None = None
    resolution_note: str | None = Field(default=None, max_length=2000)


class SlotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    resource_id: int
    tenant_id: int
    starts_at: datetime
    ends_at: datetime
    status: SlotStatus
    hold_expires_at: Optional[datetime] = None

    @field_serializer("id", "resource_id", "tenant_id")
    def _serialize_ids(self, value: int) -> str:
        return encode_id(value)


class AvailabilityRuleCreate(BaseModel):
    tenant_id: int | str
    day_of_week: int = Field(ge=0, le=6)
    start_minute: int = Field(ge=0, le=1439)
    end_minute: int = Field(ge=1, le=1440)
    slot_duration_min: int = Field(default=30, ge=5, le=720)
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None
    is_active: bool = True


class AvailabilityRuleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    resource_id: int
    tenant_id: int
    day_of_week: int
    start_minute: int
    end_minute: int
    slot_duration_min: int
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None
    is_active: bool

    @field_serializer("id", "resource_id", "tenant_id")
    def _serialize_rule_ids(self, value: int) -> str:
        return encode_id(value)


class AvailabilityRuleUpdate(BaseModel):
    day_of_week: int | None = Field(default=None, ge=0, le=6)
    start_minute: int | None = Field(default=None, ge=0, le=1439)
    end_minute: int | None = Field(default=None, ge=1, le=1440)
    slot_duration_min: int | None = Field(default=None, ge=5, le=720)
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None
    is_active: bool | None = None


class AvailabilityExceptionCreate(BaseModel):
    tenant_id: int | str
    starts_at: datetime
    ends_at: datetime
    is_available: bool = False
    reason: str = Field(default="", max_length=255)


class AvailabilityExceptionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    resource_id: int
    tenant_id: int
    starts_at: datetime
    ends_at: datetime
    is_available: bool
    reason: str

    @field_serializer("id", "resource_id", "tenant_id")
    def _serialize_exception_ids(self, value: int) -> str:
        return encode_id(value)


class AvailabilityExceptionUpdate(BaseModel):
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    is_available: bool | None = None
    reason: str | None = Field(default=None, max_length=255)


def decode_hashid_or_int(value: int | str) -> int:
    if isinstance(value, int):
        return value
    decoded = decode_id(value)
    if decoded is None:
        raise ValueError("Invalid hashid")
    return decoded


class BookingAnalyticsSummary(BaseModel):
    total_bookings: int
    confirmed_bookings: int
    cancelled_bookings: int
    completed_bookings: int
    disputes_open: int
    waitlist_active: int
    gross_revenue_minor: int


class ProviderEarningsSummary(BaseModel):
    provider_id: str
    completed_bookings: int
    gross_earnings_minor: int
    pending_payout_minor: int
    paid_payout_minor: int


class BookingQuoteRequest(BaseModel):
    tenant_id: int | str
    resource_id: int | str
    amount_minor: int = Field(ge=0)
    promo_code: Optional[str] = None
    group_size: int = Field(default=1, ge=1, le=500)


class BookingQuoteResponse(BaseModel):
    base_amount_minor: int
    promo_discount_minor: int
    group_surcharge_minor: int
    final_amount_minor: int


class RecurringBookingRequest(BaseModel):
    tenant_id: int | str
    provider_id: int | str
    resource_id: int | str
    slot_id: int | str
    amount_minor: int = Field(ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    repeat_count: int = Field(default=1, ge=1, le=26)
    interval_days: int = Field(default=7, ge=1, le=30)


class RecurringBookingResponse(BaseModel):
    created_booking_ids: list[str]


class GroupBookingRequest(BaseModel):
    tenant_id: int | str
    provider_id: int | str
    resource_id: int | str
    slot_id: int | str
    amount_minor: int = Field(ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    participants: int = Field(default=2, ge=2, le=500)


class GroupBookingResponse(BaseModel):
    booking_id: str
    participants: int
    final_amount_minor: int


class BookingCheckoutRequest(BaseModel):
    provider: str
    return_url: str
    website_url: str = ''
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None


class BookingCheckoutResponse(BaseModel):
    booking_id: str
    transaction_id: str
    payment_url: Optional[str] = None
    provider_pidx: Optional[str] = None
    status: str


class BookingCancelResponse(BaseModel):
    booking_id: str
    status: BookingStatus
    refund_status: RefundStatus
    request_id: str
