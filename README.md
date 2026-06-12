# EcoPulse 🌍

> Know the carbon in anything — snap a meal, upload a photo, or just describe an activity.
> AI identifies it; a deterministic engine computes verified CO₂e; every number is explained.

EcoPulse is an **agentic carbon-intelligence app**. You log what you consume the way you'd
tell a friend ("paneer butter masala with 2 rotis", "Mumbai to Delhi by car"), and in a few
seconds you get an auditable carbon figure, a labelled breakdown of how it was derived, and an
AI coach that recommends — from *your* data — how to cut it.

🚀 **Live:** https://ecopulse-frontend-593919045544.us-central1.run.app
(Next.js on Cloud Run · `GEMINI_API_KEY` via Secret Manager · publicly accessible)

---

## 1. The vertical — Sustainability / personal carbon footprint

People can't reduce what they can't measure, and existing trackers are either tedious
(manual spreadsheets) or untrustworthy (black-box numbers). EcoPulse targets **everyday
carbon awareness**: frictionless multimodal logging + transparent, science-backed numbers +
personalised, AI-generated guidance.

**Problem → how EcoPulse solves it:**

| The problem | Our solution |
|---|---|
| Logging carbon is tedious | **Snap / Upload / Describe** — multimodal, ~3 s, no forms |
| Tracker numbers are black boxes you can't trust | **Every figure shown as `quantity × DEFRA factor`** with source; LLM never does the math |
| Generic advice doesn't fit the user | **AI Coach + Q&A grounded in the user's own logged data** |
| AI "hallucinates" emission numbers | **Deterministic engine is authoritative**; unmatched items count as 0, never fabricated |

## 2. The core idea — *AI identifies, code calculates*

This is the architectural backbone and the project's main differentiator:

- **The LLM (Gemini) only identifies and classifies** — what's on the plate, the quantity, the
  distance of a trip. It never does arithmetic.
- **A deterministic engine does every CO₂e calculation** from a bundled **DEFRA 2024** emission
  factor table. Each figure is `quantity × factor`, reproducible and shown to the user.

So even when the model is wrong about a number, the *math* is always correct and auditable. The
UI's "How this was calculated" panel renders the exact `quantity × DEFRA factor = kg CO₂e` for
every item, with the source — the LLM's output is never trusted for figures.

Engine: [`frontend/lib/emissions/`](frontend/lib/emissions/) (TypeScript port of the Python
[`services/agents/.../emissions/engine.py`](services/agents/ecopulse_agents/emissions/engine.py),
sharing the same `defra_2024.json` factor file).

## 3. How the solution works

```
                 ┌─ Snap (camera)  ─┐
   User input ───┼─ Upload photo  ──┼──▶ /api/v1/ingest/image ─▶ Gemini vision ─┐
                 └─ Describe (text) ─┘    /api/v1/ingest/text  ─▶ Gemini text   │
                                                                                │  identifies items
                                                                                ▼  (+ bounding boxes)
                                              ┌──────────────────────────────────────────┐
                                              │  Deterministic engine (lib/emissions)     │
                                              │  quantity × DEFRA 2024 factor = kg CO₂e    │
                                              └──────────────────────────────────────────┘
                                                                                │
                          ┌─────────────────────────────────────────────────────┼─────────────────┐
                          ▼                          ▼                            ▼                 ▼
                 Annotated photo            "How this was calculated"      Dashboard charts    AI Coach + Q&A
                 (labelled boxes)            transparent breakdown        (trend, donut)      (grounded in data)
```

1. **Capture** — Snap a meal, upload a photo, or describe an activity in plain language.
2. **Identify (AI)** — Gemini (`gemini-2.5-flash`, falling back to `flash-lite` on rate-limit)
   returns structured items: name, quantity, unit, category — and, for photos, **bounding boxes**
   used to draw labelled highlights over the image. Text input infers distances/portions from
   world knowledge (e.g. "Mumbai → Delhi" ≈ 1400 km).
3. **Calculate (code)** — the deterministic engine maps each item to a DEFRA factor and computes
   CO₂e. This is the single source of truth for every number shown.
4. **Explain** — the breakdown panel shows the arithmetic + DEFRA source for full transparency.
5. **Coach** — Gemini generates a personalised reduction + offset recommendation **from the
   user's actual logged data**, and Carbon Conversations answers questions grounded strictly in
   that data (never fabricated).

The dashboard starts **empty** and is built entirely from what the user logs — no seed data.

## 4. Technical stack

### Frontend
- **Next.js 15** (App Router) · **React 19** · **TypeScript (strict)**
- **Tailwind CSS** · **Framer Motion** · **GSAP** (`ScrollTrigger`) for the landing storytelling
- **Zustand** (state) · **Recharts** (trend/donut) · **Canvas 2D** (animated carbon-pulse + photo annotation)
- Tooling: **Vitest + React Testing Library**, **Playwright + axe-core**, ESLint (`jsx-a11y`), **MSW** (offline dev)

### Server / API layer
- **Next.js Route Handlers** (Node runtime) under `app/api/v1/*` — server-only; they hold the Gemini
  key and call Gemini + the deterministic engine, so **secrets never reach the browser**.
- **Deterministic Emissions Engine** — pure **TypeScript** (`frontend/lib/emissions`) mirroring the pure
  **Python** engine (`services/agents/.../emissions`), both reading the same bundled `defra_2024.json`.
- The repo also includes a **FastAPI** gateway (`services/gateway`) for the fuller multi-service topology.

### Agentic AI stack — Google ADK (coordinator / delegation pattern)
- **Google ADK (Agent Development Kit).** A root **coordinator** dispatches each tagged turn to the
  right specialist **sub-agent**, or calls a deterministic tool directly:

  ```
  ecopulse_coordinator  (LlmAgent · gemini-2.5-flash)
  ├─ sub_agents:                              ← ADK delegation
  │   ├─ ingest_agent        (flash)      tools=[score_meal]        ← identify items → engine scores
  │   ├─ conversation_agent  (flash)                                ← grounded Q&A over the user's data
  │   └─ coach_agent         (flash-lite) tools=[finalize_nudge]    ← weekly nudge, engine-verified %
  └─ tools=[build_dual_forecast]                                    ← deterministic 12-month projection
  ```

- **Deterministic FunctionTools** (`score_meal`, `build_dual_forecast`, `finalize_nudge`) wrap the
  emissions engine — the LLM delegates **all arithmetic to code** (the golden rule).
- **Models:** Gemini **2.5 Flash** on the hot path (coordinator/ingest/conversation), **2.5 Flash-Lite**
  for batch coaching. Versioned markdown prompts (`root_v1`, `ingest_v1`, …); user content delimited
  (`<user_content>`, injection defense); explicit Gemini safety settings (never defaults).

> **Live-demo note:** for reliability under free-tier quota, the frontend's hot path calls Gemini
> **directly** from the route handlers (flash → flash-lite fallback) and recomputes CO₂e with the TS
> engine. The ADK coordinator on Cloud Run embodies the same pattern server-side and is the production
> agent path.

### Google Cloud services leveraged
| Service | How it's used |
|---|---|
| **Google ADK** | Agent framework — coordinator + `sub_agents` delegation, `FunctionTool` wrappers |
| **agents-cli** | Scaffolds and deploys the ADK app (`agents-cli deploy` → Cloud Run) |
| **Gemini API** (2.5 Flash / Flash-Lite) | Multimodal item identification (+ bounding boxes), coach, Q&A |
| **Cloud Run** | Hosts the ADK agent service (public `run.invoker`) and the Next.js frontend |
| **Cloud Build** | Builds the container image during deploy |
| **Secret Manager** | `GEMINI_API_KEY` mounted as a Cloud Run secret env var (never in code) |
| **IAM** | `run.invoker` (public agent), `secretmanager.secretAccessor` (SA→secret), `aiplatform.user` |
| **Vertex AI** | Enabled as the no-API-key fallback (service-account auth, no daily quota cap) |

## 5. Project structure

```
ecopulse/
├── frontend/                      Next.js 15 (App Router) · TypeScript strict · Tailwind
│   ├── app/
│   │   ├── page.tsx               Landing — GSAP scroll storytelling, animated carbon pulse
│   │   ├── dashboard/page.tsx     Dashboard — input hero, intelligence, charts, coach
│   │   └── api/v1/                Route handlers (server-only): ingest/image, ingest/text,
│   │                              coach/nudge, chat — all call Gemini + the engine
│   ├── lib/
│   │   ├── emissions/             ★ Deterministic DEFRA engine (pure, tested)
│   │   ├── gemini-vision.ts       Server-only Gemini client (vision/text/coach/chat + fallback)
│   │   ├── useGsap.ts             Reduced-motion-safe GSAP reveal helper
│   │   └── store.ts               Zustand app state
│   ├── components/                UI (EmissionBreakdown, CameraOverlay, dashboard/*, …)
│   └── scripts/                   axe-audit.mjs, shots.mjs, verify-browser.mjs (headless Chrome)
├── services/agents/               Google ADK agents + the original Python emissions engine
├── specs/                         Product & sprint specs (gitignored)
└── docs/                          ADRs, threat model, a11y notes
```

## 6. Running it

```bash
cd frontend
npm install
# .env.local holds GEMINI_API_KEY (server-only, gitignored) for the ingest/coach/chat routes
npm run dev          # http://localhost:3000
```

Quality gates:

```bash
npm run type-check                 # tsc --noEmit (strict)
npm run lint                       # ESLint + jsx-a11y
npm run test                       # Vitest unit tests (incl. the emissions engine)
node scripts/axe-audit.mjs         # axe-core WCAG 2.2 AA (zero violations)
npm run build                      # production build
```

## 7. How this maps to the evaluation criteria

| Axis | What we did | Where |
|---|---|---|
| **Problem-statement alignment** | Frictionless multimodal carbon logging with transparent, science-backed numbers and AI guidance — exactly the sustainability problem. | whole app |
| **Code Quality** | TypeScript **strict** (no `any`, no `ts-ignore`), small single-responsibility modules, the engine is a pure, documented, faithful port of the Python source (one factor file as source of truth), conventional commits. | `lib/emissions`, `lib/gemini-vision.ts` |
| **Security** | No secrets in code — `GEMINI_API_KEY` is server-only env / Secret Manager; route handlers are server-side so the key never reaches the browser; **all user content is delimited** (`<user_content>…`) in prompts (injection defense); model output is **validated/coerced** before use and is never trusted for numbers (fail-closed: unmatched items count as 0, not a guess). | `app/api/v1/*`, `gemini-vision.ts` |
| **Efficiency** | Gemini **Flash / Flash-Lite** only (cheap, fast hot path) with automatic fallback; the deterministic engine avoids LLM calls for all math; charts render from in-memory data with `isAnimationActive={false}`; reduced-motion paths skip animation; production bundle is code-split per route. | `gemini-vision.ts`, `dashboard/*` |
| **Testing** | Vitest unit tests for the **deterministic engine** (calculation, unit conversion, swap logic, text parsing, forecast) — the part where correctness matters most — plus existing component tests; headless-Chrome scripts validate real render + zero console errors. | `__tests__/`, `scripts/` |
| **Accessibility** | **WCAG 2.2 AA, zero axe violations** on both pages; semantic landmarks, labelled controls, focus-visible rings, keyboard-operable scroll regions, `aria-live` for streaming results, and **every animation gated behind `prefers-reduced-motion`**. | `scripts/axe-audit.mjs`, all components |

## 8. Assumptions & limitations

- **Single-user demo.** This build uses an in-memory client store rather than per-user
  Firestore auth; a production deployment would add Firebase Auth + user-scoped reads (the
  scoping pattern is documented in the agent rules).
- **Free-tier Gemini key.** The Developer API key is rate-limited (~20 requests/day/model). The
  app degrades gracefully — photo/text/coach/chat surface an honest "rate-limited" message, and
  typed input falls back to an offline lexical parser (clearly flagged as approximate). For a
  zero-quota-anxiety demo, switching to **Vertex AI** (service-account auth, no daily cap) is a
  one-config change.
- **DEFRA 2024 (UK) factors** are used as the science base, applied as a reasonable proxy for
  other regions; food values are per kg edible weight.
- **Distances/portions** for typed input are AI-estimated from world knowledge when not stated.
- The **deterministic engine is authoritative** — if the bundled factor table has no match for an
  item, it is counted as 0 rather than fabricated.

## 9. Differentiators for judges

- **Transparency:** every CO₂e figure is shown as `quantity × DEFRA factor`, with source — no
  black-box numbers.
- **Annotated vision:** photos are returned with labelled bounding boxes per detected item.
- **Grounded AI:** the coach and chat answer only from the user's real logged data.
- **Resilience:** model fallback + offline parser + graceful, honest error states throughout.
