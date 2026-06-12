# Frontend CLAUDE.md

## Component conventions

- RSC for data-fetching views; `'use client'` only for interactivity
- CVA (`class-variance-authority`) for component variants — see `components/ui/GlassCard.tsx` and `NeonButton.tsx`
- All animations must check `useReducedMotion()` and skip if true
- `useSSEStream()` from `@/lib/sse` for all streaming agent responses (ingest, chat)
- Non-streaming reads go through `fetch('/api/v1/...')` to the Route Handlers — there is no client API SDK
- MSW handlers in `lib/msw/handlers.ts` are **dev/offline only**; disabled when `NEXT_PUBLIC_USE_LIVE_BACKEND=true`

## Data flow (server-only backend-for-frontend)

The Route Handlers under `app/api/v1/*` (`ingest/image`, `ingest/text`, `coach/nudge`, `chat`,
`activities`) are the server-side BFF. They hold `GEMINI_API_KEY`, call Gemini via the
**server-only** `@/lib/gemini-vision` client, then recompute every CO₂e with the deterministic
`@/lib/emissions` engine before returning. The Gemini client is never imported into a client
component — the key never reaches the browser.

## Design tokens

All tokens are in `tailwind.config.ts`. Key ones:
- `space-black` — primary background
- `neon-cyan` / `neon-purple` — primary/secondary accent
- `text-glow-cyan` — glowing text utility class
- `.glass` — frosted glass card utility (defined in `globals.css`)
- `carbon-low/mid/high/critical` — severity scale for CO₂e display

## Testing

```bash
npm run test          # Vitest + RTL
npm run test:e2e      # Playwright (requires dev server running)
npm run test:coverage # Enforce ≥85% gate
```

Tests use `@testing-library/react` + `vitest`. MSW is auto-started in test environment via `vitest.setup.ts`.

## Build gotchas

- `exactOptionalPropertyTypes: true` in tsconfig — never assign `undefined` to optional props; omit them instead
- `vitest.config.ts` is excluded from Next.js typecheck (separate tsconfig would conflict)
- `jsx-a11y/no-autofocus` is set to `warn` — suppress with inline comment only in dialog/modal contexts
- React Three Fiber components must be dynamically imported with `ssr: false`
