"""
Payment schemas — request/response validation for the finance API.
Includes generic schemas usable across all providers, plus provider-specific
schemas for Khalti and eSewa.
"""
from typing import Any, Optional
from pydantic import BaseModel, field_validator

from src.apps.finance.models.payment import PaymentProvider, PaymentStatus
from src.apps.iam.utils.hashid import decode_id


class InitiatePaymentRequest(BaseModel):
    """Request body to initiate a payment regardless of provider."""
    provider: PaymentProvider
    amount: int  # smallest currency unit
    purchase_order_id: str
    purchase_order_name: str
    booking_id: Optional[int | str] = None
    tenant_id: Optional[int | str] = None
    provider_id: Optional[int | str] = None
    return_url: str
    website_url: str = ""
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("amount must be a positive integer (in smallest currency unit)")
        return v

    @field_validator("booking_id", "tenant_id", "provider_id", mode="before")
    @classmethod
    def decode_optional_ids(cls, value: int | str | None) -> int | None:
        if isinstance(value, str):
            decoded = decode_id(value)
            if decoded is None:
                raise ValueError("Invalid hashid identifier")
            return decoded
        return value


class InitiatePaymentResponse(BaseModel):
    """Response after successfully initiating a payment."""
    transaction_id: int
    provider: PaymentProvider
    status: PaymentStatus
    payment_url: Optional[str] = None
    provider_pidx: Optional[str] = None
    extra: Optional[dict[str, Any]] = None


class VerifyPaymentRequest(BaseModel):
    """Request body to verify / confirm a payment callback."""
    provider: PaymentProvider
    pidx: Optional[str] = None
    oid: Optional[str] = None
    refId: Optional[str] = None
    data: Optional[str] = None
    transaction_id: Optional[int] = None

    @field_validator("transaction_id", mode="before")
    @classmethod
    def decode_transaction_id(cls, value: int | str | None) -> int | None:
        if isinstance(value, str):
            decoded = decode_id(value)
            if decoded is None:
                raise ValueError("Invalid transaction_id")
            return decoded
        return value


class VerifyPaymentResponse(BaseModel):
    """Normalised verification response from any provider."""
    transaction_id: int
    provider: PaymentProvider
    status: PaymentStatus
    amount: Optional[int] = None
    provider_transaction_id: Optional[str] = None
    extra: Optional[dict[str, Any]] = None


class PaymentTransactionRead(BaseModel):
    """Read schema for a stored PaymentTransaction (used in GET endpoints)."""
    id: int
    provider: PaymentProvider
    status: PaymentStatus
    amount: int
    currency: str
    purchase_order_id: str
    purchase_order_name: str
    booking_id: Optional[int] = None
    tenant_id: Optional[int] = None
    provider_id: Optional[int] = None
    provider_transaction_id: Optional[str]
    provider_pidx: Optional[str]
    return_url: str
    website_url: str
    failure_reason: Optional[str]

    model_config = {"from_attributes": True}


class KhaltiInitiateRequest(BaseModel):
    return_url: str
    website_url: str
    amount: int
    purchase_order_id: str
    purchase_order_name: str
    customer_info: Optional[dict[str, str]] = None


class KhaltiInitiateResponse(BaseModel):
    pidx: str
    payment_url: str
    expires_at: Optional[str] = None
    expires_in: Optional[int] = None


class KhaltiLookupRequest(BaseModel):
    pidx: str


class KhaltiLookupResponse(BaseModel):
    pidx: str
    total_amount: int
    status: str
    transaction_id: Optional[str] = None
    fee: Optional[int] = None
    refunded: bool = False


class EsewaInitiateData(BaseModel):
    amount: int
    tax_amount: int = 0
    total_amount: int
    transaction_uuid: str
    product_code: str
    product_service_charge: int = 0
    product_delivery_charge: int = 0
    success_url: str
    failure_url: str
    signed_field_names: str = "total_amount,transaction_uuid,product_code"
    signature: str


class EsewaCallbackData(BaseModel):
    transaction_code: Optional[str] = None
    status: Optional[str] = None
    total_amount: Optional[str] = None
    transaction_uuid: Optional[str] = None
    product_code: Optional[str] = None
    signed_field_names: Optional[str] = None
    signature: Optional[str] = None
