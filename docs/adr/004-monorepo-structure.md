# ADR 004 — Monorepo with npm Workspaces

**Date:** 2026-06-12
**Status:** Accepted

## Context

The project has a Next.js frontend, a FastAPI gateway, ADK agents, an insights worker, and shared schema types. These could be separate repos or a monorepo.

## Decision

Single **monorepo** using npm workspaces for JavaScript packages, with Python services as subdirectories.

## Rationale

- Single CI pipeline: lint → typecheck → test → build → deploy for all services in one workflow
- Shared schemas in `packages/schemas/` prevent type drift between frontend TypeScript and backend Pydantic models
- Judges can clone one repo and see the entire system
- `docker compose up` boots everything from one command
- Conventional commits apply to the entire system — a single `git log` tells the full story

## Consequences

- Python services can't use npm workspaces but co-locate naturally as `services/`
- CI matrix must handle both Node.js and Python environments
- Shared schemas require manual synchronization between `models.py` and `models.ts` (acceptable — a schema-codegen tool would be premature optimization)
