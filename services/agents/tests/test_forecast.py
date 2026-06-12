"""Tests for the Forecast Agent — Parallel-You Simulator trajectories."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parents[4]))

from services.agents.app.agents.forecast import (
    _baseline_monthly_avg,
    build_dual_forecast,
    build_forecast,
)


class TestBaselineMonthlyAvg:
    def test_empty_history_returns_global_avg(self) -> None:
        avg = _baseline_monthly_avg([])
        assert avg == pytest.approx(440.0)

    def test_computes_monthly_average(self, mock_activity_history: list[dict[str, object]]) -> None:
        avg = _baseline_monthly_avg(mock_activity_history)
        assert avg > 0
        assert avg < 5000  # Sanity check

    def test_sparse_data_blends_with_global(self) -> None:
        sparse = [{"timestamp": "2026-05-01T00:00:00Z", "co2e_kg": 10.0}]
        avg = _baseline_monthly_avg(sparse)
        assert avg > 10.0  # Blended with global average


class TestBuildForecast:
    def test_returns_12_months(self, mock_activity_history: list[dict[str, object]]) -> None:
        scenario = build_forecast("user_1", mock_activity_history, [])
        assert len(scenario["monthly_co2e_kg"]) == 12  # type: ignore[arg-type]

    def test_all_required_fields(self, mock_activity_history: list[dict[str, object]]) -> None:
        scenario = build_forecast("user_1", mock_activity_history, [])
        required = {"scenario_id", "label", "interventions", "monthly_co2e_kg", "total_co2e_kg", "vs_baseline_pct"}
        assert required.issubset(scenario.keys())

    def test_baseline_vs_baseline_is_zero(self, mock_activity_history: list[dict[str, object]]) -> None:
        scenario = build_forecast("user_1", mock_activity_history, [], label="Current You")
        assert float(scenario["vs_baseline_pct"]) == pytest.approx(0.0, abs=1.0)

    def test_interventions_reduce_total(self, mock_activity_history: list[dict[str, object]]) -> None:
        base = build_forecast("user_1", mock_activity_history, [])
        with_int = build_forecast("user_2", mock_activity_history, ["plant_meals", "cycle_2x"])
        assert float(with_int["total_co2e_kg"]) < float(base["total_co2e_kg"])

    def test_label_is_preserved(self, mock_activity_history: list[dict[str, object]]) -> None:
        scenario = build_forecast("user_1", mock_activity_history, [], label="My Custom Label")
        assert scenario["label"] == "My Custom Label"

    def test_all_monthly_values_positive(self, mock_activity_history: list[dict[str, object]]) -> None:
        scenario = build_forecast("user_1", mock_activity_history, ["plant_meals"])
        for val in scenario["monthly_co2e_kg"]:  # type: ignore[union-attr]
            assert float(val) > 0

    def test_scenario_id_is_deterministic(self, mock_activity_history: list[dict[str, object]]) -> None:
        s1 = build_forecast("user_1", mock_activity_history, ["cycle_2x"])
        s2 = build_forecast("user_1", mock_activity_history, ["cycle_2x"])
        assert s1["scenario_id"] == s2["scenario_id"]


class TestBuildDualForecast:
    def test_returns_two_scenarios(self, mock_activity_history: list[dict[str, object]]) -> None:
        current, committed = build_dual_forecast("user_1", mock_activity_history, ["plant_meals"])
        assert current["label"] == "Current You"
        assert committed["label"] == "Committed You"

    def test_committed_is_lower_with_interventions(self, mock_activity_history: list[dict[str, object]]) -> None:
        current, committed = build_dual_forecast("user_1", mock_activity_history, ["plant_meals", "cycle_2x"])
        assert float(committed["total_co2e_kg"]) < float(current["total_co2e_kg"])

    def test_no_interventions_scenarios_equal(self, mock_activity_history: list[dict[str, object]]) -> None:
        current, committed = build_dual_forecast("user_1", mock_activity_history, [])
        assert float(current["total_co2e_kg"]) == pytest.approx(float(committed["total_co2e_kg"]), rel=0.01)
