from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from src.apps.booking.models import Resource
from src.apps.booking.schemas import ResourceCreate, ResourceRead, ResourceUpdate, decode_hashid_or_int
from src.apps.iam.api.deps import get_current_user, get_db
from src.apps.iam.models.user import User

router = APIRouter(prefix="/resources", tags=["resources"])


@router.get("/", response_model=dict[str, object])
async def list_resources(
    tenant_id: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    limit: int = 20
    query = select(Resource).order_by(Resource.id.desc()).limit(limit + 1)
    if tenant_id:
        query = query.where(Resource.tenant_id == decode_hashid_or_int(tenant_id))

    result = await db.execute(query)
    rows = result.scalars().all()
    has_more = len(rows) > limit
    items = rows[:limit]
    next_cursor = str(items[-1].id) if has_more and items else None
    return {"items": [ResourceRead.model_validate(item) for item in items], "next_cursor": next_cursor}


@router.post("/", response_model=ResourceRead, status_code=status.HTTP_201_CREATED)
async def create_resource(
    payload: ResourceCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ResourceRead:
    resource = Resource(
        provider_id=decode_hashid_or_int(payload.provider_id),
        tenant_id=decode_hashid_or_int(payload.tenant_id),
        name=payload.name,
        description=payload.description,
        category=payload.category,
        timezone=payload.timezone,
        base_price_minor=payload.base_price_minor,
        currency=payload.currency,
    )
    db.add(resource)
    await db.commit()
    await db.refresh(resource)
    return ResourceRead.model_validate(resource)


@router.get("/{resource_id}", response_model=ResourceRead)
async def get_resource(
    resource_id: str,
    db: AsyncSession = Depends(get_db),
) -> ResourceRead:
    resource = await db.get(Resource, decode_hashid_or_int(resource_id))
    if resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    return ResourceRead.model_validate(resource)


@router.patch("/{resource_id}", response_model=ResourceRead)
async def update_resource(
    resource_id: str,
    payload: ResourceUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ResourceRead:
    resource = await db.get(Resource, decode_hashid_or_int(resource_id))
    if resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")

    updates = payload.model_dump(exclude_none=True)
    for field, value in updates.items():
        setattr(resource, field, value)
    db.add(resource)
    await db.commit()
    await db.refresh(resource)
    return ResourceRead.model_validate(resource)


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(
    resource_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> None:
    resource = await db.get(Resource, decode_hashid_or_int(resource_id))
    if resource is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    await db.delete(resource)
    await db.commit()
