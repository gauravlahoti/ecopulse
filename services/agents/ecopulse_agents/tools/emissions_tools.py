"""Deterministic ADK tools wrapping the EcoPulse emissions engine.

THE GOLDEN RULE: the LLM identifies and classifies; THESE FUNCTIONS calculate.
Every CO₂e number returned to the user originates here, from the bundled
DEFRA 2024 factor table — never from the model.

Each public function is registered as an ADK FunctionTool (passed bare to an
LlmAgent's ``tools=[...]``; ADK builds the function declaration from the
signature + docstring, so docstrings are part of the contract the model sees).
"""
import json
import statistics
from datetime import datetime
from types import SimpleNamespace
from typing import Any

from pydantic import BaseModel

from ..emissions.engine import (
    calculate_co2e,
    get_swap_suggestion,
    project_trajectory,
)


# ADK builds tool schemas from these — Pydantic models parse cleanly where bare
# ``list[dict]`` does not, and they guide the model toward well-formed arguments.
class MealItem(BaseModel):
    name: str
    quantity: float = 1.0
    unit: str = "g"
    category: str = "food"
    confidence: float = 1.0


class HistoryEntry(BaseModel):
    co2e_kg: float = 0.0
    timestamp: str = ""


def _as_meal_item(it: Any) -> MealItem:
    return it if isinstance(it, MealItem) else MealItem(**dict(it))


def _as_history_entry(it: Any) -> HistoryEntry:
    return it if isinstance(it, HistoryEntry) else HistoryEntry(**dict(it))

# Engine-verified intervention savings (the ONLY source of saving percentages).
VALID_INTERVENTIONS: dict[str, float] = {
    "cycle_2x": 8.0,
    "plant_meals": 12.0,
    "no_short_haul": 15.0,
    "solar_tariff": 6.0,
}

_GLOBAL_MONTHLY_AVG_KG = 440.0  # ~5.3 t/year (UK average) — fallback baseline.


def score_meal(items_json: str) -> dict[str, Any]:
    """Calculate verified CO₂e for the identified items and suggest a swap.

    Call this after identifying every food/transport/energy/shopping item in the
    user's input. This returns the authoritative CO₂e figures — the model must
    NEVER compute these itself.

    Args:
        items_json: A JSON array string of the identified items. Each item is an
            object: {"name": str, "quantity": number, "unit": str (e.g.
            "g"/"kg"/"km"/"kWh"), "category": one of
            food/transport/energy/shopping/travel/other, "confidence": 0-1}.

    Returns:
        A dict with: items (each enriched with co2e_kg), total_co2e_kg,
        swap_suggestion (str or null), swap_saving_pct (number or null).
    """
    try:
        raw = json.loads(items_json) if items_json else []
    except (json.JSONDecodeError, TypeError):
        raw = []
    if not isinstance(raw, list):
        raw = []
    parsed = [_as_meal_item(it) for it in raw]
    co2e_values: list[float] = []
    enriched: list[dict[str, Any]] = []
    for it in parsed:
        try:
            co2e = calculate_co2e(it.name.strip(), float(it.quantity or 1), it.unit, it.category)
        except Exception:
            co2e = 0.0
        co2e_values.append(co2e)
        enriched.append(
            {
                "name": it.name,
                "quantity": it.quantity,
                "unit": it.unit,
                "category": it.category,
                "confidence": it.confidence,
                "co2e_kg": co2e,
            }
        )

    objs = [SimpleNamespace(name=it.name, category=it.category) for it in parsed]
    suggestion, saving_pct = get_swap_suggestion(objs, co2e_values)  # type: ignore[arg-type]

    return {
        "items": enriched,
        "total_co2e_kg": round(sum(co2e_values), 3),
        "swap_suggestion": suggestion,
        "swap_saving_pct": saving_pct,
    }


def _baseline_monthly_avg(activity_history: list[HistoryEntry]) -> float:
    """Mean monthly kg CO₂e from the last 3 months; blends with the global avg if sparse."""
    if not activity_history:
        return _GLOBAL_MONTHLY_AVG_KG

    monthly_totals: dict[str, float] = {}
    for act in activity_history:
        ts = str(act.timestamp or "")
        try:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            month_key = f"{dt.year}-{dt.month:02d}"
            monthly_totals[month_key] = monthly_totals.get(month_key, 0.0) + float(act.co2e_kg)
        except (ValueError, TypeError):
            continue

    if not monthly_totals:
        return _GLOBAL_MONTHLY_AVG_KG

    recent = sorted(monthly_totals.keys())[-3:]
    avg = statistics.mean([monthly_totals[m] for m in recent])
    if avg < 50:  # sparse data — blend with global average
        return round((avg + _GLOBAL_MONTHLY_AVG_KG) / 2, 2)
    return round(avg, 2)


def _scenario(baseline: float, interventions: list[str], scenario_id: str, label: str) -> dict[str, Any]:
    monthly = project_trajectory(baseline, interventions)
    total = round(sum(monthly), 2)
    baseline_total = round(baseline * 12, 2)
    vs_baseline_pct = round((total - baseline_total) / max(baseline_total, 0.001) * 100, 1)
    return {
        "scenario_id": scenario_id,
        "label": label,
        "interventions": interventions,
        "monthly_co2e_kg": monthly,
        "total_co2e_kg": total,
        "vs_baseline_pct": vs_baseline_pct,
    }


def build_dual_forecast(
    activity_history_json: str,
    active_interventions: list[str],
) -> dict[str, Any]:
    """Build the Parallel-You Simulator's two 12-month CO₂e trajectories.

    Fully deterministic — the model only relays the inputs and returns this result.

    Args:
        activity_history_json: A JSON array string of the user's logged activities,
            each an object with co2e_kg (number) and timestamp (ISO string). Used
            to compute the monthly baseline. Pass "[]" if none.
        active_interventions: Intervention keys the user has committed to. Valid
            keys: cycle_2x, plant_meals, no_short_haul, solar_tariff.

    Returns:
        A dict with `current` (no interventions) and `committed` (with the active
        interventions) — each a 12-month ForecastScenario.
    """
    try:
        raw = json.loads(activity_history_json) if activity_history_json else []
    except (json.JSONDecodeError, TypeError):
        raw = []
    if not isinstance(raw, list):
        raw = []
    parsed = [_as_history_entry(it) for it in raw]
    baseline = _baseline_monthly_avg(parsed)
    valid = [k for k in active_interventions if k in VALID_INTERVENTIONS]
    current = _scenario(baseline, [], "current_baseline", "Current You")
    committed = _scenario(baseline, valid, f"committed_{'_'.join(valid) or 'none'}", "Committed You")
    return {"current": current, "committed": committed}


def finalize_nudge(message: str, intervention_key: str) -> dict[str, Any]:
    """Finalise a weekly coaching nudge with an engine-verified saving percentage.

    Call this once with your nudge message and chosen intervention. The
    `estimated_saving_pct` is set from the engine's verified table — any number
    the model has in mind is ignored (the engine is authoritative).

    Args:
        message: The coaching nudge (<= 500 chars), warm and specific.
        intervention_key: One of cycle_2x, plant_meals, no_short_haul, solar_tariff.

    Returns:
        A dict: message, intervention_key, estimated_saving_pct (engine value).
    """
    key = intervention_key if intervention_key in VALID_INTERVENTIONS else "plant_meals"
    return {
        "message": message.strip()[:500],
        "intervention_key": key,
        "estimated_saving_pct": VALID_INTERVENTIONS[key],
    }
