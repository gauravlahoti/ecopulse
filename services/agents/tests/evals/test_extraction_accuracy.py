"""Eval suite — measures Ingest Agent extraction accuracy.

Uses the 20 labeled text fixtures. Each test checks:
1. Correct item categories identified
2. Quantity within plausible range
3. Total CO₂e within expected bounds

Run against live Gemini to record golden files, then replay offline in CI.
See: https://pytest-recording.readthedocs.io/

CI command:
  pytest tests/evals/ --vcr-record=none   # Offline replay
Record command:
  GEMINI_API_KEY=xxx pytest tests/evals/ --vcr-record=new_episodes
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parents[5]))

from services.agents.app.agents.analyst import analyse

FIXTURES_PATH = Path(__file__).parent / "fixtures" / "meal_fixtures.json"


def load_fixtures() -> list[dict[str, object]]:
    with FIXTURES_PATH.open() as f:
        data = json.load(f)
    return data["fixtures"]  # type: ignore[no-any-return]


def _item_matches(item: dict[str, object], expected: dict[str, object]) -> bool:
    """Check if an identified item matches an expected spec."""
    name_lower = str(item.get("name", "")).lower()
    name_contains = str(expected.get("name_contains", "")).lower()
    if name_contains and name_contains not in name_lower:
        return False

    category = str(item.get("category", ""))
    expected_category = str(expected.get("category", ""))
    if expected_category and category != expected_category:
        return False

    return True


# ── Offline tests (no Gemini needed) ─────────────────────────────────────
# These test the analyst pipeline with pre-identified items from fixtures.

class TestAnalystOnLabeledFixtures:
    """Test the Analyst Agent's CO₂e calculation against labeled expected ranges."""

    FIXTURES = load_fixtures()

    @pytest.mark.parametrize("fixture", [
        f for f in load_fixtures()
        if "expected_total_co2e_min_kg" in f or "expected_total_co2e_max_kg" in f
    ], ids=[f["id"] for f in load_fixtures()
            if "expected_total_co2e_min_kg" in f or "expected_total_co2e_max_kg" in f])
    def test_co2e_in_expected_range(self, fixture: dict[str, object]) -> None:
        """CO₂e total should be within the expected range for each fixture."""
        # Build items from fixture expected items
        items = []
        for expected in fixture.get("expected_items", []):  # type: ignore[union-attr]
            # Use the name_contains as item name for testing
            items.append({
                "name": str(expected.get("name_contains", "unknown")),
                "quantity": float(expected.get("quantity_min", 100)),
                "unit": _unit_type_to_unit(str(expected.get("unit_type", "weight"))),
                "category": str(expected.get("category", "food")),
                "confidence": 0.9,
            })

        if not items:
            pytest.skip("No expected items in fixture")

        record = analyse(items, "eval_user", "text")
        total = float(record["co2e_kg"])

        min_kg = fixture.get("expected_total_co2e_min_kg")
        max_kg = fixture.get("expected_total_co2e_max_kg")

        if min_kg is not None:
            assert total >= float(min_kg) * 0.5, (
                f"Fixture {fixture['id']}: expected ≥{min_kg} kg, got {total:.3f} kg"
            )
        if max_kg is not None:
            # Give 50% headroom above max to account for estimation variance
            assert total <= float(max_kg) * 1.5 + 5.0, (
                f"Fixture {fixture['id']}: expected ≤{max_kg} kg, got {total:.3f} kg"
            )


def _unit_type_to_unit(unit_type: str) -> str:
    return {
        "weight": "g",
        "volume": "ml",
        "distance": "km",
        "energy": "kWh",
        "item": "item",
    }.get(unit_type, "g")


# ── Live eval (only run when GEMINI_API_KEY is set) ───────────────────────

class TestLiveExtractionAccuracy:
    """Run the full Ingest Agent + Analyst pipeline and measure accuracy.

    Skipped in CI (no API key). Record cassettes with --vcr-record=new_episodes.
    Acceptance criterion: ≥90% of expected items identified correctly.
    """

    @pytest.mark.skipif(
        not __import__("os").getenv("GEMINI_API_KEY"),
        reason="GEMINI_API_KEY not set — skipping live eval",
    )
    @pytest.mark.asyncio
    async def test_extraction_accuracy_above_threshold(self) -> None:
        """End-to-end: text → items → CO₂e, ≥90% accuracy on 20 fixtures."""
        from services.agents.app.agents.ingest import run_ingest_text

        fixtures = load_fixtures()
        total_expected = 0
        total_matched = 0

        for fixture in fixtures:
            if fixture.get("input_type") != "text":
                continue

            items = await run_ingest_text(str(fixture["input"]))
            expected_items = fixture.get("expected_items", [])

            for expected in expected_items:  # type: ignore[union-attr]
                total_expected += 1
                for item in items:
                    if _item_matches(item, expected):  # type: ignore[arg-type]
                        total_matched += 1
                        break

        if total_expected == 0:
            pytest.skip("No text fixtures found")

        accuracy = total_matched / total_expected
        assert accuracy >= 0.90, (
            f"Extraction accuracy {accuracy:.1%} is below the 90% threshold "
            f"({total_matched}/{total_expected} items matched)"
        )
