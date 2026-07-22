from fastapi import APIRouter
from schemas import ViolationReportRequest, ViolationReportResponse
from services.gemini_service import get_violation_report

router = APIRouter()


@router.post("/report", response_model=ViolationReportResponse)
async def violation_report(req: ViolationReportRequest):
    payload = req.model_dump()
    try:
        result = await get_violation_report(payload, req.language)
        return result
    except Exception:
        # Fallback: return static hardcoded report in English
        return {
            "report_text": (
                f"On {req.date}, a worker entered a {req.site_type} without protective gear. "
                "This violates Section 7 of the Prohibition of Employment as Manual Scavengers "
                "and their Rehabilitation Act, 2013. Under the NAMASTE scheme, workers are "
                "entitled to a PPE kit, occupational safety training, and health insurance. "
                "Please contact the NAMASTE helpline 14473 to file a formal complaint."
            ),
            "share_text_telegram": (
                f"Violation on {req.date}: Worker entered {req.site_type} without gear. "
                "Violates Manual Scavengers Act 2013, Section 7. Contact 14473."
            ),
            "legal_citations": ["Section 7, Prohibition of Employment as Manual Scavengers and their Rehabilitation Act, 2013"],
            "namaste_entitlements": ["PPE kit", "Occupational safety training", "Ayushman Bharat health insurance"],
            "disclaimer": "This is not legal advice. Contact NAMASTE helpline 14473 or your local NGO to file a formal complaint.",
        }
