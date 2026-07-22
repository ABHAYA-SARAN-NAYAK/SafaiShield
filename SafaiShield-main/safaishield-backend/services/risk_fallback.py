from datetime import date
from typing import Optional


OFFLINE_MESSAGES = {
    "HIGH": {
        "en": "High risk. Do not enter without ventilation and a companion at the surface.",
        "hi": "उच्च खतरा। बिना हवा और साथी के प्रवेश न करें।",
        "te": "అధిక ప్రమాదం. వెంటిలేషన్ మరియు సహాయకుడు లేకుండా లోపలికి వెళ్ళవద్దు.",
        "ta": "அதிக அபாயம். காற்றோட்டம் மற்றும் துணை இல்லாமல் நுழையாதீர்கள்.",
    },
    "MEDIUM": {
        "en": "Medium risk. Ventilate for 15 minutes before entry. Do not go alone.",
        "hi": "मध्यम खतरा। प्रवेश से पहले 15 मिनट हवा दें। अकेले न जाएं।",
        "te": "మధ్యమ ప్రమాదం. లోపలికి వెళ్ళే ముందు 15 నిమిషాలు గాలి చేయండి.",
        "ta": "நடுத்தர அபாயம். நுழைவதற்கு முன் 15 நிமிடங்கள் காற்றோட்டம் செய்யுங்கள்.",
    },
    "LOW": {
        "en": "Lower risk, but never enter alone. Keep the alarm active at the surface.",
        "hi": "कम खतरा, लेकिन अकेले प्रवेश न करें। अलार्म चालू रखें।",
        "te": "తక్కువ ప్రమాదం, కానీ ఒంటరిగా వెళ్ళవద్దు. అలారం చాలించండి.",
        "ta": "குறைந்த அபாயம், ஆனால் தனியாக நுழையாதீர்கள். அலாரம் இயக்கி வையுங்கள்.",
    },
}

OFFLINE_CHECKLIST = {
    "en": ["Ventilate before entry", "Keep companion at surface", "No naked flame near opening"],
    "hi": ["पहले हवा करें", "साथी को ऊपर रखें", "खुली लौ न लाएं"],
    "te": ["ముందు గాలి చేయండి", "సహాయకుడిని పైన ఉంచండి", "బహిరంగ మంట తీసుకురావద్దు"],
    "ta": ["முதலில் காற்றோட்டம் செய்யுங்கள்", "துணையை மேலே வையுங்கள்", "திறந்த நெருப்பு வேண்டாம்"],
}


def classify_offline(
    site_type: str,
    last_cleaned_date: Optional[date],
    temperature_c: Optional[float],
    humidity_pct: Optional[float],
    depth_feet: Optional[float],
    recent_rain: bool,
    has_gas_detector: bool,
    has_ventilation: bool,
    language: str = "en",
) -> dict:
    score = 0

    # Site type base score
    if site_type == "sewer":
        score += 2
    elif site_type == "septic_tank":
        if last_cleaned_date:
            days = (date.today() - last_cleaned_date).days
            if days > 90:
                score += 3
            elif days > 30:
                score += 2
            else:
                score += 1
        else:
            score += 2  # unknown = assume older
    elif site_type == "ewaste_pit":
        score += 1

    # Environmental modifiers
    if temperature_c and temperature_c >= 35:
        score += 2
    elif temperature_c and temperature_c >= 32:
        score += 1
    if humidity_pct and humidity_pct >= 70:
        score += 1
    if recent_rain:
        score += 1
    if depth_feet and depth_feet > 15:
        score += 1

    # Safety equipment reduces score
    if has_gas_detector:
        score -= 1
    if has_ventilation:
        score -= 1

    score = max(0, score)

    if score >= 4:
        tier = "HIGH"
        numeric_score = 85
    elif score >= 2:
        tier = "MEDIUM"
        numeric_score = 55
    else:
        tier = "LOW"
        numeric_score = 25

    lang = language if language in OFFLINE_MESSAGES["HIGH"] else "en"

    heatstroke = None
    if temperature_c and temperature_c > 35:
        heatstroke_msgs = {
            "en": "Heatstroke risk is HIGH today. Underground spaces trap heat. Safe window reduced to 6 minutes.",
            "hi": "आज हीटस्ट्रोक का खतरा अधिक है। भूमिगत स्थान गर्मी को फंसाते हैं। सुरक्षित समय 6 मिनट तक कम हो गया है।",
            "te": "ఈరోజు హీట్‌స్ట్రోక్ ప్రమాదం ఎక్కువ. భూగర్భ ప్రదేశాలు వేడిని పట్టి ఉంచుతాయి. సురక్షిత సమయం 6 నిమిషాలకు తగ్గించబడింది.",
            "ta": "இன்று வெப்பவாதம் அபாயம் அதிகம். நிலத்தடி இடங்கள் வெப்பத்தைப் பிடிக்கும். பாதுகாப்பான நேரம் 6 நிமிடங்களாகக் குறைக்கப்பட்டுள்ளது.",
        }
        heatstroke = heatstroke_msgs.get(lang, heatstroke_msgs["en"])

    return {
        "risk_tier": tier,
        "score": numeric_score,
        "risk_score": numeric_score,
        "safe_entry_time_minutes": 6,
        "safe_window_minutes": 6,
        "reason_voice_line": OFFLINE_MESSAGES[tier][lang],
        "checklist": OFFLINE_CHECKLIST.get(lang, OFFLINE_CHECKLIST["en"]),
        "heatstroke_warning": heatstroke,
        "source": "offline_fallback",
    }
