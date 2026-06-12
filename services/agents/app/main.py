"""EcoPulse Agents Service — SSE streaming endpoints for AI agents.

Routes:
  POST /api/v1/ingest/text        — text → items (streaming SSE)
  POST /api/v1/ingest/image       — image bytes → items (streaming SSE)
  POST /api/v1/forecast           — scenario → 12-month trajectory
  POST /api/v1/coach/nudge        — weekly coaching nudge (batch)
  POST /api/v1/chat               — Carbon Conversations (streaming SSE)

All routes require a valid user_id from the gateway (service-to-service auth).
Per-user rate limiting applied at the gateway layer.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Annotated, AsyncIterator

from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from app.agents.analyst import analyse
from app.agents.coach import generate_nudge
from app.agents.conversation import stream_conversation
from app.agents.forecast import build_dual_forecast
from app.agents.ingest import run_ingest_image, run_ingest_text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="EcoPulse Agents",
    version="0.1.0",
    docs_url="/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "https://ecopulse-gateway-*.run.app"],
    allow_methods=["POST"],
    allow_headers=["X-User-Id", "Content-Type"],
)

# ── Service-to-service auth ───────────────────────────────────────────────

AGENTS_SERVICE_SECRET = os.getenv("AGENTS_SERVICE_SECRET", "dev-secret")


def verify_service_auth(x_service_secret: Annotated[str | None, Header()] = None) -> None:
    """Verify the internal service-to-service secret header."""
    if os.getenv("ENV", "development") == "development":
        return  # Skip auth in dev
    if x_service_secret != AGENTS_SERVICE_SECRET:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid service secret")


ServiceAuth = Annotated[None, Depends(verify_service_auth)]


def get_user_id(x_user_id: Annotated[str | None, Header()] = None) -> str:
    """Extract authenticated user ID passed from the gateway."""
    if not x_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing X-User-Id header")
    return x_user_id


UserID = Annotated[str, Depends(get_user_id)]


# ── SSE helpers ───────────────────────────────────────────────────────────

def sse_event(data: dict[str, object]) -> str:
    return f"data: {json.dumps(data)}\n\n"


async def _stream_ingest_and_analyse(
    items: list[dict[str, object]],
    user_id: str,
    source_type: str,
) -> AsyncIterator[str]:
    """Core SSE streaming for ingest → analyse pipeline."""
    if not items:
        yield sse_event({"type": "error", "message": "No items identified in the input."})
        return

    # Stream items as they are analysed
    yield sse_event({"type": "start", "count": len(items)})
    await asyncio.sleep(0)

    # Enrich all items with CO₂e
    from packages.emissions.engine import calculate_co2e_batch

    class _Fake:
        def __init__(self, raw: dict[str, object]) -> None:
            self.name = str(raw.get("name", ""))
            self.quantity = float(raw.get("quantity", 1))
            self.unit = str(raw.get("unit", "g"))
            self.category = str(raw.get("category", "food"))

    fakes = [_Fake(item) for item in items]
    co2e_values = calculate_co2e_batch(fakes)  # type: ignore[arg-type]

    for item, co2e in zip(items, co2e_values):
        yield sse_event({"type": "item_identified", "item": item, "co2e_kg": co2e})
        await asyncio.sleep(0.05)  # Brief pause for streaming effect

    # Build full activity record
    activity = analyse(items, user_id, source_type)

    # Emit swap suggestion if present
    if "swap_suggestion" in activity:
        yield sse_event({
            "type": "swap_suggestion",
            "suggestion": activity["swap_suggestion"],
            "saving_pct": activity.get("swap_co2e_saving_pct", 0),
        })
        await asyncio.sleep(0)

    yield sse_event({"type": "activity_complete", "activity": activity})


# ── Pydantic request/response models ─────────────────────────────────────

class TextIngestRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class ForecastRequest(BaseModel):
    activity_history: list[dict[str, object]] = Field(default_factory=list)
    interventions: list[str] = Field(default_factory=list)


class CoachRequest(BaseModel):
    activity_summary: str = Field(max_length=5000)
    top_categories: str = Field(max_length=500)
    previous_nudge_keys: list[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    relevant_activities: list[dict[str, object]] = Field(default_factory=list)
    session_history: list[dict[str, str]] = Field(default_factory=list)


# ── Routes ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "agents"}


@app.post("/api/v1/ingest/text")
async def ingest_text(
    body: TextIngestRequest,
    uid: UserID,
    _auth: ServiceAuth,
) -> StreamingResponse:
    """Stream identified items from text description → SSE."""
    async def generate() -> AsyncIterator[str]:
        items = await run_ingest_text(body.text)
        async for event in _stream_ingest_and_analyse(items, uid, "text"):
            yield event

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/api/v1/ingest/image")
async def ingest_image(
    request: Request,
    uid: UserID,
    _auth: ServiceAuth,
    content_type: Annotated[str | None, Header()] = None,
) -> StreamingResponse:
    """Stream identified items from image bytes → SSE.

    Expects raw image bytes in request body, Content-Type must be image/*.
    """
    mime_type = content_type or "image/jpeg"
    if not mime_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Content-Type must be image/*")

    image_bytes = await request.body()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large (max 10MB)")

    async def generate() -> AsyncIterator[str]:
        items = await run_ingest_image(image_bytes, mime_type)
        async for event in _stream_ingest_and_analyse(items, uid, "photo"):
            yield event

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/api/v1/forecast")
async def forecast(
    body: ForecastRequest,
    uid: UserID,
    _auth: ServiceAuth,
) -> JSONResponse:
    """Build dual-scenario forecast (Current You + Committed You)."""
    current, committed = build_dual_forecast(
        user_id=uid,
        activity_history=body.activity_history,
        active_interventions=body.interventions,
    )
    return JSONResponse({"current": current, "committed": committed})


@app.post("/api/v1/coach/nudge")
async def coach_nudge(
    body: CoachRequest,
    uid: UserID,
    _auth: ServiceAuth,
) -> JSONResponse:
    """Generate weekly coaching nudge (batch path — Gemini Pro)."""
    nudge = await generate_nudge(
        user_id=uid,
        activity_summary=body.activity_summary,
        top_categories=body.top_categories,
        previous_nudge_keys=body.previous_nudge_keys,
    )
    if nudge is None:
        raise HTTPException(status_code=500, detail="Failed to generate nudge")
    return JSONResponse(nudge)


@app.post("/api/v1/chat")
async def chat(
    body: ChatRequest,
    uid: UserID,
    _auth: ServiceAuth,
) -> StreamingResponse:
    """Stream Carbon Conversations response → SSE."""
    async def generate() -> AsyncIterator[str]:
        async for event in stream_conversation(
            user_message=body.message,
            relevant_activities=body.relevant_activities,
            session_history=body.session_history,
        ):
            yield event

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled exception: %s", exc)
    return JSONResponse(status_code=500, content={"error": "internal_server_error"})
