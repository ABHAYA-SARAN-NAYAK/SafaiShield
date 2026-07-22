from fastapi import APIRouter, Query
from schemas import JobSyncRequest, JobSyncResponse
from services.supabase_service import sync_jobs, get_job_history

router = APIRouter()


@router.post("/jobs/sync", response_model=JobSyncResponse)
async def sync_jobs_route(req: JobSyncRequest):
    synced, failed = sync_jobs([j.model_dump() for j in req.jobs])
    return {"synced": synced, "failed": failed, "ids": [j.local_id for j in req.jobs]}


@router.get("/jobs/history")
async def job_history(device_id: str = Query(...)):
    return get_job_history(device_id)
