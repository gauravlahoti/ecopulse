---
description: Accessibility rules for EcoPulse — WCAG 2.2 AA compliance required
paths: ["frontend/**/*.tsx", "frontend/**/*.ts"]
---

# Accessibility Rules

## Standard: WCAG 2.2 AA (non-negotiable — judge axis #5)

## CI Gates
- axe-core must report zero violations — wired into CI and Playwright E2E
- eslint-plugin-jsx-a11y must have zero warnings

## Motion
- All Framer Motion animations MUST be gated behind `prefers-reduced-motion`:
  ```tsx
  const { reducedMotion } = useReducedMotion()
  // Only animate if !reducedMotion
  ```
- The animated carbon-pulse canvas + count-ups MUST freeze to their final state under reduced motion (`components/landing/CarbonPulse.tsx`)
- GSAP scroll reveals MUST no-op under reduced motion (content renders at its final position — no scroll-jacking); Recharts render with `isAnimationActive={false}`

## Keyboard Navigation
- Every interactive element must be reachable and operable via keyboard alone
- Visible focus indicators required — never `outline: none` without a custom focus style
- Disclosure controls (e.g. "How this was calculated") must be keyboard-operable (Enter/Space)
- Modal/dialog focus must be trapped while open, then restored on close (scan/camera overlay = `role="dialog"`, Escape closes)

## Semantic HTML
- Use semantic landmarks: `<main>`, `<nav>`, `<section aria-label>`, `<article>`
- Headings must follow a logical hierarchy (no skipping levels)
- Icons without adjacent text must have `aria-label` or `aria-hidden` + sibling screen-reader text

## Dynamic Content
- ARIA live regions for streaming AI responses: `aria-live="polite"` on identified items, the activity feed, and chat answers
- CO₂e total updates are announced as live text when new activities are logged
- Loading states: `aria-busy="true"` during agent processing

## Color
- Minimum 4.5:1 contrast ratio for all text (3:1 for large text)
- Never use color as the sole differentiator — always pair with icon, pattern, or text label

## Testing Requirement
- Manual NVDA test required before submission — document findings in `/docs/a11y.md`
- Playwright E2E must include a keyboard-only journey test
