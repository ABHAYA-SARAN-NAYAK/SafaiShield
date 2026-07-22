from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import json
import asyncio
from services.gemini_service import _strip_fences
import google.generativeai as genai
from config import settings

router = APIRouter()

VOICE_PARSER_SYSTEM_PROMPT = """You extract structured safety check-in data from a spoken sentence by a sanitation worker in India. The sentence may be in English, Hindi, Telugu, or Tamil. Extract all fields present. Respond ONLY with valid JSON, no markdown, no explanation:
{
  "site_type": "septic_tank" | "sewer" | "ewaste_pit" | "drain_canal" | null,
  "last_cleaned": "<1week" | "1-4weeks" | "1-6months" | ">6months" | null,
  "recent_rain": true | false | null,
  "depth_feet": number | null,
  "has_ventilation": true | false | null,
  "has_gas_detector": true | false | null
}
If a field is not mentioned in the sentence, set it to null. Do not guess."""

class VoiceParseRequest(BaseModel):
    transcript: str
    language: Optional[str] = "en"

@router.post("/parse-voice-input")
async def parse_voice_input(req: VoiceParseRequest):
    transcript = req.transcript.strip()
    if not transcript:
        return {
            "site_type": None,
            "last_cleaned": None,
            "recent_rain": None,
            "depth_feet": None,
            "has_ventilation": None,
            "has_gas_detector": None,
        }

    # Rule-based offline parser fallback if Gemini fails
    def rule_based_fallback(text: str):
        t_low = text.lower()
        res = {
            "site_type": None,
            "last_cleaned": None,
            "recent_rain": None,
            "depth_feet": None,
            "has_ventilation": None,
            "has_gas_detector": None,
        }
        if "septic" in t_low: res["site_type"] = "septic_tank"
        elif "sewer" in t_low or "manhole" in t_low: res["site_type"] = "sewer"
        elif "ewaste" in t_low or "waste" in t_low: res["site_type"] = "ewaste_pit"
        elif "drain" in t_low or "canal" in t_low: res["site_type"] = "drain_canal"

        if "month" in t_low or "months" in t_low: res["last_cleaned"] = "1-6months"
        elif "week" in t_low: res["last_cleaned"] = "<1week"

        if "no rain" in t_low or "no flood" in t_low: res["recent_rain"] = False
        elif "rain" in t_low or "flood" in t_low: res["recent_rain"] = True

        if "10" in t_low: res["depth_feet"] = 10
        elif "5" in t_low or "6" in t_low: res["depth_feet"] = 5

        if "no ventilation" in t_low or "no blower" in t_low: res["has_ventilation"] = False
        elif "ventilation" in t_low or "blower" in t_low: res["has_ventilation"] = True

        if "no gas" in t_low: res["has_gas_detector"] = False
        elif "gas" in t_low or "detector" in t_low: res["has_gas_detector"] = True

        return res

    try:
        model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            system_instruction=VOICE_PARSER_SYSTEM_PROMPT,
        )
        response = await asyncio.wait_for(
            asyncio.to_thread(
                model.generate_content,
                f"Transcript: {transcript}\nLanguage: {req.language}",
                generation_config={"temperature": 0.1, "max_output_tokens": 300},
            ),
            timeout=4.0,
        )
        clean = _strip_fences(response.text)
        return json.loads(clean)
    except Exception as e:
        print(f"Voice parse Gemini failed, using rule fallback: {e}")
        return rule_based_fallback(transcript)
