from fastapi import APIRouter
from schemas import RiskCheckRequest, RiskCheckResponse
from services.gemini_service import get_risk_assessment
from services.risk_fallback import classify_offline

router = APIRouter()


@router.post("/check", response_model=RiskCheckResponse)
async def risk_check(req: RiskCheckRequest):
    payload = req.model_dump()
    try:
        result = await get_risk_assessment(payload, req.language)
        result["source"] = "gemini"
        return result
    except Exception:
        # Gemini failed or timed out — use offline rule classifier
        return classify_offline(
            site_type=req.site_type,
            last_cleaned_date=req.last_cleaned_date,
            temperature_c=req.temperature_c,
            humidity_pct=req.humidity_pct,
            depth_feet=req.depth_feet,
            recent_rain=req.recent_rain or False,
            has_gas_detector=req.has_gas_detector or False,
            has_ventilation=req.has_ventilation or False,
            language=req.language,
        )
