"""Deterministic Emissions Engine.

All CO₂e arithmetic lives here. Gemini identifies and extracts items;
this module does every multiplication and lookup.

Design principles:
- Pure functions — no I/O, no network calls.
- Redis-cacheable factors (∞ TTL — factors only update with DEFRA releases).
- 100% unit-test coverage enforced in CI.
"""
import json
import math
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Protocol

FACTORS_PATH = Path(__file__).parent / "factors" / "defra_2024.json"


class IdentifiedItem(Protocol):
    """Structural type for items passed to batch helpers (name/quantity/unit/category)."""

    name: str
    quantity: float
    unit: str
    category: Any

# Swap suggestion map: high-impact key → (lower-impact key, label template)
_SWAPS: dict[str, tuple[str, str]] = {
    "beef":         ("plant_burger", "Try a lentil/plant-based burger"),
    "lamb":         ("chicken",      "Try chicken instead of lamb"),
    "pork":         ("chicken",      "Try chicken instead of pork"),
    "butter":       ("olive_oil",    "Use olive oil instead of butter"),
    "cheese":       ("legumes",      "Try hummus or legume-based spread"),
    "shrimp_prawns":("legumes",      "Try tofu or legumes instead of shrimp"),
    "car_petrol_avg":("cycling",     "Cycle or take the train instead"),
    "car_diesel_avg":("train_rail",  "Take the train instead of driving"),
    "flight_domestic":("train_rail", "Take the train — same journey, much less CO₂"),
    "flight_short_haul":("train_rail","Consider rail for short-haul trips"),
    "beef_burger":  ("plant_burger", "Try a lentil/plant-based burger"),
    "milk":         ("plant_milk",   "Swap dairy milk for oat milk"),
    "cream":        ("plant_milk",   "Use oat cream instead"),
    "chocolate":    ("fruit",        "Try fresh fruit as a lower-carbon snack"),
    "coffee":       ("tea",          "Green tea has ~44% lower footprint than coffee"),
}

# Unit conversion to kg for normalization
_UNIT_TO_KG: dict[str, float] = {
    "kg": 1.0,
    "g": 0.001,
    "mg": 0.000001,
    "litre": 1.0,
    "l": 1.0,
    "ml": 0.001,
    "item": 1.0,
    "km": 1.0,
    "m": 0.001,
    "pax_km": 1.0,
    "kwh": 1.0,
}


@lru_cache(maxsize=1)
def load_factors() -> dict[str, dict[str, object]]:
    """Load DEFRA 2024 emission factors from bundled JSON. Cached after first call."""
    with FACTORS_PATH.open() as f:
        raw = json.load(f)
    # Flatten into key → factor_entry including metadata
    flat: dict[str, dict[str, object]] = {}
    for _category, entries in raw.items():
        if _category.startswith("_"):
            continue
        for key, val in entries.items():
            flat[key] = {**val, "category_group": _category}
    return flat


def _normalise_unit(value: float, from_unit: str) -> float:
    """Convert quantity to the unit stored in the factor table."""
    unit = from_unit.lower().strip()
    multiplier = _UNIT_TO_KG.get(unit, 1.0)
    return value * multiplier


def _lookup_factor_key(item_name: str, category: str) -> str | None:
    """Find the best matching factor key for an identified item.

    Uses alias matching first, then substring matching as fallback.
    Returns None if no match — caller should use a category default.
    """
    factors = load_factors()
    name_lower = item_name.lower().strip()

    # 1. Exact key match
    if name_lower in factors:
        return name_lower

    # 2. Alias match — whole-word, longest-alias-wins. Substring matching would
    #    wrongly map "car" → "carrot" (vegetables) or "oat milk" → dairy "milk";
    #    word boundaries + preferring the longest alias avoid both. Mirrors the
    #    TypeScript engine's lookupFactorKey (frontend/lib/emissions).
    best_key: str | None = None
    best_len = 0
    for key, entry in factors.items():
        aliases = entry.get("aliases", [])
        if isinstance(aliases, list):
            for alias in aliases:
                if not isinstance(alias, str):
                    continue
                if re.search(rf"\b{re.escape(alias)}\b", name_lower) and len(alias) > best_len:
                    best_key, best_len = key, len(alias)
    if best_key is not None:
        return best_key

    # 3. Substring match on the key's own stem (e.g. "electric…" → electricity_uk)
    for key in factors:
        if key.split("_")[0] in name_lower:
            return key

    # 4. Category-group fallback
    _CATEGORY_DEFAULTS = {
        "food": "vegetables",
        "transport": "car_petrol_avg",
        "energy": "electricity_uk",
        "shopping": "clothing_tshirt",
    }
    return _CATEGORY_DEFAULTS.get(category)


def calculate_co2e(item_name: str, quantity: float, unit: str, category: str) -> float:
    """Calculate kg CO₂e for a single identified item.

    Args:
        item_name: Human-readable name from the Ingest Agent (e.g. "Beef burger").
        quantity:  Numeric quantity (e.g. 200.0).
        unit:      Unit string matching the factor table (e.g. "g", "km", "kWh").
        category:  ActivityCategory value for fallback resolution.

    Returns:
        CO₂e in kilograms, rounded to 4 decimal places.

    Raises:
        ValueError: If quantity is non-positive or not finite.
    """
    if not math.isfinite(quantity) or quantity <= 0:
        raise ValueError(f"Invalid quantity: {quantity!r}")

    factors = load_factors()
    key = _lookup_factor_key(item_name, category)

    if key is None or key not in factors:
        return 0.0

    entry = factors[key]
    co2e_per_unit: float = float(entry["co2e_per_unit"])  # type: ignore[arg-type]

    # Normalise input quantity to factor's native unit
    normalised_qty = _normalise_unit(quantity, unit)

    # If factor is per kg but input is in litres (e.g. milk), assume density ~1 kg/L
    result = normalised_qty * co2e_per_unit

    return round(result, 4)


def calculate_co2e_batch(
    items: "list[IdentifiedItem]",
) -> list[float]:
    """Calculate CO₂e for a list of IdentifiedItem objects.

    Returns a parallel list of kg CO₂e values.
    Never raises — returns 0.0 for items that cannot be matched.
    """
    results: list[float] = []
    for item in items:
        try:
            co2e = calculate_co2e(
                item_name=item.name,
                quantity=item.quantity,
                unit=item.unit,
                category=item.category.value if hasattr(item.category, "value") else str(item.category),
            )
        except (ValueError, KeyError, TypeError):
            co2e = 0.0
        results.append(co2e)
    return results


def get_swap_suggestion(
    items: "list[IdentifiedItem]",
    item_co2e: list[float],
) -> tuple[str | None, float | None]:
    """Identify the highest-CO₂e item and return a concrete swap suggestion.

    Returns:
        (suggestion_text, saving_pct) — both None if no high-impact swap found.

    The saving_pct is calculated deterministically from factor table values,
    never invented by the LLM.
    """
    if not items or not item_co2e:
        return None, None

    factors = load_factors()

    # Find highest-CO₂e item
    max_idx = max(range(len(item_co2e)), key=lambda i: item_co2e[i])
    worst_item = items[max_idx]
    worst_co2e = item_co2e[max_idx]

    if worst_co2e <= 0.1:  # Skip if impact is negligible (<100g CO₂e)
        return None, None

    key = _lookup_factor_key(worst_item.name, str(worst_item.category))
    if key is None:
        return None, None

    swap_key, label = _SWAPS.get(key, (None, None))
    if swap_key is None or label is None:
        return None, None

    if swap_key not in factors:
        return None, None

    # Calculate saving using actual factor values — deterministic, not LLM-invented
    original_factor = float(factors[key]["co2e_per_unit"])  # type: ignore[arg-type]
    swap_factor = float(factors[swap_key]["co2e_per_unit"])  # type: ignore[arg-type]

    if original_factor <= 0:
        return None, None

    saving_pct = round((1.0 - swap_factor / original_factor) * 100, 1)

    if saving_pct < 5:  # Not worth mentioning if saving < 5%
        return None, None

    suggestion = f"{label} — saves {saving_pct:.0f}% CO₂e"
    return suggestion, saving_pct


def project_trajectory(
    baseline_monthly_avg_kg: float,
    interventions: list[str],
    months: int = 12,
) -> list[float]:
    """Project a monthly CO₂e trajectory given a baseline and active interventions.

    Interventions are applied as multiplicative reductions.
    Returns a list of ``months`` floats (kg CO₂e per month).

    This is the sole source of truth for Parallel-You Simulator numbers.
    """
    INTERVENTION_SAVINGS: dict[str, float] = {
        "cycle_2x":       0.08,   # 8% reduction
        "plant_meals":    0.12,   # 12% reduction
        "no_short_haul":  0.15,   # 15% reduction
        "solar_tariff":   0.06,   # 6% reduction
    }

    # Compound the reductions (each intervention is independent)
    total_reduction = 1.0
    for key in interventions:
        reduction = INTERVENTION_SAVINGS.get(key, 0.0)
        total_reduction *= (1.0 - reduction)

    # Apply a gradual adoption curve — behaviour change isn't instant
    trajectory: list[float] = []
    for month in range(months):
        adoption = min(1.0, (month + 1) / 3.0)  # Full adoption by month 3
        effective_reduction = 1.0 - (1.0 - total_reduction) * adoption
        monthly_kg = round(baseline_monthly_avg_kg * effective_reduction, 2)
        trajectory.append(monthly_kg)

    return trajectory
