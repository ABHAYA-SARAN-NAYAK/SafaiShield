from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


# ── Layer 1: Risk Check ──────────────────────────────────────────────────────

class RiskCheckRequest(BaseModel):
    site_type: str          # "septic_tank" | "sewer" | "ewaste_pit"
    last_cleaned_date: Optional[date] = None
    temperature_c: Optional[float] = None
    humidity_pct: Optional[float] = None
    depth_feet: Optional[float] = None
    recent_rain: Optional[bool] = False
    has_gas_detector: Optional[bool] = False
    has_ventilation: Optional[bool] = False
    language: str = "en"    # "en" | "hi" | "te" | "ta"
    lat: Optional[float] = None
    lng: Optional[float] = None


class RiskCheckResponse(BaseModel):
    risk_tier: str          # "LOW" | "MEDIUM" | "HIGH"
    score: int              # 0-100 numeric (25=low, 55=medium, 85=high)
    risk_score: Optional[int] = None
    safe_entry_time_minutes: Optional[int] = 6
    safe_window_minutes: Optional[int] = 6
    reason_voice_line: str  # max 25 words, in requested language
    checklist: List[str]    # 2-4 items, in requested language
    heatstroke_warning: Optional[str] = None  # only when temp > 35°C
    source: str             # "gemini" | "offline_fallback"



# ── Layer 3: Violation Report ────────────────────────────────────────────────

class ViolationReportRequest(BaseModel):
    job_id: Optional[str] = None
    site_type: str
    gear_confirmed: bool
    employer_name: Optional[str] = None
    location_text: Optional[str] = None
    date: str               # ISO date string
    language: str = "en"
    evidence_hash: Optional[str] = None  # SHA-256 from frontend Evidence Locker


class ViolationReportResponse(BaseModel):
    report_text: str         # full 4-6 sentence report in worker's language
    share_text_telegram: str # shorter 2-3 sentence version for Telegram
    legal_citations: List[str]
    namaste_entitlements: List[str]
    disclaimer: str


# ── Job Sync ─────────────────────────────────────────────────────────────────

class JobRecord(BaseModel):
    local_id: str
    device_id: str
    site_type: str
    last_cleaned_date: Optional[str] = None
    risk_tier: str
    risk_reason: str
    started_at: str
    ended_at: Optional[str] = None
    gear_confirmed: Optional[bool] = None
    employer_name: Optional[str] = None
    language: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    evidence_hash: Optional[str] = None


class JobSyncRequest(BaseModel):
    jobs: List[JobRecord]


class JobSyncResponse(BaseModel):
    synced: int
    failed: int
    ids: List[str]


# ── Danger Map ───────────────────────────────────────────────────────────────

class DangerMapPoint(BaseModel):
    id: str
    lat_rounded: float
    lng_rounded: float
    risk_tier: str
    gear_compliance: bool
    incident_count: int
    site_type: str
    month_year: str


class AnonymousIncidentRequest(BaseModel):
    lat: float
    lng: float
    site_type: str
    description: Optional[str] = None  # free text, optional


# ── Telegram ─────────────────────────────────────────────────────────────────

class TelegramAlertRequest(BaseModel):
    telegram_chat_id: Optional[str] = None
    device_id: Optional[str] = None
    alert_type: str        # "alarm_triggered" | "job_start" | "job_safe_exit" | "violation_report"
    site_type: Optional[str] = None
    worker_name: Optional[str] = None
    location_text: Optional[str] = None
    risk_tier: Optional[str] = None
    report_text: Optional[str] = None
    timestamp: str


class TelegramLinkRequest(BaseModel):
    device_id: str
    link_code: str         # 6-digit code the worker typed from Telegram bot message


class TelegramGenerateLinkCodeRequest(BaseModel):
    device_id: str


# ── Companion Session ────────────────────────────────────────────────────────

class CompanionSessionRequest(BaseModel):
    device_id: str
    job_id: str
    companion_name: Optional[str] = None


class CompanionVerifyResponse(BaseModel):
    verified: bool
    job_id: str
    worker_device_id: str
    started_at: str
