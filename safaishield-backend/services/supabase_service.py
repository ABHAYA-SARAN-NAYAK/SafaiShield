from supabase import create_client, Client
from config import settings
from datetime import datetime

supabase = None
try:
    if "placeholder" not in settings.SUPABASE_URL and "placeholder" not in settings.SUPABASE_SERVICE_KEY:
        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
except Exception as e:
    print(f"Warning: Supabase client initialization failed: {e}")



def _check_supabase():
    if supabase is None:
        raise RuntimeError("Supabase is not configured. Please supply valid SUPABASE_URL and SUPABASE_SERVICE_KEY in .env.")


def _round_coord(val: float, decimals: int = 2) -> float:
    """Round to ~1.1km grid. Never store exact GPS in the public table."""
    return round(val, decimals)


def sync_jobs(jobs: list[dict]) -> tuple[int, int]:
    _check_supabase()
    synced = 0
    failed = 0
    for job in jobs:
        try:
            # Write full job to private table
            supabase.table("jobs").upsert({
                "local_id": job["local_id"],
                "device_id": job["device_id"],
                "site_type": job["site_type"],
                "last_cleaned_date": job.get("last_cleaned_date"),
                "risk_tier": job["risk_tier"],
                "risk_reason": job.get("risk_reason", ""),
                "started_at": job["started_at"],
                "ended_at": job.get("ended_at"),
                "gear_confirmed": job.get("gear_confirmed"),
                "employer_name": job.get("employer_name"),
                "language": job.get("language", "en"),
                "evidence_hash": job.get("evidence_hash"),
            }).execute()

            # Write anonymized point to public map table
            if job.get("lat") and job.get("lng"):
                month_year = datetime.fromisoformat(job["started_at"]).strftime("%Y-%m")
                supabase.table("danger_map_points").insert({
                    "lat_rounded": _round_coord(job["lat"]),
                    "lng_rounded": _round_coord(job["lng"]),
                    "risk_tier": job["risk_tier"],
                    "gear_compliance": job.get("gear_confirmed", True),
                    "site_type": job["site_type"],
                    "month_year": month_year,
                }).execute()

            synced += 1
        except Exception:
            failed += 1
    return synced, failed


SEED_MAP_POINTS = [
    {"lat_rounded": 17.38, "lng_rounded": 78.47, "risk_tier": "HIGH", "gear_compliance": False, "site_type": "septic_tank", "month_year": "2026-07"},
    {"lat_rounded": 17.44, "lng_rounded": 78.38, "risk_tier": "MEDIUM", "gear_compliance": False, "site_type": "sewer", "month_year": "2026-07"},
    {"lat_rounded": 13.08, "lng_rounded": 80.27, "risk_tier": "HIGH", "gear_compliance": False, "site_type": "septic_tank", "month_year": "2026-07"},
    {"lat_rounded": 13.05, "lng_rounded": 80.25, "risk_tier": "HIGH", "gear_compliance": False, "site_type": "sewer", "month_year": "2026-07"},
    {"lat_rounded": 19.07, "lng_rounded": 72.87, "risk_tier": "HIGH", "gear_compliance": False, "site_type": "sewer", "month_year": "2026-07"},
    {"lat_rounded": 19.02, "lng_rounded": 72.85, "risk_tier": "MEDIUM", "gear_compliance": True, "site_type": "ewaste_pit", "month_year": "2026-07"},
    {"lat_rounded": 28.66, "lng_rounded": 77.22, "risk_tier": "HIGH", "gear_compliance": False, "site_type": "sewer", "month_year": "2026-07"},
    {"lat_rounded": 28.70, "lng_rounded": 77.10, "risk_tier": "HIGH", "gear_compliance": False, "site_type": "septic_tank", "month_year": "2026-07"},
    {"lat_rounded": 12.97, "lng_rounded": 77.59, "risk_tier": "MEDIUM", "gear_compliance": False, "site_type": "septic_tank", "month_year": "2026-07"},
    {"lat_rounded": 12.93, "lng_rounded": 77.62, "risk_tier": "HIGH", "gear_compliance": False, "site_type": "sewer", "month_year": "2026-07"},
    {"lat_rounded": 18.52, "lng_rounded": 73.85, "risk_tier": "MEDIUM", "gear_compliance": True, "site_type": "sewer", "month_year": "2026-07"},
    {"lat_rounded": 22.57, "lng_rounded": 88.36, "risk_tier": "HIGH", "gear_compliance": False, "site_type": "septic_tank", "month_year": "2026-07"},
    {"lat_rounded": 23.02, "lng_rounded": 72.57, "risk_tier": "HIGH", "gear_compliance": False, "site_type": "sewer", "month_year": "2026-07"},
    {"lat_rounded": 26.85, "lng_rounded": 80.94, "risk_tier": "MEDIUM", "gear_compliance": False, "site_type": "septic_tank", "month_year": "2026-07"},
    {"lat_rounded": 25.61, "lng_rounded": 85.14, "risk_tier": "HIGH", "gear_compliance": False, "site_type": "sewer", "month_year": "2026-07"},
]


def get_map_points() -> list[dict]:
    try:
        _check_supabase()
        result = supabase.table("danger_map_points").select(
            "lat_rounded, lng_rounded, risk_tier, gear_compliance, site_type, month_year"
        ).execute()
        if result.data and len(result.data) > 0:
            return result.data
    except Exception as e:
        print(f"get_map_points database error: {e}")
    return SEED_MAP_POINTS


def insert_anonymous_incident(lat: float, lng: float, site_type: str) -> None:
    _check_supabase()
    try:
        supabase.table("danger_map_points").insert({
            "lat_rounded": _round_coord(lat),
            "lng_rounded": _round_coord(lng),
            "risk_tier": "HIGH",            # anonymous incidents default to HIGH
            "gear_compliance": False,
            "site_type": site_type,
            "month_year": datetime.now().strftime("%Y-%m"),
        }).execute()
    except Exception as e:
        print(f"insert_anonymous_incident error: {e}")


def get_job_history(device_id: str) -> list[dict]:
    _check_supabase()
    try:
        result = supabase.table("jobs").select(
            "local_id, site_type, risk_tier, started_at, ended_at, gear_confirmed, language"
        ).eq("device_id", device_id).order("started_at", desc=True).limit(50).execute()
        return result.data if result.data else []
    except Exception as e:
        print(f"get_job_history error: {e}")
        return []


def save_companion_session(device_id: str, job_id: str, code: str, companion_name: str | None) -> None:
    _check_supabase()
    try:
        supabase.table("companion_sessions").upsert({
            "code": code,
            "device_id": device_id,
            "job_id": job_id,
            "companion_name": companion_name,
            "verified": False,
        }).execute()
    except Exception as e:
        print(f"save_companion_session error: {e}")


def verify_companion_session(code: str) -> dict | None:
    _check_supabase()
    try:
        result = supabase.table("companion_sessions").select("*").eq("code", code).execute()
        if result.data and len(result.data) > 0:
            supabase.table("companion_sessions").update({"verified": True}).eq("code", code).execute()
            return result.data[0]
    except Exception:
        pass
    return None


def link_telegram(device_id: str, telegram_chat_id: str) -> None:
    _check_supabase()
    try:
        supabase.table("worker_profiles").upsert({
            "device_id": device_id,
            "telegram_chat_id": telegram_chat_id,
        }).execute()
    except Exception as e:
        print(f"link_telegram error: {e}")


def get_telegram_chat_id(device_id: str) -> str | None:
    _check_supabase()
    try:
        result = supabase.table("worker_profiles").select(
            "telegram_chat_id"
        ).eq("device_id", device_id).execute()
        if result.data and len(result.data) > 0:
            return result.data[0].get("telegram_chat_id")
    except Exception:
        pass
    return None


def save_link_code(device_id: str, code: str) -> None:
    _check_supabase()
    try:
        supabase.table("telegram_link_codes").upsert({
            "device_id": device_id,
            "code": code,
        }).execute()
    except Exception as e:
        print(f"save_link_code error: {e}")


def get_device_id_by_link_code(code: str) -> str | None:
    _check_supabase()
    try:
        result = supabase.table("telegram_link_codes").select(
            "device_id"
        ).eq("code", code).execute()
        if result.data and len(result.data) > 0:
            return result.data[0].get("device_id")
    except Exception:
        pass
    return None


def complete_telegram_link(device_id: str, code: str) -> str | None:
    _check_supabase()
    try:
        result = supabase.table("telegram_link_codes").select("*").eq("code", code).execute()
        if result.data and len(result.data) > 0 and result.data[0].get("telegram_chat_id"):
            chat_id = result.data[0].get("telegram_chat_id")
            supabase.table("worker_profiles").upsert({
                "device_id": device_id,
                "telegram_chat_id": chat_id,
            }).execute()
            supabase.table("telegram_link_codes").delete().eq("code", code).execute()
            return chat_id
    except Exception as e:
        print(f"complete_telegram_link error: {e}")
    return None


def update_link_code_chat_id(code: str, chat_id: str) -> None:
    """Update the telegram_chat_id for a link code. Used by the Telegram webhook."""
    _check_supabase()
    try:
        supabase.table("telegram_link_codes").update(
            {"telegram_chat_id": chat_id}
        ).eq("code", code).execute()
    except Exception as e:
        print(f"update_link_code_chat_id error: {e}")
