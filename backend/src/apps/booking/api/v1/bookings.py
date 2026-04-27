from datetime import timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from src.apps.core.config import settings
from src.apps.iam.utils.hashid import encode_id

from src.apps.booking.models import Booking, BookingStatus, PaymentStatus as BookingPaymentStatus, Slot
from src.apps.booking.schemas import (
    BookingCreate,
    BookingCancelResponse,
    BookingCheckoutRequest,
    BookingCheckoutResponse,
    BookingQuoteRequest,
    BookingQuoteResponse,
    BookingRead,
    RecurringBookingRequest,
    RecurringBookingResponse,
    GroupBookingRequest,
    GroupBookingResponse,
    decode_hashid_or_int,
)
from src.apps.booking.services.booking_service import (
    build_booking_quote,
    create_or_get_idempotent_booking,
    get_booking_by_idempotency_key,
    validate_slot_booking_request,
)
from src.apps.booking.services.booking_service import cancel_booking as cancel_booking_service
from src.apps.iam.api.deps import get_current_user, get_db
from src.apps.iam.models.user import User
from src.apps.analytics.dependencies import get_analytics
from src.apps.analytics.events import BookingEvents
from src.apps.analytics.service import AnalyticsService
from src.apps.booking.services.notification_service import notify_booking_cancelled, notify_booking_created
from src.apps.finance.models.payment import PaymentProvider
from src.apps.finance.schemas.payment import InitiatePaymentRequest
from src.apps.finance.services.khalti import KhaltiService
from src.apps.finance.services.esewa import EsewaService
from src.apps.finance.services.stripe import StripeService
from src.apps.finance.services.paypal import PayPalService

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.get("/", response_model=dict[str, object])
async def list_bookings(
    tenant_id: str | None = Query(default=None),
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, object]:
    query = select(Booking).where(Booking.user_id == current_user.id).order_by(Booking.id.desc()).limit(limit + 1)
    if tenant_id:
        query = query.where(Booking.tenant_id == decode_hashid_or_int(tenant_id))
    if cursor:
        query = query.where(Booking.id < decode_hashid_or_int(cursor))
    result = await db.execute(query)
    rows = result.scalars().all()
    has_more = len(rows) > limit
    items = rows[:limit]
    next_cursor = encode_id(items[-1].id) if has_more and items else None
    return {"items": [BookingRead.model_validate(item) for item in items], "next_cursor": next_cursor}


@router.post("/", response_model=BookingRead, status_code=status.HTTP_201_CREATED)
async def create_booking(
    payload: BookingCreate,
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=8, max_length=128),
    request_id: str = Header(alias="X-Request-Id", min_length=4, max_length=128),
    tenant_header: str | None = Header(default=None, alias="X-Tenant-Id"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    analytics: AnalyticsService = Depends(get_analytics),
) -> BookingRead:
    tenant_id = decode_hashid_or_int(payload.tenant_id)
    if tenant_header and decode_hashid_or_int(tenant_header) != tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tenant mismatch")

    existing = await get_booking_by_idempotency_key(
        db=db,
        idempotency_key=idempotency_key,
        user_id=current_user.id,
    )
    if existing is not None:
        return BookingRead.model_validate(existing)

    slot_context = await validate_slot_booking_request(
        db=db,
        slot_id=decode_hashid_or_int(payload.slot_id),
        resource_id=decode_hashid_or_int(payload.resource_id),
        provider_id=decode_hashid_or_int(payload.provider_id),
        tenant_id=tenant_id,
        current_user_id=current_user.id,
    )
    quote = await build_booking_quote(
        db=db,
        tenant_id=tenant_id,
        resource_id=slot_context.resource.id,
        promo_code=payload.promo_code,
        group_size=payload.group_size,
    )
    if payload.amount_minor != quote.final_amount_minor:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Quoted amount no longer matches current pricing",
        )

    booking = Booking(
        tenant_id=tenant_id,
        provider_id=decode_hashid_or_int(payload.provider_id),
        resource_id=decode_hashid_or_int(payload.resource_id),
        user_id=current_user.id,
        amount_minor=quote.final_amount_minor,
        currency=payload.currency,
        promo_code=payload.promo_code,
        promo_discount_minor=quote.promo_discount_minor,
        idempotency_key=idempotency_key,
        notes=f"{payload.notes}\nrequest_id={request_id}".strip(),
    )
    booking = await create_or_get_idempotent_booking(db=db, booking=booking, slot=slot_context.slot)
    await db.commit()
    await db.refresh(booking)
    await notify_booking_created(db, user_id=current_user.id, booking_id=booking.id)
    await analytics.capture(str(current_user.id), BookingEvents.BOOKING_CREATED, {"booking_id": booking.id, "tenant_id": booking.tenant_id})
    return BookingRead.model_validate(booking)


@router.post('/quote', response_model=BookingQuoteResponse)
async def quote_booking(
    payload: BookingQuoteRequest,
    db: AsyncSession = Depends(get_db),
) -> BookingQuoteResponse:
    quote = await build_booking_quote(
        db=db,
        tenant_id=decode_hashid_or_int(payload.tenant_id),
        resource_id=decode_hashid_or_int(payload.resource_id),
        promo_code=payload.promo_code,
        group_size=payload.group_size,
    )
    return BookingQuoteResponse(
        base_amount_minor=quote.base_amount_minor,
        promo_discount_minor=quote.promo_discount_minor,
        group_surcharge_minor=quote.group_surcharge_minor,
        final_amount_minor=quote.final_amount_minor,
    )


@router.post('/recurring', response_model=RecurringBookingResponse, status_code=status.HTTP_201_CREATED)
async def create_recurring_bookings(
    payload: RecurringBookingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RecurringBookingResponse:
    if not settings.FEATURE_BOOKING_RECURRING:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Recurring bookings are disabled')

    created_ids: list[str] = []
    tenant_id = decode_hashid_or_int(payload.tenant_id)
    provider_id = decode_hashid_or_int(payload.provider_id)
    resource_id = decode_hashid_or_int(payload.resource_id)
    base_slot_id = decode_hashid_or_int(payload.slot_id)
    base_context = await validate_slot_booking_request(
        db=db,
        slot_id=base_slot_id,
        resource_id=resource_id,
        provider_id=provider_id,
        tenant_id=tenant_id,
        current_user_id=current_user.id,
    )
    slot_duration = base_context.slot.ends_at - base_context.slot.starts_at
    candidate_slots = [base_context.slot]

    for index in range(1, payload.repeat_count):
        target_start = base_context.slot.starts_at + timedelta(days=index * payload.interval_days)
        target_end = target_start + slot_duration
        matching_slot_result = await db.execute(
            select(Slot).where(
                Slot.resource_id == resource_id,
                Slot.starts_at == target_start,
                Slot.ends_at == target_end,
            )
        )
        matching_slot = matching_slot_result.scalar_one_or_none()
        if matching_slot is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"RECURRING_CONFLICT_DETECTED: missing slot for {target_start.isoformat()}",
            )
        validated = await validate_slot_booking_request(
            db=db,
            slot_id=matching_slot.id,
            resource_id=resource_id,
            provider_id=provider_id,
            tenant_id=tenant_id,
            current_user_id=current_user.id,
        )
        candidate_slots.append(validated.slot)

    for index, slot in enumerate(candidate_slots):
        quote = await build_booking_quote(
            db=db,
            tenant_id=tenant_id,
            resource_id=resource_id,
        )
        booking = await create_or_get_idempotent_booking(
            db=db,
            booking=Booking(
                tenant_id=tenant_id,
                provider_id=provider_id,
                resource_id=resource_id,
                user_id=current_user.id,
                amount_minor=quote.final_amount_minor,
                currency=payload.currency,
                idempotency_key=f'recurring:{current_user.id}:{slot.id}:{index}',
                notes=f'recurring interval days={payload.interval_days}',
            ),
            slot=slot,
        )
        created_ids.append(encode_id(booking.id))

    await db.commit()
    return RecurringBookingResponse(created_booking_ids=created_ids)


@router.post('/group', response_model=GroupBookingResponse, status_code=status.HTTP_201_CREATED)
async def create_group_booking(
    payload: GroupBookingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GroupBookingResponse:
    if not settings.FEATURE_BOOKING_GROUP:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Group bookings are disabled')

    tenant_id = decode_hashid_or_int(payload.tenant_id)
    provider_id = decode_hashid_or_int(payload.provider_id)
    resource_id = decode_hashid_or_int(payload.resource_id)
    slot_context = await validate_slot_booking_request(
        db=db,
        slot_id=decode_hashid_or_int(payload.slot_id),
        resource_id=resource_id,
        provider_id=provider_id,
        tenant_id=tenant_id,
        current_user_id=current_user.id,
    )
    quote = await build_booking_quote(
        db=db,
        tenant_id=tenant_id,
        resource_id=resource_id,
        group_size=payload.participants,
    )

    booking = await create_or_get_idempotent_booking(
        db=db,
        booking=Booking(
            tenant_id=tenant_id,
            provider_id=provider_id,
            resource_id=resource_id,
            user_id=current_user.id,
            amount_minor=quote.final_amount_minor,
            currency=payload.currency,
            idempotency_key=f'group:{current_user.id}:{payload.slot_id}:{payload.participants}',
            notes=f'group booking participants={payload.participants}',
        ),
        slot=slot_context.slot,
    )
    await db.commit()
    await db.refresh(booking)

    return GroupBookingResponse(
        booking_id=encode_id(booking.id),
        participants=payload.participants,
        final_amount_minor=quote.final_amount_minor,
    )


@router.post('/{booking_id}/checkout', response_model=BookingCheckoutResponse)
async def checkout_booking(
    booking_id: str,
    payload: BookingCheckoutRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BookingCheckoutResponse:
    booking_db_id = decode_hashid_or_int(booking_id)
    booking = await db.get(Booking, booking_db_id)
    if booking is None or booking.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Booking not found')
    if booking.status == BookingStatus.CANCELLED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Booking has already been cancelled')
    if booking.payment_status == BookingPaymentStatus.COMPLETED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail='Booking is already paid')

    try:
        provider = PaymentProvider(payload.provider)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Unsupported payment provider')

    provider_map = {
        PaymentProvider.KHALTI: KhaltiService(),
        PaymentProvider.ESEWA: EsewaService(),
        PaymentProvider.STRIPE: StripeService(),
        PaymentProvider.PAYPAL: PayPalService(),
    }
    provider_service = provider_map.get(provider)
    if provider_service is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Unsupported payment provider')

    payment_request = InitiatePaymentRequest(
        provider=provider,
        amount=booking.amount_minor,
        purchase_order_id=f'booking:{booking.id}',
        purchase_order_name=f'Booking #{booking.id}',
        booking_id=booking.id,
        tenant_id=booking.tenant_id,
        provider_id=booking.provider_id,
        return_url=payload.return_url,
        website_url=payload.website_url,
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,
        customer_phone=payload.customer_phone,
    )

    payment_response = await provider_service.initiate_payment(payment_request, db)

    booking.external_payment_id = str(payment_response.provider_pidx or payment_response.transaction_id)
    db.add(booking)
    await db.commit()

    return BookingCheckoutResponse(
        booking_id=booking_id,
        transaction_id=str(payment_response.transaction_id),
        payment_url=payment_response.payment_url,
        provider_pidx=payment_response.provider_pidx,
        status=payment_response.status.value,
    )


@router.get('/{booking_id}', response_model=BookingRead)
async def get_booking(
    booking_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BookingRead:
    booking = await db.get(Booking, decode_hashid_or_int(booking_id))
    if booking is None or booking.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Booking not found')
    return BookingRead.model_validate(booking)


@router.post('/{booking_id}/cancel', response_model=BookingCancelResponse)
async def cancel_booking_endpoint(
    booking_id: str,
    request_id: str = Header(alias="X-Request-Id", min_length=4, max_length=128),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    analytics: AnalyticsService = Depends(get_analytics),
) -> BookingCancelResponse:
    booking = await cancel_booking_service(db=db, booking_id=decode_hashid_or_int(booking_id), actor_user_id=current_user.id)
    await db.commit()
    await analytics.capture(str(current_user.id), BookingEvents.BOOKING_CANCELLED, {"booking_id": decode_hashid_or_int(booking_id)})
    await notify_booking_cancelled(db, user_id=current_user.id, booking_id=decode_hashid_or_int(booking_id))
    return BookingCancelResponse(
        booking_id=booking_id,
        status=booking.status.value,
        refund_status=booking.refund_status.value,
        request_id=request_id,
    )
