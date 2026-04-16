from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from src.apps.booking.models import Provider
from src.apps.booking.schemas import ProviderCreate, ProviderRead, ProviderUpdate, decode_hashid_or_int
from src.apps.iam.api.deps import get_current_user, get_db
from src.apps.iam.models.user import User

router = APIRouter(prefix="/providers", tags=["providers"])


@router.get("/", response_model=dict[str, object])
async def list_providers(
    db: AsyncSession = Depends(get_db),
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
) -> dict[str, object]:
    query = select(Provider).order_by(Provider.id.desc()).limit(limit + 1)
    if cursor:
        query = query.where(Provider.id < decode_hashid_or_int(cursor))
    result = await db.execute(query)
    rows = result.scalars().all()
    has_more = len(rows) > limit
    items = rows[:limit]
    next_cursor = str(items[-1].id) if has_more and items else None
    return {
        "items": [ProviderRead.model_validate(item) for item in items],
        "next_cursor": next_cursor,
    }


@router.post("/", response_model=ProviderRead, status_code=status.HTTP_201_CREATED)
async def create_provider(
    payload: ProviderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProviderRead:
    provider = Provider(
        tenant_id=decode_hashid_or_int(payload.tenant_id),
        name=payload.name,
        description=payload.description,
        created_by_user_id=current_user.id,
    )
    db.add(provider)
    await db.commit()
    await db.refresh(provider)
    return ProviderRead.model_validate(provider)


@router.get("/{provider_id}", response_model=ProviderRead)
async def get_provider(
    provider_id: str,
    db: AsyncSession = Depends(get_db),
) -> ProviderRead:
    provider = await db.get(Provider, decode_hashid_or_int(provider_id))
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")
    return ProviderRead.model_validate(provider)


@router.patch("/{provider_id}", response_model=ProviderRead)
async def update_provider(
    provider_id: str,
    payload: ProviderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProviderRead:
    provider = await db.get(Provider, decode_hashid_or_int(provider_id))
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")
    if provider.created_by_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to update provider")

    updates = payload.model_dump(exclude_none=True)
    for field, value in updates.items():
        setattr(provider, field, value)
    db.add(provider)
    await db.commit()
    await db.refresh(provider)
    return ProviderRead.model_validate(provider)


@router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_provider(
    provider_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    provider = await db.get(Provider, decode_hashid_or_int(provider_id))
    if provider is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")
    if provider.created_by_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to delete provider")
    await db.delete(provider)
    await db.commit()
