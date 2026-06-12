"""Three-tier caching layer for the EcoPulse agents service.

Tier 1 — Redis: emission factors (∞ TTL, never evicted until version bump).
Tier 2 — Semantic cache: image hash → Gemini ingest result (∞ TTL for same image).
Tier 3 — Gemini context cache: long Coach system prompt (saves input tokens).
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

_redis_client: Any = None


def _get_redis() -> Any:
    """Lazy Redis connection — returns None if Redis is unavailable (dev fallback)."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    try:
        import redis  # type: ignore[import-untyped]
        _redis_client = redis.from_url(redis_url, decode_responses=True, socket_connect_timeout=1)
        _redis_client.ping()
        return _redis_client
    except Exception as exc:
        logger.warning("Redis unavailable (%s) — falling back to in-process dict cache", exc)
        return None


# In-process fallback when Redis is unavailable
_local_cache: dict[str, str] = {}


def cache_get(key: str) -> str | None:
    """Get a value from cache (Redis → local fallback)."""
    r = _get_redis()
    if r is not None:
        try:
            return r.get(key)  # type: ignore[no-any-return]
        except Exception:
            pass
    return _local_cache.get(key)


def cache_set(key: str, value: str, ttl_seconds: int | None = None) -> None:
    """Set a value in cache. ttl_seconds=None means persist forever."""
    r = _get_redis()
    if r is not None:
        try:
            if ttl_seconds:
                r.setex(key, ttl_seconds, value)
            else:
                r.set(key, value)
            return
        except Exception:
            pass
    _local_cache[key] = value


def cache_delete(key: str) -> None:
    """Delete a key from cache."""
    r = _get_redis()
    if r is not None:
        try:
            r.delete(key)
        except Exception:
            pass
    _local_cache.pop(key, None)


# ── Tier 1: Emission factors cache ────────────────────────────────────────

FACTOR_CACHE_PREFIX = "ef:v2024:"


def get_cached_factors(version: str) -> dict[str, Any] | None:
    """Load emission factors from Redis (∞ TTL — only evict on version bump)."""
    raw = cache_get(f"{FACTOR_CACHE_PREFIX}{version}")
    if raw is None:
        return None
    try:
        return json.loads(raw)  # type: ignore[no-any-return]
    except json.JSONDecodeError:
        return None


def set_cached_factors(version: str, factors: dict[str, Any]) -> None:
    """Store emission factors in Redis with no TTL."""
    cache_set(f"{FACTOR_CACHE_PREFIX}{version}", json.dumps(factors))


# ── Tier 2: Semantic image cache ──────────────────────────────────────────

SEMANTIC_CACHE_PREFIX = "img:"
SEMANTIC_CACHE_TTL = 86400 * 30  # 30 days


def image_hash(image_bytes: bytes) -> str:
    """SHA-256 hash of raw image bytes — used as semantic cache key."""
    return hashlib.sha256(image_bytes).hexdigest()


def get_cached_ingest(img_hash: str) -> list[dict[str, Any]] | None:
    """Return cached ingest result for an image hash, or None on miss."""
    raw = cache_get(f"{SEMANTIC_CACHE_PREFIX}{img_hash}")
    if raw is None:
        return None
    try:
        result = json.loads(raw)
        logger.debug("Semantic cache HIT for image hash %s…", img_hash[:8])
        return result  # type: ignore[no-any-return]
    except json.JSONDecodeError:
        return None


def set_cached_ingest(img_hash: str, items: list[dict[str, Any]]) -> None:
    """Store ingest result against image hash."""
    cache_set(f"{SEMANTIC_CACHE_PREFIX}{img_hash}", json.dumps(items), SEMANTIC_CACHE_TTL)


# ── Tier 3: Forecast scenario cache ──────────────────────────────────────

FORECAST_CACHE_PREFIX = "fc:"
FORECAST_CACHE_TTL = 3600  # 1 hour


def scenario_hash(user_id: str, interventions: list[str]) -> str:
    """Deterministic hash of a forecast scenario."""
    sorted_interventions = sorted(interventions)
    raw = f"{user_id}:{','.join(sorted_interventions)}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def get_cached_scenario(hash_key: str) -> dict[str, Any] | None:
    """Return cached forecast scenario, or None on miss."""
    raw = cache_get(f"{FORECAST_CACHE_PREFIX}{hash_key}")
    if raw is None:
        return None
    try:
        return json.loads(raw)  # type: ignore[no-any-return]
    except json.JSONDecodeError:
        return None


def set_cached_scenario(hash_key: str, scenario: dict[str, Any]) -> None:
    """Cache a forecast scenario for 1 hour."""
    cache_set(f"{FORECAST_CACHE_PREFIX}{hash_key}", json.dumps(scenario), FORECAST_CACHE_TTL)
