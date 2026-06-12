"""Analyst Agent — computes CO₂e using the Emissions Engine, generates swap suggestions.

This agent does NOT call Gemini for arithmetic. It wraps the deterministic
Emissions Engine and produces an ActivityRecord with validated numbers.

Hot path — runs synchronously after the Ingest Agent.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from packages.emissions.engine import (
    calculate_co2e_batch,
    get_swap_suggestion,
)


def analyse(
    items: list[dict[str, object]],
    user_id: str,
    source_type: str = "photo",
) -> dict[str, object]:
    """Convert identified items to a full ActivityRecord with CO₂e totals.

    Args:
        items:       Validated IdentifiedItem dicts from the Ingest Agent.
        user_id:     Authenticated user ID — scoped to prevent cross-user records.
        source_type: "photo", "text", or "pdf".

    Returns:
        An ActivityRecord-compatible dict ready for Firestore storage.
    """
    if not items:
        return _empty_record(user_id, source_type)

    # Enrich items with CO₂e values — deterministic, never LLM arithmetic
    class _FakeItem:
        """Duck-typed item for the emissions engine."""
        def __init__(self, raw: dict[str, object]) -> None:
            self.name = str(raw.get("name", ""))
            self.quantity = float(raw.get("quantity", 1))
            self.unit = str(raw.get("unit", "g"))
            self.category = str(raw.get("category", "food"))

    fake_items = [_FakeItem(item) for item in items]
    co2e_values = calculate_co2e_batch(fake_items)  # type: ignore[arg-type]

    enriched_items = []
    for item, co2e in zip(items, co2e_values):
        enriched_items.append({**item, "co2e_kg": co2e})

    # Determine primary category from items (most common)
    categories = [str(item.get("category", "food")) for item in items]
    primary_category = max(set(categories), key=categories.count)

    # Description = comma-joined item names
    description = ", ".join(str(i.get("name", "")) for i in items)

    # Total CO₂e
    total_co2e = round(sum(co2e_values), 4)

    # Swap suggestion — deterministic from emission factor table
    suggestion, saving_pct = get_swap_suggestion(fake_items, co2e_values)  # type: ignore[arg-type]

    record: dict[str, object] = {
        "id": f"act_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "category": primary_category,
        "description": description,
        "co2e_kg": total_co2e,
        "items": enriched_items,
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        "source_type": source_type,
    }

    if suggestion is not None:
        record["swap_suggestion"] = suggestion
    if saving_pct is not None:
        record["swap_co2e_saving_pct"] = saving_pct

    return record


def _empty_record(user_id: str, source_type: str) -> dict[str, object]:
    return {
        "id": f"act_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "category": "other",
        "description": "No items identified",
        "co2e_kg": 0.0,
        "items": [],
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        "source_type": source_type,
    }
