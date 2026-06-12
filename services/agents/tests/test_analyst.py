"""Tests for the Analyst Agent — CO₂e calculation and swap suggestion."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parents[4]))

from services.agents.app.agents.analyst import analyse


class TestAnalyse:
    def test_burger_meal_total(self, mock_ingest_items: list[dict[str, object]]) -> None:
        record = analyse(mock_ingest_items, "user_001", "photo")
        # 150g beef (27×0.15=4.05) + 60g bread (1.3×0.06≈0.078) + 100g fries (0.46×0.1=0.046) + 330ml cola
        # Total should be > 4.0 kg
        assert record["co2e_kg"] > 4.0

    def test_all_required_fields_present(self, mock_ingest_items: list[dict[str, object]]) -> None:
        record = analyse(mock_ingest_items, "user_001", "photo")
        required = {"id", "user_id", "category", "description", "co2e_kg", "items", "timestamp", "source_type"}
        assert required.issubset(record.keys())

    def test_user_id_is_preserved(self, mock_ingest_items: list[dict[str, object]]) -> None:
        record = analyse(mock_ingest_items, "user_test_abc", "text")
        assert record["user_id"] == "user_test_abc"

    def test_source_type_is_preserved(self, mock_ingest_items: list[dict[str, object]]) -> None:
        record = analyse(mock_ingest_items, "u1", "pdf")
        assert record["source_type"] == "pdf"

    def test_swap_suggestion_present_for_beef(self, mock_ingest_items: list[dict[str, object]]) -> None:
        record = analyse(mock_ingest_items, "u1", "photo")
        assert "swap_suggestion" in record
        assert record["swap_suggestion"] is not None

    def test_swap_saving_pct_is_deterministic(self, mock_ingest_items: list[dict[str, object]]) -> None:
        r1 = analyse(mock_ingest_items, "u1", "photo")
        r2 = analyse(mock_ingest_items, "u1", "photo")
        assert r1.get("swap_co2e_saving_pct") == r2.get("swap_co2e_saving_pct")

    def test_items_have_co2e_kg_field(self, mock_ingest_items: list[dict[str, object]]) -> None:
        record = analyse(mock_ingest_items, "u1", "photo")
        for item in record["items"]:  # type: ignore[union-attr]
            assert "co2e_kg" in item

    def test_empty_items_returns_safe_record(self) -> None:
        record = analyse([], "u1", "photo")
        assert record["co2e_kg"] == 0.0
        assert record["category"] == "other"

    def test_id_format(self, mock_ingest_items: list[dict[str, object]]) -> None:
        record = analyse(mock_ingest_items, "u1", "photo")
        assert str(record["id"]).startswith("act_")

    def test_description_joins_item_names(self, mock_ingest_items: list[dict[str, object]]) -> None:
        record = analyse(mock_ingest_items, "u1", "photo")
        description = str(record["description"])
        assert "beef" in description.lower()

    def test_co2e_is_finite(self, mock_ingest_items: list[dict[str, object]]) -> None:
        import math
        record = analyse(mock_ingest_items, "u1", "photo")
        assert math.isfinite(float(record["co2e_kg"]))

    def test_plant_meal_no_beef_swap(self) -> None:
        items = [
            {"name": "lentil soup", "quantity": 300, "unit": "g", "category": "food", "confidence": 0.9},
            {"name": "bread roll",  "quantity": 50,  "unit": "g", "category": "food", "confidence": 0.85},
        ]
        record = analyse(items, "u1", "photo")
        # Low CO₂e meal — may not have a swap suggestion
        assert float(record["co2e_kg"]) < 2.0
