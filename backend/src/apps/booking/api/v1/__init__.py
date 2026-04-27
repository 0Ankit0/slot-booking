from fastapi import APIRouter

from .availability import router as availability_router
from .analytics import router as analytics_router
from .bookings import router as bookings_router
from .disputes import router as disputes_router
from .providers import router as providers_router
from .resources import router as resources_router
from .slots import router as slots_router
from .reviews import router as reviews_router
from .waitlist import router as waitlist_router

router = APIRouter()
router.include_router(availability_router)
router.include_router(providers_router)
router.include_router(analytics_router)
router.include_router(resources_router)
router.include_router(slots_router)
router.include_router(bookings_router)
router.include_router(reviews_router)
router.include_router(waitlist_router)
router.include_router(disputes_router)
