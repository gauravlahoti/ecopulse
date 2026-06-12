"""Coach Agent — weekly batch, Gemini Pro (quality > speed).

Generates ONE high-impact, empathetic nudge per user per week.
Runs as a Cloud Run Job (cron), not on the hot path.

Security: output validated against Pydantic schema. Numeric claims
(estimated_saving_pct) are re-validated against the Emissions Engine
intervention table before storage.
"""
from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Valid intervention keys and their engine-verified saving percentages
VALID_INTERVENTIONS: dict[str, float] = {
    "cycle_2x":       8.0,
    "plant_meals":    12.0,
    "no_short_haul":  15.0,
    "solar_tariff":   6.0,
}


def _validate_nudge(raw: dict[str, object], user_id: str) -> dict[str, object] | None:
    """Validate and coerce a raw LLM nudge. Returns None if invalid."""
    try:
        message = str(raw.get("message", "")).strip()
        intervention_key = str(raw.get("intervention_key", ""))
        llm_saving_pct = float(raw.get("estimated_saving_pct", 0))

        if not message or len(message) > 500:
            return None
        if intervention_key not in VALID_INTERVENTIONS:
            return None

        # Override LLM's saving_pct with engine-verified value
        verified_saving_pct = VALID_INTERVENTIONS[intervention_key]

        return {
            "nudge_id": f"nudge_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "message": message,
            "intervention_key": intervention_key,
            "estimated_saving_pct": verified_saving_pct,  # Engine value, not LLM's
            "generated_at": datetime.now(tz=timezone.utc).isoformat(),
            "_llm_claimed_saving_pct": llm_saving_pct,  # Keep for audit
        }
    except (TypeError, ValueError, KeyError):
        return None


async def generate_nudge(
    user_id: str,
    activity_summary: str,
    top_categories: str,
    previous_nudge_keys: list[str],
) -> dict[str, object] | None:
    """Generate a weekly coaching nudge using Gemini Pro.

    Returns a validated CoachNudge dict, or None on failure.
    This is a BATCH operation — runs weekly, not on the hot path.
    """
    from app.prompts.coach_v1 import SYSTEM_PROMPT, USER_TEMPLATE

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        logger.warning("No GEMINI_API_KEY — returning default nudge")
        return _default_nudge(user_id, previous_nudge_keys)

    user_message = USER_TEMPLATE.format(
        activity_summary=activity_summary,
        top_categories=top_categories,
        previous_nudges=", ".join(previous_nudge_keys) if previous_nudge_keys else "none",
    )

    try:
        import google.generativeai as genai  # type: ignore[import-untyped]
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash-lite",  # Flash-Lite — cost-optimised batch path
            system_instruction=SYSTEM_PROMPT,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.7,  # Some variety in nudge phrasing
                max_output_tokens=512,
            ),
        )
        response = await model.generate_content_async(user_message)
        raw_text = (response.text or "{}").strip()

        # Strip markdown fences if present
        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            raw_text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        raw = json.loads(raw_text)
        nudge = _validate_nudge(raw, user_id)

        if nudge is None:
            logger.warning("Coach agent returned invalid nudge — using default")
            return _default_nudge(user_id, previous_nudge_keys)

        return nudge
    except Exception as exc:
        logger.error("Coach agent error: %s", exc)
        return _default_nudge(user_id, previous_nudge_keys)


def _default_nudge(user_id: str, previous_nudge_keys: list[str]) -> dict[str, object]:
    """Return a safe default nudge when the LLM is unavailable."""
    # Pick intervention not recently used
    all_keys = list(VALID_INTERVENTIONS.keys())
    available = [k for k in all_keys if k not in previous_nudge_keys] or all_keys
    key = available[0]

    messages = {
        "cycle_2x":      "Try cycling twice this week — even short trips add up to real carbon savings.",
        "plant_meals":   "Swap two meals this week for plant-based options — it's one of the highest-impact changes you can make.",
        "no_short_haul": "Consider rail instead of a short flight this month — trains can cut journey emissions by 90%.",
        "solar_tariff":  "Switching to a renewable energy tariff could reduce your home energy footprint by up to 6%.",
    }

    return {
        "nudge_id": f"nudge_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "message": messages[key],
        "intervention_key": key,
        "estimated_saving_pct": VALID_INTERVENTIONS[key],
        "generated_at": datetime.now(tz=timezone.utc).isoformat(),
    }
