"""Forecast Agent — Parallel-You Simulator trajectories.

Builds 12-month CO₂e projections using the deterministic Emissions Engine.
No LLM involvement — pure math with the factor table. Returns are always
traceable back to specific intervention savings in the engine.

Responses are cached per (user_id, interventions) hash in Redis (1hr TTL).
"""
from __future__ import annotations

import logging
import statistics
from datetime import datetime

from app.cache import get_cached_scenario, scenario_hash, set_cached_scenario
from packages.emissions.engine import project_trajectory

logger = logging.getLogger(__name__)


def _baseline_monthly_avg(activity_history: list[dict[str, object]]) -> float:
    """Compute monthly average kg CO₂e from a user's activity history.

    Uses the most recent 3 months. Falls back to global average if data is thin.
    """
    GLOBAL_MONTHLY_AVG_KG = 440.0  # ~5.3t/year per person (UK average)

    if not activity_history:
        return GLOBAL_MONTHLY_AVG_KG

    # Group by month
    monthly_totals: dict[str, float] = {}
    for act in activity_history:
        ts = str(act.get("timestamp", ""))
        try:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            month_key = f"{dt.year}-{dt.month:02d}"
            monthly_totals[month_key] = monthly_totals.get(month_key, 0.0) + float(act.get("co2e_kg", 0))
        except (ValueError, TypeError):
            continue

    if not monthly_totals:
        return GLOBAL_MONTHLY_AVG_KG

    # Use the last 3 months if available
    sorted_months = sorted(monthly_totals.keys())
    recent = sorted_months[-3:]
    values = [monthly_totals[m] for m in recent]

    avg = statistics.mean(values)
    # If avg is implausibly low (sparse data), blend with global average
    if avg < 50:
        return (avg + GLOBAL_MONTHLY_AVG_KG) / 2

    return round(avg, 2)


def build_forecast(
    user_id: str,
    activity_history: list[dict[str, object]],
    interventions: list[str],
    label: str = "Committed You",
) -> dict[str, object]:
    """Build a 12-month forecast scenario.

    Args:
        user_id:          Authenticated user ID for cache keying.
        activity_history: User's historical ActivityRecord list.
        interventions:    List of active intervention keys.
        label:            Display label for this scenario.

    Returns:
        A ForecastScenario-compatible dict.
    """
    # Check cache first — scenarios are expensive to recompute
    cache_key = scenario_hash(user_id, interventions)
    cached = get_cached_scenario(cache_key)
    if cached is not None:
        logger.debug("Forecast cache HIT for user %s, %d interventions", user_id, len(interventions))
        # The cached trajectory is keyed on (user, interventions) and is
        # label-independent — apply the requested label so "Current You" vs
        # "Committed You" never collide on a shared cache entry.
        return {**cached, "label": label}

    baseline = _baseline_monthly_avg(activity_history)
    monthly = project_trajectory(baseline, interventions)

    total_co2e = round(sum(monthly), 2)
    baseline_total = round(baseline * 12, 2)
    vs_baseline_pct = round((total_co2e - baseline_total) / max(baseline_total, 0.001) * 100, 1)

    scenario: dict[str, object] = {
        "scenario_id": cache_key,
        "label": label,
        "interventions": interventions,
        "monthly_co2e_kg": monthly,
        "total_co2e_kg": total_co2e,
        "vs_baseline_pct": vs_baseline_pct,
    }

    set_cached_scenario(cache_key, scenario)
    return scenario


def build_dual_forecast(
    user_id: str,
    activity_history: list[dict[str, object]],
    active_interventions: list[str],
) -> tuple[dict[str, object], dict[str, object]]:
    """Build both Current You and Committed You scenarios for the simulator.

    Returns:
        (current_scenario, committed_scenario) — both ForecastScenario dicts.
    """
    current = build_forecast(
        user_id=user_id,
        activity_history=activity_history,
        interventions=[],
        label="Current You",
    )
    committed = build_forecast(
        user_id=user_id,
        activity_history=activity_history,
        interventions=active_interventions,
        label="Committed You",
    )
    return current, committed
