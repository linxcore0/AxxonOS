"""
Axxon OS — Unified Telegram & WhatsApp Webhook Backend
======================================================
Handles inbound messages from both Telegram and WhatsApp,
passes them through the Gemini AI handler, and sends replies.

Run with:
    uvicorn webhook.main:app --host 0.0.0.0 --port 8000 --reload
"""

import logging
import os

import httpx
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, Query, Request, Response
from fastapi.responses import JSONResponse, PlainTextResponse

# ── Environment ────────────────────────────────────────────────────────────────
load_dotenv()

TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID: str = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_ACCESS_TOKEN: str = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_VERIFY_TOKEN: str = os.getenv("WHATSAPP_VERIFY_TOKEN", "")
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = "gemini-2.0-flash"

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("axxon.webhook")

# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Axxon Webhook Module",
    description="Unified Telegram & WhatsApp webhook backend for Axxon OS",
    version="1.0.0",
)


# ── AI / LLM handler ──────────────────────────────────────────────────────────

async def ask_gemini(system_prompt: str, user_message: str) -> str:
    """
    Send a message through the Gemini REST API and return the reply text.
    Falls back to a placeholder string if the API key is missing or the
    request fails, so the webhook always sends *something* back to the user.
    """
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY is not set — returning fallback reply.")
        return "I'm sorry, the AI backend is not configured yet."

    url = (
        f"https://generativelanguage.googleapis.com/v1/models/"
        f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    )

    # Mirrors the structure used in server.js → askGemini()
    payload = {
        "contents": [
            {"role": "user",  "parts": [{"text": system_prompt}]},
            {
                "role": "model",
                "parts": [{"text": "Understood. I will answer as a helpful Axxon assistant."}],
            },
            {"role": "user",  "parts": [{"text": user_message}]},
        ]
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            # Navigate the Gemini response shape
            text = (
                data.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                    .strip()
            )
            return text or "I'm not sure how to respond to that."
    except httpx.HTTPStatusError as exc:
        logger.error("Gemini API HTTP error: %s — %s", exc.response.status_code, exc.response.text)
    except Exception as exc:  # noqa: BLE001
        logger.error("Gemini API unexpected error: %s", exc)

    return "I encountered an error while generating a response. Please try again."


# Default system prompt — replace or extend to match each bot's personality/FAQ
DEFAULT_SYSTEM_PROMPT = (
    "You are a helpful customer support assistant for Axxon OS. "
    "Answer concisely and professionally."
)


# ── Telegram helpers ───────────────────────────────────────────────────────────

async def send_telegram_message(chat_id: int | str, text: str) -> None:
    """Send a reply to a Telegram chat via the Bot API sendMessage endpoint."""
    if not TELEGRAM_BOT_TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN is not set — cannot send Telegram reply.")
        return

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": chat_id, "text": text}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            logger.info("Telegram reply sent to chat_id=%s", chat_id)
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Telegram sendMessage HTTP error: %s — %s",
            exc.response.status_code,
            exc.response.text,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("Telegram sendMessage unexpected error: %s", exc)


async def process_telegram_update(update: dict) -> None:
    """
    Background task: extract text + chat_id from a Telegram update,
    run it through the AI handler, and send the reply.
    """
    logger.debug("Processing Telegram update: %s", update)

    message = update.get("message") or update.get("edited_message")
    if not message:
        logger.info("Telegram update contains no message field — skipping.")
        return

    chat_id: int | str | None = message.get("chat", {}).get("id")
    text: str = message.get("text", "").strip()

    if not chat_id:
        logger.warning("Could not extract chat_id from Telegram update.")
        return

    if not text:
        # Non-text message (sticker, photo, etc.) — send a friendly nudge
        logger.info("Received non-text Telegram message from chat_id=%s", chat_id)
        await send_telegram_message(chat_id, "Please send a text message so I can help you.")
        return

    logger.info("Telegram message from chat_id=%s: %r", chat_id, text)

    reply = await ask_gemini(DEFAULT_SYSTEM_PROMPT, text)
    await send_telegram_message(chat_id, reply)


# ── WhatsApp helpers ───────────────────────────────────────────────────────────

async def send_whatsapp_message(to: str, text: str) -> None:
    """Send a reply via the WhatsApp Cloud API (Graph API v19.0)."""
    if not WHATSAPP_PHONE_NUMBER_ID or not WHATSAPP_ACCESS_TOKEN:
        logger.error("WhatsApp credentials are not set — cannot send reply.")
        return

    url = (
        f"https://graph.facebook.com/v19.0/"
        f"{WHATSAPP_PHONE_NUMBER_ID}/messages"
    )
    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "text",
        "text": {"body": text},
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            logger.info("WhatsApp reply sent to %s", to)
    except httpx.HTTPStatusError as exc:
        logger.error(
            "WhatsApp API HTTP error: %s — %s",
            exc.response.status_code,
            exc.response.text,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("WhatsApp API unexpected error: %s", exc)


async def process_whatsapp_payload(body: dict) -> None:
    """
    Background task: safely dig into the WhatsApp webhook payload,
    extract the sender + message body, run AI, and reply.

    Payload shape (simplified):
        entry[0].changes[0].value.messages[0]  →  { from, text.body }
    """
    logger.debug("Processing WhatsApp payload: %s", body)

    try:
        entry = body.get("entry", [])
        if not entry:
            logger.info("WhatsApp payload has no 'entry' — skipping.")
            return

        changes = entry[0].get("changes", [])
        if not changes:
            logger.info("WhatsApp entry has no 'changes' — skipping.")
            return

        value = changes[0].get("value", {})

        # Status updates (delivered, read) come through the same endpoint
        # but have no 'messages' key — skip them silently.
        messages = value.get("messages")
        if not messages:
            logger.info("WhatsApp change value has no 'messages' (likely a status update) — skipping.")
            return

        msg = messages[0]
        sender: str = msg.get("from", "")          # E.164 phone number
        msg_type: str = msg.get("type", "")
        text: str = (msg.get("text") or {}).get("body", "").strip()

        if not sender:
            logger.warning("Could not extract sender from WhatsApp message.")
            return

        logger.info("WhatsApp message from %s (type=%s): %r", sender, msg_type, text)

        if msg_type != "text" or not text:
            # Non-text (image, audio, etc.) — reply with a nudge
            await send_whatsapp_message(sender, "Please send a text message so I can assist you.")
            return

        reply = await ask_gemini(DEFAULT_SYSTEM_PROMPT, text)
        await send_whatsapp_message(sender, reply)

    except (IndexError, KeyError, TypeError) as exc:
        logger.error("Failed to parse WhatsApp payload: %s", exc)


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
async def health_check() -> JSONResponse:
    """Simple liveness probe."""
    return JSONResponse({"status": "ok", "service": "Axxon Webhook Module"})


# ── Telegram ──────────────────────────────────────────────────────────────────

@app.post("/webhook/telegram")
async def telegram_webhook(request: Request, background_tasks: BackgroundTasks) -> JSONResponse:
    """
    Receive a Telegram Bot API update (POST from Telegram servers).
    Returns 200 immediately and processes the message in the background.
    """
    body = await request.json()
    logger.info("Telegram webhook received — update_id=%s", body.get("update_id"))

    # Offload processing so Telegram doesn't retry on slow AI responses
    background_tasks.add_task(process_telegram_update, body)

    return JSONResponse({"status": "ok"})


# ── WhatsApp ──────────────────────────────────────────────────────────────────

@app.get("/webhook/whatsapp")
async def whatsapp_verify(
    hub_mode: str | None = Query(default=None, alias="hub.mode"),
    hub_verify_token: str | None = Query(default=None, alias="hub.verify_token"),
    hub_challenge: str | None = Query(default=None, alias="hub.challenge"),
) -> Response:
    """
    Meta webhook verification handshake (GET).
    Meta sends hub.mode='subscribe' + hub.verify_token; we must return hub.challenge.
    """
    logger.info(
        "WhatsApp verification request — mode=%s, token_match=%s",
        hub_mode,
        hub_verify_token == WHATSAPP_VERIFY_TOKEN,
    )

    if hub_mode == "subscribe" and hub_verify_token == WHATSAPP_VERIFY_TOKEN:
        logger.info("WhatsApp webhook verified successfully.")
        return PlainTextResponse(hub_challenge or "")

    logger.warning("WhatsApp webhook verification failed — token mismatch or wrong mode.")
    return PlainTextResponse("Forbidden", status_code=403)


@app.post("/webhook/whatsapp")
async def whatsapp_webhook(request: Request, background_tasks: BackgroundTasks) -> JSONResponse:
    """
    Receive an inbound WhatsApp message payload (POST from Meta).
    Returns 200 immediately and processes the message in the background.
    Meta will retry if it doesn't receive a 2xx within ~20 seconds.
    """
    body = await request.json()
    logger.info(
        "WhatsApp webhook received — object=%s",
        body.get("object"),
    )

    background_tasks.add_task(process_whatsapp_payload, body)

    return JSONResponse({"status": "ok"})
