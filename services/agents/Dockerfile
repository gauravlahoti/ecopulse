# syntax=docker/dockerfile:1.7
# ── Build stage ──────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder
WORKDIR /build

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ── Dev stage (hot reload) ────────────────────────────────────────────────
FROM python:3.12-slim AS dev
WORKDIR /app

COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy shared packages
COPY ../../packages /app/packages

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]

# ── Production stage (distroless) ────────────────────────────────────────
FROM gcr.io/distroless/python3-debian12 AS production
WORKDIR /app

COPY --from=builder /root/.local/lib /root/.local/lib
ENV PYTHONPATH=/app

COPY ../../packages /app/packages
COPY . .

USER nonroot
EXPOSE 8001

CMD ["-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
