from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from src.apps.booking.models import Resource
from src.apps.booking.schemas import ResourceCreate, ResourceRead, ResourceUpdate, decode_hashid_or_int
from src.apps.iam.api.deps import get_current_user, get_db
from src.apps.iam.utils.hashid import encode_id
from src.apps.iam.models.user import User

router = APIRouter(prefix="/resources", tags=["resources"])


@router.get("/", response_model=dict[str, object])
async def list_resources(
    tenant_id: str | None = Query(default=None),
    provider_id: str | None = Query(default=None),
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    q: str | None = Query(default=None, min_length=1, max_length=120),
    category: str | None = Query(default=None, min_length=1, max_length=80),
    include_inactive: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
) -> dict[str, object]:
    query = select(Resource).order_by(Resource.id.desc()).limit(limit + 1)
    if tenant_id:
        query = query.where(Resource.tenant_id == decode_hashid_or_int(tenant_id))
    if provider_id:
        query = query.where(Resource.provider_id == decode_hashid_or_int(provider_id))
    if cursor:
        query = query.where(Resource.id < decode_hashid_or_int(cursor))
    if q:
        search = f"%{q.strip()}%"
        query = query.where(
            or_(
                Resource.name.ilike(search),
                Resource.description.ilike(search),
                Resource.category.ilike(search),
            )
        )
    if category:
        query = query.where(Resource.category == category)
    if not include_inactive:
        query = query.where(Resource.is_active.is_(True))

    result = await db.execute(query)
    rows = result.scalars().all()
    has_more = len(rows) > limit
    items = rows[:limit]
    next_cursor = encode_id(items[-1].id) if has_more and items else None
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
        max_group_size=payload.max_group_size,
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
