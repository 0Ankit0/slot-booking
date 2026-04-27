from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from src.apps.booking.models import AvailabilityException, AvailabilityRule, Resource
from src.apps.booking.schemas import (
    AvailabilityExceptionCreate,
    AvailabilityExceptionRead,
    AvailabilityExceptionUpdate,
    AvailabilityRuleCreate,
    AvailabilityRuleRead,
    AvailabilityRuleUpdate,
    decode_hashid_or_int,
)
from src.apps.iam.api.deps import get_current_user, get_db
from src.apps.iam.models.user import User

router = APIRouter(prefix="/availability", tags=["availability"])


async def _get_resource_or_404(db: AsyncSession, resource_id: str) -> Resource:
    resource = await db.get(Resource, decode_hashid_or_int(resource_id))
    if resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    return resource


def _validate_rule_bounds(*, start_minute: int, end_minute: int) -> None:
    if end_minute <= start_minute:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Availability window must end after it starts")


def _validate_exception_bounds(*, starts_at, ends_at) -> None:
    if ends_at <= starts_at:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Availability exception must end after it starts")


@router.get("/resources/{resource_id}/rules", response_model=list[AvailabilityRuleRead])
async def list_availability_rules(
    resource_id: str,
    db: AsyncSession = Depends(get_db),
) -> list[AvailabilityRuleRead]:
    resource = await _get_resource_or_404(db, resource_id)
    result = await db.execute(
        select(AvailabilityRule)
        .where(AvailabilityRule.resource_id == resource.id)
        .order_by(AvailabilityRule.day_of_week.asc(), AvailabilityRule.start_minute.asc())
    )
    return [AvailabilityRuleRead.model_validate(item) for item in result.scalars().all()]


@router.post("/resources/{resource_id}/rules", response_model=AvailabilityRuleRead, status_code=status.HTTP_201_CREATED)
async def create_availability_rule(
    resource_id: str,
    payload: AvailabilityRuleCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> AvailabilityRuleRead:
    resource = await _get_resource_or_404(db, resource_id)
    tenant_id = decode_hashid_or_int(payload.tenant_id)
    if resource.tenant_id != tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resource does not belong to tenant")
    _validate_rule_bounds(start_minute=payload.start_minute, end_minute=payload.end_minute)

    rule = AvailabilityRule(
        resource_id=resource.id,
        tenant_id=tenant_id,
        day_of_week=payload.day_of_week,
        start_minute=payload.start_minute,
        end_minute=payload.end_minute,
        slot_duration_min=payload.slot_duration_min,
        valid_from=payload.valid_from,
        valid_to=payload.valid_to,
        is_active=payload.is_active,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return AvailabilityRuleRead.model_validate(rule)


@router.patch("/rules/{rule_id}", response_model=AvailabilityRuleRead)
async def update_availability_rule(
    rule_id: str,
    payload: AvailabilityRuleUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> AvailabilityRuleRead:
    rule = await db.get(AvailabilityRule, decode_hashid_or_int(rule_id))
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Availability rule not found")

    updates = payload.model_dump(exclude_none=True)
    next_start = updates.get("start_minute", rule.start_minute)
    next_end = updates.get("end_minute", rule.end_minute)
    _validate_rule_bounds(start_minute=next_start, end_minute=next_end)
    for field, value in updates.items():
        setattr(rule, field, value)
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return AvailabilityRuleRead.model_validate(rule)


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_availability_rule(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> None:
    rule = await db.get(AvailabilityRule, decode_hashid_or_int(rule_id))
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Availability rule not found")
    await db.delete(rule)
    await db.commit()


@router.get("/resources/{resource_id}/exceptions", response_model=list[AvailabilityExceptionRead])
async def list_availability_exceptions(
    resource_id: str,
    db: AsyncSession = Depends(get_db),
) -> list[AvailabilityExceptionRead]:
    resource = await _get_resource_or_404(db, resource_id)
    result = await db.execute(
        select(AvailabilityException)
        .where(AvailabilityException.resource_id == resource.id)
        .order_by(AvailabilityException.starts_at.asc())
    )
    return [AvailabilityExceptionRead.model_validate(item) for item in result.scalars().all()]


@router.post("/resources/{resource_id}/exceptions", response_model=AvailabilityExceptionRead, status_code=status.HTTP_201_CREATED)
async def create_availability_exception(
    resource_id: str,
    payload: AvailabilityExceptionCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> AvailabilityExceptionRead:
    resource = await _get_resource_or_404(db, resource_id)
    tenant_id = decode_hashid_or_int(payload.tenant_id)
    if resource.tenant_id != tenant_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resource does not belong to tenant")
    _validate_exception_bounds(starts_at=payload.starts_at, ends_at=payload.ends_at)

    exception = AvailabilityException(
        resource_id=resource.id,
        tenant_id=tenant_id,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        is_available=payload.is_available,
        reason=payload.reason,
    )
    db.add(exception)
    await db.commit()
    await db.refresh(exception)
    return AvailabilityExceptionRead.model_validate(exception)


@router.patch("/exceptions/{exception_id}", response_model=AvailabilityExceptionRead)
async def update_availability_exception(
    exception_id: str,
    payload: AvailabilityExceptionUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> AvailabilityExceptionRead:
    exception = await db.get(AvailabilityException, decode_hashid_or_int(exception_id))
    if exception is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Availability exception not found")

    updates = payload.model_dump(exclude_none=True)
    next_start = updates.get("starts_at", exception.starts_at)
    next_end = updates.get("ends_at", exception.ends_at)
    _validate_exception_bounds(starts_at=next_start, ends_at=next_end)
    for field, value in updates.items():
        setattr(exception, field, value)
    db.add(exception)
    await db.commit()
    await db.refresh(exception)
    return AvailabilityExceptionRead.model_validate(exception)


@router.delete("/exceptions/{exception_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_availability_exception(
    exception_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> None:
    exception = await db.get(AvailabilityException, decode_hashid_or_int(exception_id))
    if exception is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Availability exception not found")
    await db.delete(exception)
    await db.commit()
