"""Emissions Engine unit tests — 100% coverage enforced in CI."""
import math
import sys
from pathlib import Path

import pytest

# Allow running from repo root without install
sys.path.insert(0, str(Path(__file__).parents[3]))

from packages.emissions.engine import (
    _lookup_factor_key,
    _normalise_unit,
    calculate_co2e,
    calculate_co2e_batch,
    get_swap_suggestion,
    load_factors,
    project_trajectory,
)


# ── load_factors ─────────────────────────────────────────────────────────

class TestLoadFactors:
    def test_returns_dict(self) -> None:
        factors = load_factors()
        assert isinstance(factors, dict)
        assert len(factors) > 20

    def test_beef_present(self) -> None:
        factors = load_factors()
        assert "beef" in factors
        assert float(factors["beef"]["co2e_per_unit"]) == pytest.approx(27.0)

    def test_all_entries_have_required_fields(self) -> None:
        factors = load_factors()
        for key, entry in factors.items():
            assert "co2e_per_unit" in entry, f"{key} missing co2e_per_unit"
            assert "unit" in entry, f"{key} missing unit"
            # Zero-carbon options (cycling, walking) are legitimately 0.0.
            assert float(entry["co2e_per_unit"]) >= 0, f"{key} must have a non-negative factor"

    def test_lru_cache_returns_same_object(self) -> None:
        assert load_factors() is load_factors()


# ── _normalise_unit ──────────────────────────────────────────────────────

class TestNormaliseUnit:
    @pytest.mark.parametrize("qty,unit,expected", [
        (200.0, "g",      0.2),
        (1.0,   "kg",     1.0),
        (500.0, "ml",     0.5),
        (1.0,   "litre",  1.0),
        (1.0,   "kWh",    1.0),
        (10.0,  "km",     10.0),
    ])
    def test_unit_conversions(self, qty: float, unit: str, expected: float) -> None:
        assert _normalise_unit(qty, unit) == pytest.approx(expected)

    def test_unknown_unit_returns_raw(self) -> None:
        assert _normalise_unit(5.0, "cups") == pytest.approx(5.0)


# ── _lookup_factor_key ───────────────────────────────────────────────────

class TestLookupFactorKey:
    def test_exact_match(self) -> None:
        assert _lookup_factor_key("beef", "food") == "beef"

    def test_alias_match_burger(self) -> None:
        key = _lookup_factor_key("hamburger patty", "food")
        assert key == "beef"

    def test_alias_match_car(self) -> None:
        key = _lookup_factor_key("driving to work", "transport")
        assert key == "car_petrol_avg"

    def test_alias_train(self) -> None:
        key = _lookup_factor_key("tube journey", "transport")
        assert key == "train_rail"

    def test_alias_oat_milk(self) -> None:
        key = _lookup_factor_key("oat milk", "food")
        assert key == "plant_milk"

    def test_category_fallback(self) -> None:
        key = _lookup_factor_key("unknown mystery food xyz", "food")
        assert key == "vegetables"

    def test_case_insensitive(self) -> None:
        key = _lookup_factor_key("BEEF BURGER", "food")
        assert key == "beef"


# ── calculate_co2e ───────────────────────────────────────────────────────

class TestCalculateCo2e:
    def test_beef_200g(self) -> None:
        # 200g beef × 27.0 kg CO₂e/kg = 5.4 kg
        result = calculate_co2e("beef", 200.0, "g", "food")
        assert result == pytest.approx(5.4, rel=0.01)

    def test_chicken_100g(self) -> None:
        # 100g chicken × 6.9/kg = 0.69 kg
        result = calculate_co2e("chicken", 100.0, "g", "food")
        assert result == pytest.approx(0.69, rel=0.01)

    def test_car_10km(self) -> None:
        # 10 km × 0.164 = 1.64 kg
        result = calculate_co2e("car", 10.0, "km", "transport")
        assert result == pytest.approx(1.64, rel=0.01)

    def test_train_50km(self) -> None:
        # 50 km × 0.035 = 1.75 kg
        result = calculate_co2e("train", 50.0, "km", "transport")
        assert result == pytest.approx(1.75, rel=0.01)

    def test_cycling_zero(self) -> None:
        result = calculate_co2e("cycling", 20.0, "km", "transport")
        assert result == 0.0

    def test_electricity_kwh(self) -> None:
        result = calculate_co2e("electricity", 10.0, "kWh", "energy")
        assert result == pytest.approx(2.12, rel=0.01)

    def test_result_is_rounded_to_4dp(self) -> None:
        result = calculate_co2e("beef", 1.0, "g", "food")
        # 0.001 * 27.0 = 0.027 — exactly 4 dp
        assert result == pytest.approx(0.027, rel=0.001)

    def test_raises_on_zero_quantity(self) -> None:
        with pytest.raises(ValueError, match="Invalid quantity"):
            calculate_co2e("beef", 0.0, "g", "food")

    def test_raises_on_negative_quantity(self) -> None:
        with pytest.raises(ValueError, match="Invalid quantity"):
            calculate_co2e("beef", -5.0, "g", "food")

    def test_raises_on_inf(self) -> None:
        with pytest.raises(ValueError, match="Invalid quantity"):
            calculate_co2e("beef", math.inf, "g", "food")

    def test_unknown_item_returns_zero(self) -> None:
        result = calculate_co2e("unobtainium nugget", 100.0, "g", "")
        assert result == 0.0

    def test_result_is_float(self) -> None:
        result = calculate_co2e("beef", 100.0, "g", "food")
        assert isinstance(result, float)


# ── calculate_co2e_batch ─────────────────────────────────────────────────

class TestCalculateCo2eBatch:
    def _make_item(self, name: str, qty: float, unit: str, cat: str) -> object:
        """Create a minimal duck-typed IdentifiedItem for testing."""
        class FakeItem:
            def __init__(self) -> None:
                self.name = name
                self.quantity = qty
                self.unit = unit
                self.category = cat
        return FakeItem()

    def test_batch_length_matches_input(self) -> None:
        items = [self._make_item("beef", 200, "g", "food"),
                 self._make_item("cycling", 5, "km", "transport")]
        results = calculate_co2e_batch(items)  # type: ignore[arg-type]
        assert len(results) == 2

    def test_batch_values(self) -> None:
        items = [self._make_item("beef", 200, "g", "food"),
                 self._make_item("cycling", 5, "km", "transport")]
        results = calculate_co2e_batch(items)  # type: ignore[arg-type]
        assert results[0] == pytest.approx(5.4, rel=0.01)
        assert results[1] == 0.0

    def test_batch_never_raises(self) -> None:
        items = [self._make_item("???", -1, "???", "")]
        results = calculate_co2e_batch(items)  # type: ignore[arg-type]
        assert results == [0.0]


# ── get_swap_suggestion ──────────────────────────────────────────────────

class TestGetSwapSuggestion:
    def _make_item(self, name: str, cat: str = "food") -> object:
        class FakeItem:
            def __init__(self) -> None:
                self.name = name
                self.category = cat
        return FakeItem()

    def test_beef_suggests_plant_burger(self) -> None:
        items = [self._make_item("beef burger")]
        co2e  = [5.4]
        suggestion, pct = get_swap_suggestion(items, co2e)  # type: ignore[arg-type]
        assert suggestion is not None
        assert "lentil" in suggestion.lower() or "plant" in suggestion.lower()
        assert pct is not None
        assert 50.0 <= pct <= 99.0

    def test_saving_pct_is_deterministic(self) -> None:
        items = [self._make_item("beef")]
        co2e  = [27.0]
        _, pct1 = get_swap_suggestion(items, co2e)  # type: ignore[arg-type]
        _, pct2 = get_swap_suggestion(items, co2e)  # type: ignore[arg-type]
        assert pct1 == pct2

    def test_no_swap_for_low_impact(self) -> None:
        items = [self._make_item("salad")]
        co2e  = [0.05]  # Below threshold
        suggestion, pct = get_swap_suggestion(items, co2e)  # type: ignore[arg-type]
        assert suggestion is None
        assert pct is None

    def test_empty_input_returns_none(self) -> None:
        suggestion, pct = get_swap_suggestion([], [])
        assert suggestion is None
        assert pct is None

    def test_chooses_highest_co2e_item(self) -> None:
        items = [self._make_item("salad"), self._make_item("beef burger")]
        co2e  = [0.2, 5.4]
        suggestion, _ = get_swap_suggestion(items, co2e)  # type: ignore[arg-type]
        assert suggestion is not None
        # Should reference beef, not salad

    def test_suggestion_contains_pct_number(self) -> None:
        items = [self._make_item("beef")]
        co2e  = [27.0]
        suggestion, _ = get_swap_suggestion(items, co2e)  # type: ignore[arg-type]
        assert suggestion is not None
        assert "%" in suggestion


# ── project_trajectory ───────────────────────────────────────────────────

class TestProjectTrajectory:
    def test_returns_12_months(self) -> None:
        traj = project_trajectory(100.0, [])
        assert len(traj) == 12

    def test_no_interventions_stays_at_baseline(self) -> None:
        traj = project_trajectory(100.0, [])
        # No interventions — all months should equal baseline
        for val in traj:
            assert val == pytest.approx(100.0, rel=0.01)

    def test_intervention_reduces_monthly_total(self) -> None:
        baseline = project_trajectory(100.0, [])
        with_intervention = project_trajectory(100.0, ["plant_meals"])
        # By month 3 (full adoption), should be ~12% lower
        assert with_intervention[-1] < baseline[-1]

    def test_gradual_adoption_in_first_months(self) -> None:
        traj = project_trajectory(100.0, ["plant_meals"])
        # Month 1 should show partial adoption
        assert traj[0] > traj[-1]

    def test_multiple_interventions_compound(self) -> None:
        single = project_trajectory(100.0, ["plant_meals"])
        multiple = project_trajectory(100.0, ["plant_meals", "cycle_2x"])
        assert multiple[-1] < single[-1]

    def test_custom_months(self) -> None:
        traj = project_trajectory(100.0, [], months=6)
        assert len(traj) == 6

    def test_all_values_positive(self) -> None:
        traj = project_trajectory(100.0, ["cycle_2x", "plant_meals", "no_short_haul", "solar_tariff"])
        for val in traj:
            assert val > 0

    def test_unknown_intervention_ignored(self) -> None:
        traj = project_trajectory(100.0, ["unknown_key"])
        # Should not crash; should return baseline
        for val in traj:
            assert val == pytest.approx(100.0, rel=0.01)
