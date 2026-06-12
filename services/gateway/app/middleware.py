"""Security headers and rate limiting middleware."""
import time
from collections import defaultdict
from typing import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Adds security headers to every response."""

    HEADERS: dict[str, str] = {
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "X-XSS-Protection": "0",  # Modern browsers don't need it; can cause issues
        "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        "Content-Security-Policy": (
            "default-src 'self'; "
            "script-src 'none'; "
            "object-src 'none'; "
            "base-uri 'self';"
        ),
    }

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response = await call_next(request)
        for header, value in self.HEADERS.items():
            response.headers[header] = value
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-process rate limiter. Replace with Redis-backed limiter in production."""

    def __init__(self, app: ASGIApp, requests_per_minute: int = 60) -> None:
        super().__init__(app)
        self._limit = requests_per_minute
        self._window = 60.0
        self._counts: dict[str, list[float]] = defaultdict(list)

    def _get_client_id(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        if request.url.path in ("/health", "/"):
            return await call_next(request)

        client_id = self._get_client_id(request)
        now = time.monotonic()
        window_start = now - self._window

        # Evict old timestamps
        self._counts[client_id] = [t for t in self._counts[client_id] if t > window_start]

        if len(self._counts[client_id]) >= self._limit:
            return Response(
                content='{"error":"rate_limit_exceeded","message":"Too many requests."}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": "60"},
            )

        self._counts[client_id].append(now)
        return await call_next(request)
