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
- The 3D globe component requires a 2D fallback (chart + data table) rendered when `prefers-reduced-motion: reduce`
- The Parallel-You Simulator requires a 2D dual-line chart fallback

## Keyboard Navigation
- Every interactive element must be reachable and operable via keyboard alone
- Visible focus indicators required — never `outline: none` without a custom focus style
- Timeline scrubber (Parallel-You Simulator) must support arrow key controls
- Modal/dialog focus must be trapped while open, then restored on close

## Semantic HTML
- Use semantic landmarks: `<main>`, `<nav>`, `<section aria-label>`, `<article>`
- Headings must follow a logical hierarchy (no skipping levels)
- Icons without adjacent text must have `aria-label` or `aria-hidden` + sibling screen-reader text

## Dynamic Content
- ARIA live regions for streaming AI responses: `aria-live="polite"` on the activity feed
- Globe updates must announce CO₂e changes to screen readers via a visually-hidden live region
- Loading states: `aria-busy="true"` during agent processing

## Color
- Minimum 4.5:1 contrast ratio for all text (3:1 for large text)
- Never use color as the sole differentiator — always pair with icon, pattern, or text label

## Testing Requirement
- Manual NVDA test required before submission — document findings in `/docs/a11y.md`
- Playwright E2E must include a keyboard-only journey test
