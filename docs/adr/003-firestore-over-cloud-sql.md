# ADR 003 — Firestore over Cloud SQL

**Date:** 2026-06-12
**Status:** Accepted

## Context

The application needs to store user profiles, activity records, and ADK agent memory. Two options were considered: Cloud SQL (PostgreSQL) and Firestore.

## Decision

Use **Firestore** (native mode).

## Rationale

- Schemaless: agent memory structures evolve rapidly during a hackathon
- Serverless scaling: no connection pool management
- Built-in real-time listeners: useful for streaming globe updates to the frontend
- Generous free tier: sufficient for a hackathon with judge demo traffic
- Local emulator: `gcloud emulators firestore start` — works with `docker compose up`
- ADK agents have first-class Firestore tool support

## Consequences

- No relational queries (acceptable — all queries are user-scoped by uid)
- No transactions across collections (acceptable for current data model)
- All queries must include `.where("user_id", "==", uid)` — enforced by code review and tests
