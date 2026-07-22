from fastapi import APIRouter, Request, HTTPException
from schemas import TelegramAlertRequest, TelegramLinkRequest, TelegramGenerateLinkCodeRequest
from services.telegram_service import send_telegram_message, build_alert_message
from services.supabase_service import (
    get_telegram_chat_id, link_telegram,
    save_link_code, get_device_id_by_link_code,
    complete_telegram_link
)
from config import settings
import random
import string

router = APIRouter()


@router.post("/telegram/alert")
async def telegram_alert(req: TelegramAlertRequest):
    chat_id = req.telegram_chat_id
    if not chat_id and req.device_id:
        chat_id = get_telegram_chat_id(req.device_id)
    
    if not chat_id:
        return {"sent": False, "reason": "Telegram chat ID not linked for this device. Please connect bot in profile."}

    text = build_alert_message(
        alert_type=req.alert_type,
        language="en",  # alerts always in English to companion; worker language for reports
        name=req.worker_name or "Worker",
        location=req.location_text or "Unknown",
        risk=req.risk_tier or "UNKNOWN",
        timestamp=req.timestamp,
        report=req.report_text or "",
        site_type=req.site_type or "",
    )
    sent = await send_telegram_message(chat_id, text)
    return {"sent": sent}


@router.post("/telegram/link")
async def link_telegram_account(req: TelegramLinkRequest):
    """
    Worker enters the 6-digit code they got from the Telegram bot.
    We look up that code, find the chat_id it corresponds to, and save the link.
    """
    chat_id = complete_telegram_link(req.device_id, req.link_code)
    if not chat_id:
        raise HTTPException(status_code=404, detail="Pairing code not found or bot /start not completed yet")
    return {"status": "linked", "telegram_chat_id": chat_id}


@router.post("/telegram/generate-link-code")
async def generate_link_code(req: TelegramGenerateLinkCodeRequest):
    """Frontend calls this to get a 6-digit code to show the worker."""
    code = "".join(random.choices(string.digits, k=6))
    save_link_code(req.device_id, code)
    return {"code": code, "bot_username": "SafaiShieldBot"}


@router.post("/telegram/webhook")
async def telegram_webhook(request: Request):
    """
    Receive messages from Telegram bot.
    When a user sends /start CODE to the bot, we link their chat_id to the device_id.
    """
    secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token")
    if settings.TELEGRAM_WEBHOOK_SECRET and secret != settings.TELEGRAM_WEBHOOK_SECRET:
        raise HTTPException(status_code=403, detail="Invalid secret")

    body = await request.json()
    message = body.get("message", {})
    text = message.get("text", "")
    chat_id = str(message.get("chat", {}).get("id", ""))

    if text.startswith("/start") and chat_id:
        parts = text.split()
        if len(parts) == 2:
            code = parts[1]
            # Store chat_id against this code so /api/telegram/link can find it
            from services.supabase_service import update_link_code_chat_id
            try:
                update_link_code_chat_id(code, chat_id)
            except Exception:
                pass
            await send_telegram_message(
                chat_id,
                "✅ SafaiShield linked! You will receive emergency alerts here.\n\nकनेक्ट हो गया। / అనుసంధానించబడింది. / இணைக்கப்பட்டது."
            )

    return {"ok": True}
