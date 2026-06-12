"""Carbon Conversations agent — grounded Q&A over user's own Firestore data.

Streams token-by-token via SSE. Every numeric claim must cite activity IDs.
Security: user content delimited, cross-user access physically impossible
(Firestore query scoped to authenticated uid before being passed here).
"""
from __future__ import annotations

import json
import logging
import os
from collections.abc import AsyncIterator

logger = logging.getLogger(__name__)


def _build_activity_context(relevant_activities: list[dict[str, object]]) -> str:
    """Format activity records as a compact context string for the prompt."""
    if not relevant_activities:
        return "No activities logged yet."

    lines = []
    for act in relevant_activities[:20]:  # Cap at 20 to stay within context window
        lines.append(
            f"[{act.get('id', '?')}] {act.get('timestamp', '')[:10]} | "
            f"{act.get('category', '')} | {act.get('description', '')} | "
            f"{act.get('co2e_kg', 0):.2f} kg CO₂e"
        )
    return "\n".join(lines)


async def stream_conversation(
    user_message: str,
    relevant_activities: list[dict[str, object]],
    session_history: list[dict[str, str]],
) -> AsyncIterator[str]:
    """Stream a grounded conversation response as SSE data lines.

    Yields SSE event strings: "data: {...}\n\n"
    Event types:
    - {"type": "token", "content": "..."}  — incremental text
    - {"type": "citations", "ids": [...]}  — cited activity IDs
    - {"type": "complete"}                 — stream end marker
    - {"type": "error", "message": "..."}  — failure
    """
    from app.prompts.conversation_v1 import SYSTEM_PROMPT, USER_TEMPLATE

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        yield from _mock_stream(user_message, relevant_activities)
        return

    activity_context = _build_activity_context(relevant_activities)
    user_prompt = USER_TEMPLATE.format(
        user_message=user_message,
        relevant_activities=activity_context,
    )

    # Build conversation history for context
    history = []
    for turn in session_history[-6:]:  # Last 3 turns (user + assistant pairs)
        role = turn.get("role", "user")
        content = turn.get("content", "")
        history.append({"role": role, "parts": [content]})

    try:
        import google.generativeai as genai  # type: ignore[import-untyped]
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=SYSTEM_PROMPT,
            generation_config=genai.GenerationConfig(
                temperature=0.3,
                max_output_tokens=512,
            ),
        )
        chat = model.start_chat(history=history)

        # Stream response token by token
        full_text = ""
        async for chunk in await chat.send_message_async(user_prompt, stream=True):
            if chunk.text:
                full_text += chunk.text
                event = json.dumps({"type": "token", "content": chunk.text})
                yield f"data: {event}\n\n"

        # Extract cited activity IDs from the full response
        import re
        cited_ids = re.findall(r"\[act_[a-f0-9]{12}\]", full_text)
        cited_ids = [cid.strip("[]") for cid in cited_ids]

        if cited_ids:
            event = json.dumps({"type": "citations", "ids": cited_ids})
            yield f"data: {event}\n\n"

        yield 'data: {"type": "complete"}\n\n'

    except Exception as exc:
        logger.error("Conversation agent error: %s", exc)
        event = json.dumps({"type": "error", "message": "I encountered an issue — please try again."})
        yield f"data: {event}\n\n"


async def _mock_stream(
    user_message: str,
    relevant_activities: list[dict[str, object]],
) -> AsyncIterator[str]:
    """Fallback stream used when GEMINI_API_KEY is not set (development mode)."""
    import asyncio

    total_co2e = sum(float(a.get("co2e_kg", 0)) for a in relevant_activities)
    top_activity = max(relevant_activities, key=lambda a: float(a.get("co2e_kg", 0)), default=None)

    if "highest" in user_message.lower() or "most" in user_message.lower():
        if top_activity:
            response = (
                f"Your highest-emission activity is {top_activity.get('description', 'unknown')} "
                f"at {float(top_activity.get('co2e_kg', 0)):.2f} kg CO₂e [{top_activity.get('id', '')}]. "
                f"Your total logged footprint is {total_co2e:.1f} kg CO₂e."
            )
        else:
            response = "I don't have any activities logged yet. Try snapping a meal photo to get started!"
    elif "total" in user_message.lower():
        response = (
            f"Your total logged carbon footprint is {total_co2e:.1f} kg CO₂e "
            f"across {len(relevant_activities)} activities."
        )
    else:
        response = (
            f"Based on your {len(relevant_activities)} logged activities, your total footprint "
            f"is {total_co2e:.1f} kg CO₂e. Your food choices account for the largest share. "
            f"Swapping to plant-based meals 2× per week could save ~12% annually."
        )

    # Simulate token-by-token streaming
    words = response.split()
    for i, word in enumerate(words):
        await asyncio.sleep(0.04)
        event = json.dumps({"type": "token", "content": word + (" " if i < len(words) - 1 else "")})
        yield f"data: {event}\n\n"

    # Mock citations
    if relevant_activities:
        cited = [str(a.get("id", "")) for a in relevant_activities[:2] if a.get("id")]
        if cited:
            event = json.dumps({"type": "citations", "ids": cited})
            yield f"data: {event}\n\n"

    yield 'data: {"type": "complete"}\n\n'
