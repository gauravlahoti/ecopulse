# Frontend CLAUDE.md

## Component conventions

- RSC for data-fetching views; `'use client'` only for interactivity
- CVA (`class-variance-authority`) for component variants — see `GlassCard.tsx` and `NeonButton.tsx`
- All animations must check `useReducedMotion()` and skip if true
- `useSSEStream()` from `@/lib/sse` for all streaming agent responses
- `fetchForecast()`, `fetchActivities()` from `@/lib/api` for non-streaming calls
- MSW handlers in `lib/msw/handlers.ts` — keep in sync with gateway API contract

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
