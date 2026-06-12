"""Pytest fixtures for agents tests.

Gemini calls are never made in CI — all LLM interactions use golden-file
cassettes (VCR-style via pytest-recording). New cassettes are recorded once
with a real API key then committed; CI replays them offline.
"""
import sys
from pathlib import Path

import pytest

# Add repo root to path for shared package imports
sys.path.insert(0, str(Path(__file__).parents[4]))


@pytest.fixture
def mock_ingest_items() -> list[dict[str, object]]:
    """Standard burger meal fixture used across multiple tests."""
    return [
        {"name": "beef burger patty", "quantity": 150, "unit": "g", "category": "food", "confidence": 0.94},
        {"name": "white bread bun",   "quantity": 60,  "unit": "g", "category": "food", "confidence": 0.91},
        {"name": "french fries",      "quantity": 100, "unit": "g", "category": "food", "confidence": 0.88},
        {"name": "cola drink",        "quantity": 330, "unit": "ml","category": "food", "confidence": 0.97},
    ]


@pytest.fixture
def mock_activity_history() -> list[dict[str, object]]:
    """3-month activity history for forecast tests."""
    return [
        {"id": "act_001", "timestamp": "2026-03-15T12:00:00Z", "category": "food",      "description": "beef burger",   "co2e_kg": 5.4},
        {"id": "act_002", "timestamp": "2026-03-16T08:00:00Z", "category": "transport", "description": "car 20km",       "co2e_kg": 3.28},
        {"id": "act_003", "timestamp": "2026-03-17T19:00:00Z", "category": "food",      "description": "chicken dinner", "co2e_kg": 1.38},
        {"id": "act_004", "timestamp": "2026-04-01T12:00:00Z", "category": "food",      "description": "beef steak",     "co2e_kg": 8.1},
        {"id": "act_005", "timestamp": "2026-04-05T18:00:00Z", "category": "transport", "description": "flight 200km",   "co2e_kg": 51.0},
        {"id": "act_006", "timestamp": "2026-05-10T12:00:00Z", "category": "energy",    "description": "electricity",    "co2e_kg": 4.24},
        {"id": "act_007", "timestamp": "2026-05-15T12:00:00Z", "category": "food",      "description": "salmon fillet",  "co2e_kg": 0.51},
        {"id": "act_008", "timestamp": "2026-05-20T09:00:00Z", "category": "transport", "description": "train 80km",     "co2e_kg": 2.8},
    ]
