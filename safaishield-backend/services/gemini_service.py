import google.generativeai as genai
import json
import asyncio
from config import settings
from prompts import RISK_CHECK_SYSTEM_PROMPT, VIOLATION_REPORT_SYSTEM_PROMPT, LANGUAGE_NAMES

genai.configure(api_key=settings.GEMINI_API_KEY)


def _strip_fences(text: str) -> str:
    """Strip markdown code fences Gemini sometimes adds despite instructions."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
    if text.endswith("```"):
        text = text.rsplit("```", 1)[0]
    return text.strip()


async def call_gemini(system_prompt: str, user_payload: dict, timeout: float = 4.0) -> dict:
    """
    Call Gemini 2.5 Flash with a system prompt and user payload.
    Returns parsed JSON dict or raises ValueError on failure.
    Enforces a 4-second timeout — if exceeded, caller uses offline fallback.
    """
    model = genai.GenerativeModel(
        model_name=settings.GEMINI_MODEL,
        system_instruction=system_prompt,
    )
    user_message = json.dumps(user_payload)

    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(
                model.generate_content,
                user_message,
                generation_config={"temperature": 0.1, "max_output_tokens": 600},
            ),
            timeout=timeout,
        )
        raw = response.text
        clean = _strip_fences(raw)
        return json.loads(clean)
    except asyncio.TimeoutError:
        raise ValueError("Gemini timeout")
    except json.JSONDecodeError as e:
        raise ValueError(f"Gemini returned invalid JSON: {e}")


async def get_risk_assessment(payload: dict, language: str) -> dict:
    prompt = RISK_CHECK_SYSTEM_PROMPT.replace("{language}", LANGUAGE_NAMES.get(language, "English"))
    return await call_gemini(prompt, payload)


async def get_violation_report(payload: dict, language: str) -> dict:
    prompt = VIOLATION_REPORT_SYSTEM_PROMPT.replace("{language}", LANGUAGE_NAMES.get(language, "English"))
    return await call_gemini(prompt, payload)
