from fastapi import APIRouter
from schemas import AnonymousIncidentRequest
from services.supabase_service import get_map_points, insert_anonymous_incident

router = APIRouter()


@router.get("/map")
@router.get("/map/points")
async def map_points():
    try:
        return get_map_points()
    except Exception:
        return []


@router.post("/map/report")
@router.post("/map/incident")
async def anonymous_incident(req: AnonymousIncidentRequest):
    try:
        insert_anonymous_incident(req.lat, req.lng, req.site_type)
    except Exception:
        pass
    return {"status": "reported"}

