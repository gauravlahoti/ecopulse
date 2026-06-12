"""Vendored copy of packages/emissions for the ADK Cloud Run bundle.

`adk deploy cloud_run` only packages the agent folder, so the deterministic
emissions engine is vendored here. packages/emissions/ remains the canonical
source (with its test suite); keep the two in sync.
"""
