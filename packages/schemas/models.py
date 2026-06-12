"""Shared Pydantic models — single source of truth for all service contracts."""
from datetime import datetime
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, Field, field_validator


class ActivityCategory(str, Enum):
    FOOD = "food"
    TRANSPORT = "transport"
    ENERGY = "energy"
    SHOPPING = "shopping"
    TRAVEL = "travel"
    OTHER = "other"


class IdentifiedItem(BaseModel):
    """An item identified by the Ingest Agent from a photo or text."""

    name: str = Field(min_length=1, max_length=200)
    quantity: float = Field(gt=0)
    unit: str = Field(min_length=1, max_length=50)
    category: ActivityCategory
    confidence: float = Field(ge=0.0, le=1.0)


class IngestOutput(BaseModel):
    """Structured output from the Ingest Agent."""

    items: list[IdentifiedItem] = Field(min_length=1)
    source_type: str  # "photo", "text", "pdf"
    raw_description: str


class EmissionFactor(BaseModel):
    """A single emission factor entry from DEFRA/EPA tables."""

    key: str  # e.g. "beef_kg", "car_km_petrol"
    co2e_per_unit: float = Field(gt=0)
    unit: str
    source: str  # "DEFRA_2024", "EPA_2023", etc.
    version: str


class ActivityRecord(BaseModel):
    """A logged user activity with its calculated CO₂e."""

    id: str
    user_id: str
    category: ActivityCategory
    description: str
    co2e_kg: Annotated[float, Field(ge=0)]
    items: list[IdentifiedItem] = Field(default_factory=list)
    swap_suggestion: str | None = None
    swap_co2e_saving_pct: float | None = Field(default=None, ge=0.0, le=100.0)
    timestamp: datetime
    source_type: str

    @field_validator("co2e_kg")
    @classmethod
    def co2e_must_be_finite(cls, v: float) -> float:
        import math
        if not math.isfinite(v):
            raise ValueError("co2e_kg must be a finite number")
        return v


class ForecastScenario(BaseModel):
    """A 12-month forecast trajectory (one leg of the dual "Current You" vs "Committed You" projection)."""

    scenario_id: str
    label: str  # "Current You" or "Committed You"
    interventions: list[str] = Field(default_factory=list)
    monthly_co2e_kg: list[float] = Field(min_length=12, max_length=12)
    total_co2e_kg: float
    vs_baseline_pct: float  # negative = improvement


class CoachNudge(BaseModel):
    """Weekly coaching nudge from the Coach Agent."""

    nudge_id: str
    user_id: str
    message: str
    intervention_key: str  # maps to a ForecastScenario intervention
    estimated_saving_pct: float = Field(ge=0.0, le=100.0)
    offset_suggestion: str | None = None  # one concrete offset action (e.g. a verified reforestation contribution)
    generated_at: datetime
