from fastapi import APIRouter, HTTPException
from schemas import CompanionSessionRequest, CompanionVerifyResponse
from services.supabase_service import save_companion_session, verify_companion_session
import random
import string

router = APIRouter()


@router.post("/companion/session")
async def create_companion_session(req: CompanionSessionRequest):
    """Worker's phone generates a 6-char code. Companion scans QR or types code."""
    code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    save_companion_session(req.device_id, req.job_id, code, req.companion_name)
    return {"code": code, "qr_data": f"https://safaishield.app/companion/{code}"}


@router.get("/companion/verify/{code}", response_model=CompanionVerifyResponse)
async def verify_companion(code: str):
    session = verify_companion_session(code)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "verified": True,
        "job_id": session["job_id"],
        "worker_device_id": session["device_id"],
        "started_at": session.get("created_at", ""),
    }
