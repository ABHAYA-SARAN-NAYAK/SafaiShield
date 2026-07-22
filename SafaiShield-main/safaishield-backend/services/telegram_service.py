import httpx
from config import settings

TELEGRAM_API = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}"

ALERT_TEMPLATES = {
    "alarm_triggered": {
        "en": "🚨 EMERGENCY — SafaiShield ALARM\n\nWorker {name} has not responded for 3+ minutes.\nLast known location: {location}\nRisk level: {risk}\nTime: {timestamp}\n\n📞 Call NAMASTE helpline: 14473",
        "hi": "🚨 आपातकाल — SafaiShield अलार्म\n\nकर्मी {name} ने 3+ मिनट से जवाब नहीं दिया।\nस्थान: {location}\nखतरा स्तर: {risk}\nसमय: {timestamp}\n\n📞 NAMASTE हेल्पलाइन: 14473",
        "te": "🚨 అత్యవసర — SafaiShield అలారం\n\nకార్మికుడు {name} 3+ నిమిషాల నుండి ప్రతిస్పందించలేదు.\nస్థానం: {location}\nప్రమాద స్థాయి: {risk}\nసమయం: {timestamp}\n\n📞 NAMASTE హెల్ప్‌లైన్: 14473",
        "ta": "🚨 அவசரநிலை — SafaiShield அலாரம்\n\nதொழிலாளி {name} 3+ நிமிடங்களாக பதிலளிக்கவில்லை.\nஇடம்: {location}\nஆபத்து நிலை: {risk}\nநேரம்: {timestamp}\n\n📞 NAMASTE உதவி எண்: 14473",
    },
    "job_start": {
        "en": "✅ SafaiShield — Job Started\n\nWorker {name} has entered a {site_type}.\nRisk level: {risk}\nTime: {timestamp}\nAlarm is active. You will be notified if they stop responding.",
    },
    "job_safe_exit": {
        "en": "✅ SafaiShield — Safe Exit\n\nWorker {name} has exited safely.\nTime: {timestamp}",
    },
    "violation_report": {
        "en": "📋 SafaiShield — Violation Report\n\n{report}\n\n📞 NAMASTE helpline: 14473",
    },
}


async def send_telegram_message(chat_id: str, text: str) -> bool:
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{TELEGRAM_API}/sendMessage",
                json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"},
                timeout=5.0,
            )
            return resp.status_code == 200
        except Exception:
            return False


def build_alert_message(alert_type: str, language: str, **kwargs) -> str:
    templates = ALERT_TEMPLATES.get(alert_type, {})
    lang = language if language in templates else "en"
    template = templates.get(lang, templates.get("en", "SafaiShield Alert"))
    return template.format(**{k: v or "Unknown" for k, v in kwargs.items()})
