\# SafaiShield — Backend PRD  
\# FastAPI · Gemini 2.5 Flash · Supabase · Telegram Bot API  
\# Matches: SafaiShield Frontend PRD v1.0

\---

\#\# 0\. Overview

The backend is a thin FastAPI server with five responsibilities:  
1\. Proxy all Gemini API calls (API key never touches the frontend)  
2\. Proxy all Telegram Bot API calls (bot token never touches the frontend)  
3\. Serve and receive data from Supabase  
4\. Return weather data by proxying OpenWeatherMap (optional — frontend can call  
   this directly with the free key, but routing through backend hides the key)  
5\. Handle the Telegram webhook for incoming bot messages

Everything the frontend calls goes through this server.  
Frontend calls VITE\_API\_URL — every route below is mounted at that base URL.

\---

\#\# 1\. File Structure

safaishield-backend/  
│  
├── main.py                        ← FastAPI app entry point  
├── config.py                      ← All env var loading  
├── requirements.txt  
├── .env.example  
│  
├── routers/  
│   ├── check.py                   ← POST /api/check         (Layer 1 risk)  
│   ├── report.py                  ← POST /api/report        (Layer 3 violation)  
│   ├── jobs.py                    ← POST /api/jobs/sync     (offline job queue)  
│   │                                 GET  /api/jobs/history  
│   ├── map.py                     ← GET  /api/map/points    (danger map data)  
│   │                                 POST /api/map/incident  (Break the Silence)  
│   ├── telegram.py                ← POST /api/telegram/alert  
│   │                                 POST /api/telegram/webhook  
│   │                                 POST /api/telegram/link  
│   ├── weather.py                 ← GET  /api/weather       (optional proxy)  
│   └── companion.py               ← POST /api/companion/session  
│                                     GET  /api/companion/verify/{code}  
│  
├── services/  
│   ├── gemini\_service.py          ← all Gemini API logic  
│   ├── supabase\_service.py        ← all DB read/write logic  
│   ├── telegram\_service.py        ← all Telegram Bot API logic  
│   └── risk\_fallback.py           ← offline rule-based classifier (Python port)  
│  
├── prompts.py                     ← all Gemini system prompts  
├── schemas.py                     ← all Pydantic request/response models  
└── middleware.py                  ← CORS, rate limiting, error handling

\---

\#\# 2\. Environment Variables (.env.example)

GEMINI\_API\_KEY=your\_gemini\_key  
GEMINI\_MODEL=gemini-2.5-flash

SUPABASE\_URL=https://your-project.supabase.co  
SUPABASE\_SERVICE\_KEY=your\_service\_role\_key   \# NOT the anon key — server only

TELEGRAM\_BOT\_TOKEN=your\_bot\_token  
TELEGRAM\_WEBHOOK\_SECRET=random\_secret\_string  \# validates incoming webhooks

OPENWEATHER\_API\_KEY=your\_key                  \# optional if frontend calls directly

CORS\_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:5173

PORT=8000

\---

\#\# 3\. main.py

from fastapi import FastAPI  
from fastapi.middleware.cors import CORSMiddleware  
from routers import check, report, jobs, map, telegram, weather, companion  
from config import settings

app \= FastAPI(title="SafaiShield API", version="1.0.0")

app.add\_middleware(  
    CORSMiddleware,  
    allow\_origins=settings.CORS\_ORIGINS.split(","),  
    allow\_credentials=True,  
    allow\_methods=\["\*"\],  
    allow\_headers=\["\*"\],  
)

app.include\_router(check.router,      prefix="/api")  
app.include\_router(report.router,     prefix="/api")  
app.include\_router(jobs.router,       prefix="/api")  
app.include\_router(map.router,        prefix="/api")  
app.include\_router(telegram.router,   prefix="/api")  
app.include\_router(weather.router,    prefix="/api")  
app.include\_router(companion.router,  prefix="/api")

@app.get("/health")  
def health():  
    return {"status": "ok"}

\---

\#\# 4\. config.py

from pydantic\_settings import BaseSettings

class Settings(BaseSettings):  
    GEMINI\_API\_KEY: str  
    GEMINI\_MODEL: str \= "gemini-2.5-flash"  
    SUPABASE\_URL: str  
    SUPABASE\_SERVICE\_KEY: str  
    TELEGRAM\_BOT\_TOKEN: str  
    TELEGRAM\_WEBHOOK\_SECRET: str \= ""  
    OPENWEATHER\_API\_KEY: str \= ""  
    CORS\_ORIGINS: str \= "http://localhost:5173"

    class Config:  
        env\_file \= ".env"

settings \= Settings()

\---

\#\# 5\. schemas.py — all Pydantic models

from pydantic import BaseModel  
from typing import Optional, List  
from datetime import date, datetime

\# ── Layer 1: Risk Check ──────────────────────────────────────────────────────

class RiskCheckRequest(BaseModel):  
    site\_type: str          \# "septic\_tank" | "sewer" | "ewaste\_pit"  
    last\_cleaned\_date: Optional\[date\] \= None  
    temperature\_c: Optional\[float\] \= None  
    humidity\_pct: Optional\[float\] \= None  
    depth\_feet: Optional\[float\] \= None  
    recent\_rain: Optional\[bool\] \= False  
    has\_gas\_detector: Optional\[bool\] \= False  
    has\_ventilation: Optional\[bool\] \= False  
    language: str \= "en"   \# "en" | "hi" | "te" | "ta"  
    lat: Optional\[float\] \= None  
    lng: Optional\[float\] \= None

class RiskCheckResponse(BaseModel):  
    risk\_tier: str          \# "LOW" | "MEDIUM" | "HIGH"  
    score: int              \# 0-100 numeric (25=low, 55=medium, 85=high)  
    reason\_voice\_line: str  \# max 25 words, in requested language  
    checklist: List\[str\]    \# 2-4 items, in requested language  
    heatstroke\_warning: Optional\[str\] \= None  \# only when temp \> 35°C  
    source: str             \# "gemini" | "offline\_fallback"

\# ── Layer 3: Violation Report ────────────────────────────────────────────────

class ViolationReportRequest(BaseModel):  
    job\_id: Optional\[str\] \= None  
    site\_type: str  
    gear\_confirmed: bool  
    employer\_name: Optional\[str\] \= None  
    location\_text: Optional\[str\] \= None  
    date: str               \# ISO date string  
    language: str \= "en"  
    evidence\_hash: Optional\[str\] \= None  \# SHA-256 from frontend Evidence Locker

class ViolationReportResponse(BaseModel):  
    report\_text: str         \# full 4-6 sentence report in worker's language  
    share\_text\_telegram: str \# shorter 2-3 sentence version for Telegram  
    legal\_citations: List\[str\]  
    namaste\_entitlements: List\[str\]  
    disclaimer: str

\# ── Job Sync ─────────────────────────────────────────────────────────────────

class JobRecord(BaseModel):  
    local\_id: str  
    device\_id: str  
    site\_type: str  
    last\_cleaned\_date: Optional\[str\] \= None  
    risk\_tier: str  
    risk\_reason: str  
    started\_at: str  
    ended\_at: Optional\[str\] \= None  
    gear\_confirmed: Optional\[bool\] \= None  
    employer\_name: Optional\[str\] \= None  
    language: str  
    lat: Optional\[float\] \= None  
    lng: Optional\[float\] \= None  
    evidence\_hash: Optional\[str\] \= None

class JobSyncRequest(BaseModel):  
    jobs: List\[JobRecord\]

class JobSyncResponse(BaseModel):  
    synced: int  
    failed: int  
    ids: List\[str\]

\# ── Danger Map ───────────────────────────────────────────────────────────────

class DangerMapPoint(BaseModel):  
    id: str  
    lat\_rounded: float  
    lng\_rounded: float  
    risk\_tier: str  
    gear\_compliance: bool  
    incident\_count: int  
    site\_type: str  
    month\_year: str

class AnonymousIncidentRequest(BaseModel):  
    lat: float  
    lng: float  
    site\_type: str  
    description: Optional\[str\] \= None  \# free text, optional

\# ── Telegram ─────────────────────────────────────────────────────────────────

class TelegramAlertRequest(BaseModel):  
    telegram\_chat\_id: str  
    alert\_type: str        \# "alarm\_triggered" | "job\_start" | "job\_safe\_exit" | "violation\_report"  
    worker\_name: Optional\[str\] \= None  
    location\_text: Optional\[str\] \= None  
    risk\_tier: Optional\[str\] \= None  
    report\_text: Optional\[str\] \= None  
    timestamp: str

class TelegramLinkRequest(BaseModel):  
    device\_id: str  
    link\_code: str         \# 6-digit code the worker typed from Telegram bot message

\# ── Companion Session ────────────────────────────────────────────────────────

class CompanionSessionRequest(BaseModel):  
    device\_id: str  
    job\_id: str  
    companion\_name: Optional\[str\] \= None

class CompanionVerifyResponse(BaseModel):  
    verified: bool  
    job\_id: str  
    worker\_device\_id: str  
    started\_at: str

\---

\#\# 6\. Gemini System Prompts (prompts.py)

LANGUAGE\_NAMES \= {  
    "en": "English",  
    "hi": "Hindi",  
    "te": "Telugu",  
    "ta": "Tamil",  
}

RISK\_CHECK\_SYSTEM\_PROMPT \= """  
You are a safety risk classifier for sanitation workers in India entering  
confined spaces (sewers, septic tanks, e-waste pits).

You will receive site details as JSON. Respond ONLY with valid JSON —  
no markdown, no code fences, no explanation, no preamble.

Rules for risk classification:  
\- Septic tank unopened \> 30 days → at least MEDIUM  
\- Septic tank unopened \> 90 days → HIGH  
\- Sewer after heavy rain → HIGH (methane and H2S buildup)  
\- Any site, temperature \> 35°C → raise tier by one level (heatstroke \+ gas danger)  
\- Depth \> 15 feet → raise tier by one level  
\- No ventilation \+ HIGH → flag in checklist immediately  
\- E-waste pit: always at least MEDIUM (chemical vapour risk)  
\- Score: LOW=25, MEDIUM=55, HIGH=85

Your response must match this exact JSON schema:  
{  
  "risk\_tier": "LOW" | "MEDIUM" | "HIGH",  
  "score": integer 0-100,  
  "reason\_voice\_line": string (max 25 words, plain spoken tone, in {language}),  
  "checklist": \[string, string, string\] (2 to 4 items, in {language}, short imperative sentences),  
  "heatstroke\_warning": string | null (only when temp\_c \> 35, in {language}, else null)  
}

Never return anything except the JSON object.  
"""

VIOLATION\_REPORT\_SYSTEM\_PROMPT \= """  
You draft a plain-language worker rights violation report in {language}  
for a sanitation worker in India.

The report must:  
1\. State what happened (no gear provided, site type, employer if known, date/location)  
2\. Cite Section 7 of the Prohibition of Employment as Manual Scavengers and their  
   Rehabilitation Act, 2013 — which prohibits employing anyone in hazardous cleaning  
   without safety equipment  
3\. State two NAMASTE scheme entitlements the worker is owed (PPE kit, occupational  
   safety training, health insurance under Ayushman Bharat-PMJAY)  
4\. End with: "This report is not legal advice. Contact NAMASTE helpline 14473 or  
   your local NGO to file a formal complaint."

Respond ONLY with valid JSON, no markdown, no preamble:  
{  
  "report\_text": string (4-6 sentences, in {language}),  
  "share\_text\_telegram": string (2-3 sentences, in {language}, fits in a Telegram message),  
  "legal\_citations": \[string\] (list of exact act/section names cited),  
  "namaste\_entitlements": \[string\] (list of entitlements mentioned),  
  "disclaimer": string (the 'not legal advice' line, in {language})  
}  
"""

\---

\#\# 7\. Gemini Service (services/gemini\_service.py)

import google.generativeai as genai  
import json  
import asyncio  
from config import settings  
from prompts import RISK\_CHECK\_SYSTEM\_PROMPT, VIOLATION\_REPORT\_SYSTEM\_PROMPT, LANGUAGE\_NAMES

genai.configure(api\_key=settings.GEMINI\_API\_KEY)

def \_strip\_fences(text: str) \-\> str:  
    """Strip markdown code fences Gemini sometimes adds despite instructions."""  
    text \= text.strip()  
    if text.startswith("\`\`\`"):  
        text \= text.split("\\n", 1)\[-1\]  
    if text.endswith("\`\`\`"):  
        text \= text.rsplit("\`\`\`", 1)\[0\]  
    return text.strip()

async def call\_gemini(system\_prompt: str, user\_payload: dict, timeout: float \= 4.0) \-\> dict:  
    """  
    Call Gemini 2.5 Flash with a system prompt and user payload.  
    Returns parsed JSON dict or raises ValueError on failure.  
    Enforces a 4-second timeout — if exceeded, caller uses offline fallback.  
    """  
    model \= genai.GenerativeModel(  
        model\_name=settings.GEMINI\_MODEL,  
        system\_instruction=system\_prompt,  
    )  
    user\_message \= json.dumps(user\_payload)

    try:  
        response \= await asyncio.wait\_for(  
            asyncio.to\_thread(  
                model.generate\_content,  
                user\_message,  
                generation\_config={"temperature": 0.1, "max\_output\_tokens": 600},  
            ),  
            timeout=timeout,  
        )  
        raw \= response.text  
        clean \= \_strip\_fences(raw)  
        return json.loads(clean)  
    except asyncio.TimeoutError:  
        raise ValueError("Gemini timeout")  
    except json.JSONDecodeError as e:  
        raise ValueError(f"Gemini returned invalid JSON: {e}")

async def get\_risk\_assessment(payload: dict, language: str) \-\> dict:  
    prompt \= RISK\_CHECK\_SYSTEM\_PROMPT.replace("{language}", LANGUAGE\_NAMES.get(language, "English"))  
    return await call\_gemini(prompt, payload)

async def get\_violation\_report(payload: dict, language: str) \-\> dict:  
    prompt \= VIOLATION\_REPORT\_SYSTEM\_PROMPT.replace("{language}", LANGUAGE\_NAMES.get(language, "English"))  
    return await call\_gemini(prompt, payload)

\---

\#\# 8\. Risk Fallback (services/risk\_fallback.py)

from datetime import date  
from typing import Optional

OFFLINE\_MESSAGES \= {  
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

OFFLINE\_CHECKLIST \= {  
    "en": \["Ventilate before entry", "Keep companion at surface", "No naked flame near opening"\],  
    "hi": \["पहले हवा करें", "साथी को ऊपर रखें", "खुली लौ न लाएं"\],  
    "te": \["ముందు గాలి చేయండి", "సహాయకుడిని పైన ఉంచండి", "బహిరంగ మంట తీసుకురావద్దు"\],  
    "ta": \["முதலில் காற்றோட்டம் செய்யுங்கள்", "துணையை மேலே வையுங்கள்", "திறந்த நெருப்பு வேண்டாம்"\],  
}

def classify\_offline(  
    site\_type: str,  
    last\_cleaned\_date: Optional\[date\],  
    temperature\_c: Optional\[float\],  
    humidity\_pct: Optional\[float\],  
    depth\_feet: Optional\[float\],  
    recent\_rain: bool,  
    has\_gas\_detector: bool,  
    has\_ventilation: bool,  
    language: str \= "en",  
) \-\> dict:  
    score \= 0

    \# Site type base score  
    if site\_type \== "sewer":  
        score \+= 2  
    elif site\_type \== "septic\_tank":  
        if last\_cleaned\_date:  
            days \= (date.today() \- last\_cleaned\_date).days  
            if days \> 90:  
                score \+= 3  
            elif days \> 30:  
                score \+= 2  
            else:  
                score \+= 1  
        else:  
            score \+= 2  \# unknown \= assume older  
    elif site\_type \== "ewaste\_pit":  
        score \+= 1

    \# Environmental modifiers  
    if temperature\_c and temperature\_c \>= 35:  
        score \+= 2  
    elif temperature\_c and temperature\_c \>= 32:  
        score \+= 1  
    if humidity\_pct and humidity\_pct \>= 70:  
        score \+= 1  
    if recent\_rain:  
        score \+= 1  
    if depth\_feet and depth\_feet \> 15:  
        score \+= 1

    \# Safety equipment reduces score  
    if has\_gas\_detector:  
        score \-= 1  
    if has\_ventilation:  
        score \-= 1

    score \= max(0, score)

    if score \>= 4:  
        tier \= "HIGH"  
        numeric\_score \= 85  
    elif score \>= 2:  
        tier \= "MEDIUM"  
        numeric\_score \= 55  
    else:  
        tier \= "LOW"  
        numeric\_score \= 25

    lang \= language if language in OFFLINE\_MESSAGES\["HIGH"\] else "en"

    heatstroke \= None  
    if temperature\_c and temperature\_c \> 35:  
        heatstroke\_msgs \= {  
            "en": "Heatstroke risk HIGH today. Safe window underground reduced to 6 minutes.",  
            "hi": "आज हीटस्ट्रोक का खतरा अधिक है। भूमिगत सुरक्षित समय 6 मिनट है।",  
            "te": "ఈరోజు హీట్‌స్ట్రోక్ ప్రమాదం ఎక్కువ. భూగర్భ సురక్షిత సమయం 6 నిమిషాలు.",  
            "ta": "இன்று வெப்பவாதம் அபாயம் அதிகம். நிலத்தடி பாதுகாப்பான நேரம் 6 நிமிடங்கள்.",  
        }  
        heatstroke \= heatstroke\_msgs.get(lang, heatstroke\_msgs\["en"\])

    return {  
        "risk\_tier": tier,  
        "score": numeric\_score,  
        "reason\_voice\_line": OFFLINE\_MESSAGES\[tier\]\[lang\],  
        "checklist": OFFLINE\_CHECKLIST.get(lang, OFFLINE\_CHECKLIST\["en"\]),  
        "heatstroke\_warning": heatstroke,  
        "source": "offline\_fallback",  
    }

\---

\#\# 9\. Supabase Service (services/supabase\_service.py)

from supabase import create\_client, Client  
from config import settings  
import math

supabase: Client \= create\_client(settings.SUPABASE\_URL, settings.SUPABASE\_SERVICE\_KEY)

def \_round\_coord(val: float, decimals: int \= 2\) \-\> float:  
    """Round to \~1.1km grid. Never store exact GPS in the public table."""  
    return round(val, decimals)

def sync\_jobs(jobs: list\[dict\]) \-\> tuple\[int, int\]:  
    """  
    Upsert jobs to the private jobs table.  
    For each job with a location, also insert an aggregated row into danger\_map\_points.  
    Returns (synced\_count, failed\_count).  
    """  
    synced \= 0  
    failed \= 0  
    for job in jobs:  
        try:  
            \# Write full job to private table  
            supabase.table("jobs").upsert({  
                "local\_id": job\["local\_id"\],  
                "device\_id": job\["device\_id"\],  
                "site\_type": job\["site\_type"\],  
                "last\_cleaned\_date": job.get("last\_cleaned\_date"),  
                "risk\_tier": job\["risk\_tier"\],  
                "risk\_reason": job.get("risk\_reason", ""),  
                "started\_at": job\["started\_at"\],  
                "ended\_at": job.get("ended\_at"),  
                "gear\_confirmed": job.get("gear\_confirmed"),  
                "employer\_name": job.get("employer\_name"),  
                "language": job.get("language", "en"),  
                "evidence\_hash": job.get("evidence\_hash"),  
            }).execute()

            \# Write anonymized point to public map table  
            if job.get("lat") and job.get("lng"):  
                from datetime import datetime  
                month\_year \= datetime.fromisoformat(job\["started\_at"\]).strftime("%Y-%m")  
                supabase.table("danger\_map\_points").insert({  
                    "lat\_rounded": \_round\_coord(job\["lat"\]),  
                    "lng\_rounded": \_round\_coord(job\["lng"\]),  
                    "risk\_tier": job\["risk\_tier"\],  
                    "gear\_compliance": job.get("gear\_confirmed", True),  
                    "site\_type": job\["site\_type"\],  
                    "month\_year": month\_year,  
                }).execute()

            synced \+= 1  
        except Exception:  
            failed \+= 1  
    return synced, failed

def get\_map\_points() \-\> list\[dict\]:  
    """  
    Return aggregated danger map points.  
    Groups by rounded lat/lng \+ site\_type, counts incidents.  
    NEVER returns raw job data or any worker identifier.  
    """  
    result \= supabase.table("danger\_map\_points").select(  
        "lat\_rounded, lng\_rounded, risk\_tier, gear\_compliance, site\_type, month\_year"  
    ).execute()  
    return result.data

def insert\_anonymous\_incident(lat: float, lng: float, site\_type: str) \-\> None:  
    """Break the Silence — anonymous report with no device\_id, no description stored."""  
    from datetime import datetime  
    supabase.table("danger\_map\_points").insert({  
        "lat\_rounded": \_round\_coord(lat),  
        "lng\_rounded": \_round\_coord(lng),  
        "risk\_tier": "HIGH",            \# anonymous incidents default to HIGH  
        "gear\_compliance": False,  
        "site\_type": site\_type,  
        "month\_year": datetime.now().strftime("%Y-%m"),  
    }).execute()

def get\_job\_history(device\_id: str) \-\> list\[dict\]:  
    result \= supabase.table("jobs").select(  
        "local\_id, site\_type, risk\_tier, started\_at, ended\_at, gear\_confirmed, language"  
    ).eq("device\_id", device\_id).order("started\_at", desc=True).limit(50).execute()  
    return result.data

def save\_companion\_session(device\_id: str, job\_id: str, code: str, companion\_name: str | None) \-\> None:  
    supabase.table("companion\_sessions").upsert({  
        "code": code,  
        "device\_id": device\_id,  
        "job\_id": job\_id,  
        "companion\_name": companion\_name,  
        "verified": False,  
    }).execute()

def verify\_companion\_session(code: str) \-\> dict | None:  
    result \= supabase.table("companion\_sessions").select("\*").eq("code", code).single().execute()  
    if result.data:  
        supabase.table("companion\_sessions").update({"verified": True}).eq("code", code).execute()  
    return result.data

def link\_telegram(device\_id: str, telegram\_chat\_id: str) \-\> None:  
    supabase.table("worker\_profiles").upsert({  
        "device\_id": device\_id,  
        "telegram\_chat\_id": telegram\_chat\_id,  
    }).execute()

def get\_telegram\_chat\_id(device\_id: str) \-\> str | None:  
    result \= supabase.table("worker\_profiles").select(  
        "telegram\_chat\_id"  
    ).eq("device\_id", device\_id).maybe\_single().execute()  
    return result.data.get("telegram\_chat\_id") if result.data else None

def save\_link\_code(device\_id: str, code: str) \-\> None:  
    supabase.table("telegram\_link\_codes").upsert({  
        "device\_id": device\_id,  
        "code": code,  
    }).execute()

def get\_device\_id\_by\_link\_code(code: str) \-\> str | None:  
    result \= supabase.table("telegram\_link\_codes").select(  
        "device\_id"  
    ).eq("code", code).maybe\_single().execute()  
    return result.data.get("device\_id") if result.data else None

\---

\#\# 10\. Telegram Service (services/telegram\_service.py)

import httpx  
from config import settings

TELEGRAM\_API \= f"https://api.telegram.org/bot{settings.TELEGRAM\_BOT\_TOKEN}"

ALERT\_TEMPLATES \= {  
    "alarm\_triggered": {  
        "en": "🚨 EMERGENCY — SafaiShield ALARM\\n\\nWorker {name} has not responded for 3+ minutes.\\nLast known location: {location}\\nRisk level: {risk}\\nTime: {timestamp}\\n\\n📞 Call NAMASTE helpline: 14473",  
        "hi": "🚨 आपातकाल — SafaiShield अलार्म\\n\\nकर्मी {name} ने 3+ मिनट से जवाब नहीं दिया।\\nस्थान: {location}\\nखतरा स्तर: {risk}\\nसमय: {timestamp}\\n\\n📞 NAMASTE हेल्पलाइन: 14473",  
        "te": "🚨 అత్యవసర — SafaiShield అలారం\\n\\nకార్మికుడు {name} 3+ నిమిషాల నుండి ప్రతిస్పందించలేదు.\\nస్థానం: {location}\\nప్రమాద స్థాయి: {risk}\\nసమయం: {timestamp}\\n\\n📞 NAMASTE హెల్ప్‌లైన్: 14473",  
        "ta": "🚨 அவசரநிலை — SafaiShield அலாரம்\\n\\nதொழிலாளி {name} 3+ நிமிடங்களாக பதிலளிக்கவில்லை.\\nஇடம்: {location}\\nஆபத்து நிலை: {risk}\\nநேரம்: {timestamp}\\n\\n📞 NAMASTE உதவி எண்: 14473",  
    },  
    "job\_start": {  
        "en": "✅ SafaiShield — Job Started\\n\\nWorker {name} has entered a {site\_type}.\\nRisk level: {risk}\\nTime: {timestamp}\\nAlarm is active. You will be notified if they stop responding.",  
    },  
    "job\_safe\_exit": {  
        "en": "✅ SafaiShield — Safe Exit\\n\\nWorker {name} has exited safely.\\nTime: {timestamp}",  
    },  
    "violation\_report": {  
        "en": "📋 SafaiShield — Violation Report\\n\\n{report}\\n\\n📞 NAMASTE helpline: 14473",  
    },  
}

async def send\_telegram\_message(chat\_id: str, text: str) \-\> bool:  
    async with httpx.AsyncClient() as client:  
        try:  
            resp \= await client.post(  
                f"{TELEGRAM\_API}/sendMessage",  
                json={"chat\_id": chat\_id, "text": text, "parse\_mode": "HTML"},  
                timeout=5.0,  
            )  
            return resp.status\_code \== 200  
        except Exception:  
            return False

def build\_alert\_message(alert\_type: str, language: str, \*\*kwargs) \-\> str:  
    templates \= ALERT\_TEMPLATES.get(alert\_type, {})  
    lang \= language if language in templates else "en"  
    template \= templates.get(lang, templates.get("en", "SafaiShield Alert"))  
    return template.format(\*\*{k: v or "Unknown" for k, v in kwargs.items()})

\---

\#\# 11\. Routers

\#\#\# routers/check.py — POST /api/check

from fastapi import APIRouter  
from schemas import RiskCheckRequest, RiskCheckResponse  
from services.gemini\_service import get\_risk\_assessment  
from services.risk\_fallback import classify\_offline

router \= APIRouter()

@router.post("/check", response\_model=RiskCheckResponse)  
async def risk\_check(req: RiskCheckRequest):  
    payload \= req.model\_dump()  
    try:  
        result \= await get\_risk\_assessment(payload, req.language)  
        result\["source"\] \= "gemini"  
        return result  
    except Exception:  
        \# Gemini failed or timed out — use offline rule classifier  
        return classify\_offline(  
            site\_type=req.site\_type,  
            last\_cleaned\_date=req.last\_cleaned\_date,  
            temperature\_c=req.temperature\_c,  
            humidity\_pct=req.humidity\_pct,  
            depth\_feet=req.depth\_feet,  
            recent\_rain=req.recent\_rain or False,  
            has\_gas\_detector=req.has\_gas\_detector or False,  
            has\_ventilation=req.has\_ventilation or False,  
            language=req.language,  
        )

\#\#\# routers/report.py — POST /api/report

from fastapi import APIRouter  
from schemas import ViolationReportRequest, ViolationReportResponse  
from services.gemini\_service import get\_violation\_report

router \= APIRouter()

@router.post("/report", response\_model=ViolationReportResponse)  
async def violation\_report(req: ViolationReportRequest):  
    payload \= req.model\_dump()  
    try:  
        result \= await get\_violation\_report(payload, req.language)  
        return result  
    except Exception:  
        \# Fallback: return static hardcoded report in English  
        return {  
            "report\_text": (  
                f"On {req.date}, a worker entered a {req.site\_type} without protective gear. "  
                "This violates Section 7 of the Prohibition of Employment as Manual Scavengers "  
                "and their Rehabilitation Act, 2013\. Under the NAMASTE scheme, workers are "  
                "entitled to a PPE kit, occupational safety training, and health insurance. "  
                "Please contact the NAMASTE helpline 14473 to file a formal complaint."  
            ),  
            "share\_text\_telegram": (  
                f"Violation on {req.date}: Worker entered {req.site\_type} without gear. "  
                "Violates Manual Scavengers Act 2013, Section 7\. Contact 14473."  
            ),  
            "legal\_citations": \["Section 7, Prohibition of Employment as Manual Scavengers and their Rehabilitation Act, 2013"\],  
            "namaste\_entitlements": \["PPE kit", "Occupational safety training", "Ayushman Bharat health insurance"\],  
            "disclaimer": "This is not legal advice. Contact NAMASTE helpline 14473 or your local NGO to file a formal complaint.",  
        }

\#\#\# routers/jobs.py — POST /api/jobs/sync \+ GET /api/jobs/history

from fastapi import APIRouter, Query  
from schemas import JobSyncRequest, JobSyncResponse  
from services.supabase\_service import sync\_jobs, get\_job\_history

router \= APIRouter()

@router.post("/jobs/sync", response\_model=JobSyncResponse)  
async def sync\_jobs\_route(req: JobSyncRequest):  
    synced, failed \= sync\_jobs(\[j.model\_dump() for j in req.jobs\])  
    return {"synced": synced, "failed": failed, "ids": \[j.local\_id for j in req.jobs\]}

@router.get("/jobs/history")  
async def job\_history(device\_id: str \= Query(...)):  
    return get\_job\_history(device\_id)

\#\#\# routers/map.py — GET /api/map/points \+ POST /api/map/incident

from fastapi import APIRouter  
from schemas import AnonymousIncidentRequest  
from services.supabase\_service import get\_map\_points, insert\_anonymous\_incident

router \= APIRouter()

@router.get("/map/points")  
async def map\_points():  
    return get\_map\_points()

@router.post("/map/incident")  
async def anonymous\_incident(req: AnonymousIncidentRequest):  
    \# Break the Silence — no device\_id, no description stored  
    insert\_anonymous\_incident(req.lat, req.lng, req.site\_type)  
    return {"status": "reported"}

\#\#\# routers/telegram.py — POST /api/telegram/alert \+ webhook \+ link

from fastapi import APIRouter, Request, HTTPException  
from schemas import TelegramAlertRequest, TelegramLinkRequest  
from services.telegram\_service import send\_telegram\_message, build\_alert\_message  
from services.supabase\_service import (  
    get\_telegram\_chat\_id, link\_telegram,  
    save\_link\_code, get\_device\_id\_by\_link\_code  
)  
from config import settings  
import random  
import string

router \= APIRouter()

@router.post("/telegram/alert")  
async def telegram\_alert(req: TelegramAlertRequest):  
    text \= build\_alert\_message(  
        alert\_type=req.alert\_type,  
        language="en",  \# alerts always in English to companion; worker language for reports  
        name=req.worker\_name or "Worker",  
        location=req.location\_text or "Unknown",  
        risk=req.risk\_tier or "UNKNOWN",  
        timestamp=req.timestamp,  
        report=req.report\_text or "",  
        site\_type="",  
    )  
    sent \= await send\_telegram\_message(req.telegram\_chat\_id, text)  
    return {"sent": sent}

@router.post("/telegram/link")  
async def link\_telegram\_account(req: TelegramLinkRequest):  
    """  
    Worker enters the 6-digit code they got from the Telegram bot.  
    We look up that code, find the chat\_id it corresponds to, and save the link.  
    """  
    chat\_id\_row \= get\_device\_id\_by\_link\_code(req.link\_code)  
    if not chat\_id\_row:  
        raise HTTPException(status\_code=404, detail="Code not found or expired")  
    \# The chat\_id was stored when the bot received /start from the user  
    \# We stored it in telegram\_link\_codes as (code, device\_id=pending, chat\_id)  
    \# See webhook handler below  
    return {"status": "linked"}

@router.post("/telegram/generate-link-code")  
async def generate\_link\_code(device\_id: str):  
    """Frontend calls this to get a 6-digit code to show the worker."""  
    code \= "".join(random.choices(string.digits, k=6))  
    save\_link\_code(device\_id, code)  
    return {"code": code, "bot\_username": "SafaiShieldBot"}

@router.post("/telegram/webhook")  
async def telegram\_webhook(request: Request):  
    """  
    Receive messages from Telegram bot.  
    When a user sends /start CODE to the bot, we link their chat\_id to the device\_id.  
    """  
    secret \= request.headers.get("X-Telegram-Bot-Api-Secret-Token")  
    if settings.TELEGRAM\_WEBHOOK\_SECRET and secret \!= settings.TELEGRAM\_WEBHOOK\_SECRET:  
        raise HTTPException(status\_code=403, detail="Invalid secret")

    body \= await request.json()  
    message \= body.get("message", {})  
    text \= message.get("text", "")  
    chat\_id \= str(message.get("chat", {}).get("id", ""))

    if text.startswith("/start") and chat\_id:  
        parts \= text.split()  
        if len(parts) \== 2:  
            code \= parts\[1\]  
            \# Look up device\_id by code, then link  
            \# Store chat\_id against this code so /api/telegram/link can find it  
            from services.supabase\_service import supabase  
            supabase.table("telegram\_link\_codes").update(  
                {"telegram\_chat\_id": chat\_id}  
            ).eq("code", code).execute()  
            await send\_telegram\_message(  
                chat\_id,  
                "✅ SafaiShield linked\! You will receive emergency alerts here.\\n\\nकनेक्ट हो गया। / అనుసంధానించబడింది. / இணைக்கப்பட்டது."  
            )

    return {"ok": True}

\#\#\# routers/companion.py — Buddy Verification

from fastapi import APIRouter  
from schemas import CompanionSessionRequest, CompanionVerifyResponse  
from services.supabase\_service import save\_companion\_session, verify\_companion\_session  
import random, string

router \= APIRouter()

@router.post("/companion/session")  
async def create\_companion\_session(req: CompanionSessionRequest):  
    """Worker's phone generates a 6-char code. Companion scans QR or types code."""  
    code \= "".join(random.choices(string.ascii\_uppercase \+ string.digits, k=6))  
    save\_companion\_session(req.device\_id, req.job\_id, code, req.companion\_name)  
    return {"code": code, "qr\_data": f"https://safaishield.app/companion/{code}"}

@router.get("/companion/verify/{code}", response\_model=CompanionVerifyResponse)  
async def verify\_companion(code: str):  
    session \= verify\_companion\_session(code)  
    if not session:  
        from fastapi import HTTPException  
        raise HTTPException(status\_code=404, detail="Session not found")  
    return {  
        "verified": True,  
        "job\_id": session\["job\_id"\],  
        "worker\_device\_id": session\["device\_id"\],  
        "started\_at": session.get("created\_at", ""),  
    }

\#\#\# routers/weather.py — GET /api/weather (optional proxy)

from fastapi import APIRouter, Query  
import httpx  
from config import settings

router \= APIRouter()

@router.get("/weather")  
async def get\_weather(lat: float \= Query(...), lng: float \= Query(...)):  
    if not settings.OPENWEATHER\_API\_KEY:  
        return {"error": "Weather API not configured", "temperature\_c": None, "humidity\_pct": None}  
    url \= (  
        f"https://api.openweathermap.org/data/2.5/weather"  
        f"?lat={lat}\&lon={lng}\&appid={settings.OPENWEATHER\_API\_KEY}\&units=metric"  
    )  
    async with httpx.AsyncClient() as client:  
        resp \= await client.get(url, timeout=3.0)  
        data \= resp.json()  
    return {  
        "temperature\_c": data.get("main", {}).get("temp"),  
        "humidity\_pct": data.get("main", {}).get("humidity"),  
        "recent\_rain": "rain" in data,  
    }

\---

\#\# 12\. Supabase Schema (run in Supabase SQL editor)

\-- Private job records (never exposed to public via API without auth)  
create table jobs (  
  id            uuid primary key default gen\_random\_uuid(),  
  local\_id      text unique not null,  
  device\_id     text not null,  
  site\_type     text check (site\_type in ('septic\_tank','sewer','ewaste\_pit')),  
  last\_cleaned\_date date,  
  risk\_tier     text check (risk\_tier in ('LOW','MEDIUM','HIGH')),  
  risk\_reason   text,  
  started\_at    timestamptz,  
  ended\_at      timestamptz,  
  gear\_confirmed boolean,  
  employer\_name text,  
  language      text default 'en',  
  evidence\_hash text,  
  synced\_at     timestamptz default now()  
);

\-- Public aggregated map points — NO worker ID, NO exact coords  
create table danger\_map\_points (  
  id              uuid primary key default gen\_random\_uuid(),  
  lat\_rounded     numeric(5,2) not null,  
  lng\_rounded     numeric(5,2) not null,  
  risk\_tier       text,  
  gear\_compliance boolean,  
  site\_type       text,  
  month\_year      text,  
  created\_at      timestamptz default now()  
);

\-- Worker profile (Telegram link only, no caste/name required)  
create table worker\_profiles (  
  device\_id         text primary key,  
  telegram\_chat\_id  text,  
  language          text default 'en',  
  created\_at        timestamptz default now()  
);

\-- Telegram link codes (short-lived)  
create table telegram\_link\_codes (  
  code              text primary key,  
  device\_id         text not null,  
  telegram\_chat\_id  text,  
  created\_at        timestamptz default now()  
);

\-- Companion sessions for buddy verification  
create table companion\_sessions (  
  code          text primary key,  
  device\_id     text not null,  
  job\_id        text not null,  
  companion\_name text,  
  verified      boolean default false,  
  created\_at    timestamptz default now()  
);

\-- RLS: danger\_map\_points is public read, insert only via service key  
alter table danger\_map\_points enable row level security;  
create policy "public read" on danger\_map\_points for select using (true);

\-- jobs table: private, no public access at all  
alter table jobs enable row level security;

\-- telegram\_link\_codes: expire after 10 min (handle in application logic or a cron)

\---

\#\# 13\. requirements.txt

fastapi==0.115.0  
uvicorn\[standard\]==0.30.6  
pydantic==2.8.2  
pydantic-settings==2.4.0  
google-generativeai==0.8.3  
supabase==2.7.4  
httpx==0.27.2  
python-dotenv==1.0.1

\---

\#\# 14\. Deployment

Deploy to Render (free tier) or Railway (free trial):

Render settings:  
  Build command:   pip install \-r requirements.txt  
  Start command:   uvicorn main:app \--host 0.0.0.0 \--port $PORT  
  Environment:     Set all .env vars in the Render dashboard

After deploy, register the Telegram webhook once:  
  curl \-X POST "https://api.telegram.org/bot{TOKEN}/setWebhook" \\  
    \-H "Content-Type: application/json" \\  
    \-d '{  
      "url": "https://your-render-url.onrender.com/api/telegram/webhook",  
      "secret\_token": "your\_TELEGRAM\_WEBHOOK\_SECRET"  
    }'

\---

\#\# 15\. API Summary (what the frontend calls)

POST  /api/check                      Layer 1 risk assessment  
POST  /api/report                     Layer 3 violation report generation  
POST  /api/jobs/sync                  Offline job queue flush  
GET   /api/jobs/history?device\_id=X   Job history for profile page  
GET   /api/map/points                 All danger map points (public)  
POST  /api/map/incident               Break the Silence anonymous report  
POST  /api/telegram/alert             Send emergency Telegram message  
POST  /api/telegram/generate-link-code  Get 6-digit code for bot linking  
POST  /api/telegram/link              Confirm code after bot /start  
POST  /api/telegram/webhook           Telegram bot incoming message handler  
POST  /api/companion/session          Create buddy verification session \+ QR code  
GET   /api/companion/verify/{code}    Companion scans QR, confirms presence  
GET   /api/weather?lat=X\&lng=Y        Weather proxy (optional)  
GET   /health                         Health check  
