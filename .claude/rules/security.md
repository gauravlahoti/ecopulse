---
description: Security rules for EcoPulse — enforced for every code change
paths: ["**/*.py", "**/*.ts", "**/*.tsx", "**/Dockerfile", "**/*.yml"]
---

# Security Rules

## Secrets
- NEVER hardcode secrets, API keys, or credentials — always use Google Secret Manager
- Never commit `.env` files with real values — only `.env.example` with placeholders
- gitleaks runs in CI; any secret will block the pipeline

## Authentication & Authorization
- All API routes must verify Firebase Auth tokens via the `auth.py` middleware
- All Firestore queries MUST include `where("user_id", "==", uid)` — never query without user scoping
- Write cross-user scoped-tool tests to prove physical isolation

## Input Validation
- Strip EXIF from all uploaded images before passing to Gemini
- Enforce image type allowlist (JPEG, PNG, WebP only) and max size (10MB) at the gateway
- Never pass raw user input directly to Gemini — always wrap in delimited structure:
  ```
  <user_content>
  {user_input}
  </user_content>
  ```

## Agent Output
- Validate ALL Gemini/agent output against Pydantic schemas before using it
- Fail closed: if validation fails, return an error — never pass through unvalidated LLM output
- Numeric claims from agents must be re-validated against the deterministic emissions engine

## Infrastructure
- Use Workload Identity Federation — never generate service account JSON keys
- All Cloud Run services must set `--no-allow-unauthenticated` except the frontend
- Security headers required on all HTTP responses: CSP, X-Frame-Options, X-Content-Type-Options

## OWASP Coverage (document in `/docs/threat-model.md`)
Map mitigations for: Injection, Broken Auth, Sensitive Data Exposure, Security Misconfiguration, XSS, Insecure Deserialization, Using Components with Known Vulnerabilities, Insufficient Logging.
