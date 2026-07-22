from fastapi import APIRouter, Query
import httpx
from config import settings

router = APIRouter()


@router.get("/weather")
async def get_weather(lat: float = Query(...), lng: float = Query(...)):
    if not settings.OPENWEATHER_API_KEY:
        return {"error": "Weather API not configured", "temperature_c": None, "humidity_pct": None}
    url = (
        f"https://api.openweathermap.org/data/2.5/weather"
        f"?lat={lat}&lon={lng}&appid={settings.OPENWEATHER_API_KEY}&units=metric"
    )
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, timeout=3.0)
        data = resp.json()
    return {
        "temperature_c": data.get("main", {}).get("temp"),
        "humidity_pct": data.get("main", {}).get("humidity"),
        "recent_rain": "rain" in data,
    }
