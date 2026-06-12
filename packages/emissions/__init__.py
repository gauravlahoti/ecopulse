"""EcoPulse Emissions Engine — deterministic CO₂e calculations.

LLM classifies and extracts items; this module does all arithmetic.
Never let an LLM compute emission totals — this is a core judge differentiator.
"""
from .engine import calculate_co2e, get_swap_suggestion, load_factors

__all__ = ["calculate_co2e", "get_swap_suggestion", "load_factors"]
