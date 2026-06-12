# Sprint 2 — Futuristic Frontend & Accessibility Core

**Epic:** "The dashboard that wins the demo."
**Duration:** Days 3–4
**Status:** ⬜ Not started
**Depends on:** Sprint 1 (repo, CI, deploy pipeline)

---

## Goal

A world-class, WCAG 2.2 AA dashboard with a stunning 3D carbon globe, glassmorphism UI, and a futuristic dark-space aesthetic — running against mocked API responses so frontend work never blocks on backend.

The visual bar: **this UI should look like it belongs in a billion-dollar climate tech startup's investor demo.** Judges should feel "wow" within 2 seconds of seeing it.

---

## Design System: "Deep Carbon" Theme

### Philosophy
- **Dark universe as canvas** — the entire UI floats in a deep-space environment. Carbon pollution is the villain; we visualize it as atmospheric contamination visible from orbit.
- **Neon accents, glass surfaces** — glassmorphism cards with subtle neon borders that glow. Data is presented with the precision of a mission-control terminal.
- **Motion tells the story** — the globe *responds* to logged activities in real time. Numbers count up. Haze thickens or clears. Users feel their data instead of just reading it.

### Color Tokens (`tailwind.config.ts`)

```typescript
colors: {
  // Backgrounds
  'space-black':    '#05080F',   // page background
  'space-deep':     '#080C17',   // card base
  'space-surface':  '#0D1526',   // elevated surface
  'space-border':   'rgba(255,255,255,0.07)',

  // Primary accent — "Clean Energy Cyan"
  'neon-cyan':      '#00F5D4',
  'neon-cyan-dim':  '#00F5D420', // 12% opacity for backgrounds
  'neon-cyan-glow': '0 0 20px rgba(0, 245, 212, 0.4)',

  // Secondary accent — "AI Purple"
  'neon-purple':    '#7B61FF',
  'neon-purple-dim':'#7B61FF20',

  // Carbon severity scale
  'carbon-low':     '#00C896',   // <2t CO₂e — clean, bright green
  'carbon-mid':     '#FFB800',   // 2-5t — amber warning
  'carbon-high':    '#FF6B35',   // 5-10t — orange alert
  'carbon-critical':'#FF2D55',   // >10t — critical red

  // Text
  'text-primary':   '#E8EDF5',
  'text-secondary': '#8892A4',
  'text-muted':     '#4A5568',

  // Globe atmosphere colors
  'atmos-clean':    '#3B82F6',   // clean atmosphere — blue
  'atmos-haze':     '#F97316',   // carbon haze — orange
  'atmos-critical': '#EF4444',   // max carbon — red
}
```

### Typography

```typescript
// tailwind.config.ts — fontFamily
fontFamily: {
  display: ['Space Grotesk', 'sans-serif'],   // headings, hero text
  body:    ['Inter', 'sans-serif'],            // body copy
  mono:    ['JetBrains Mono', 'monospace'],   // numbers, data, code
}
```

Load via `next/font/google`:
```tsx
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google'
```

**Type scale for carbon data:**
- `text-carbon-hero`: 72px, Space Grotesk ExtraBold, neon-cyan, with glow text-shadow
- `text-carbon-display`: 48px, Space Grotesk Bold
- `text-carbon-label`: 11px, JetBrains Mono, letter-spacing 0.15em, UPPERCASE

---

## Visual Components

### 3D Carbon Globe (`components/Globe.tsx`)

The centerpiece. This must be jaw-dropping.

**Visual design:**
- Earthy sphere: dark ocean (`#0B2447`), faint continental outlines (subtle `#1A3A5C`)
- **Atmospheric haze layer**: A separate sphere mesh 1.02× radius, additive blending, transparent. Color and opacity driven by the user's CO₂e total:
  - 0–2t: faint `#3B82F6` shimmer (10% opacity) — "pristine atmosphere"
  - 2–5t: `#F59E0B` haze (25% opacity) — "warming"
  - 5–10t: `#F97316` haze (50% opacity) — "polluted"
  - 10t+: `#EF4444` dense haze (75% opacity) — "critical"
- **Particle system**: 200 CO₂ particles per active "emission zone", emitted upward in slow arcs, same color as haze layer
- **City glow hotspots**: emission-weighted point lights at the user's top 3 emission sources
- **Rotating cloud layer**: separate semi-transparent mesh at 1.01× radius, very slow independent rotation
- **Aurora-style glow rings**: rings at poles, animated shimmer in `#7B61FF` (AI purple) — suggests AI intelligence monitoring the planet
- **Ambient glow**: a large invisible sphere at 1.5× radius with deep blue bloom effect via `UnrealBloomPass`

**Globe interactions:**
- Mouse drag: smooth orbital rotation (damping = 0.05)
- Scroll/pinch: zoom in/out
- Hover over emission hotspot: tooltip card floats above it showing that activity's CO₂e
- On new activity logged: globe snaps to the relevant hotspot, haze layer pulses once, particles burst

**Camera & lighting:**
```
PerspectiveCamera: fov=45, near=0.1, far=1000
Initial position: (0, 0, 2.5)  // slightly pulled back, globe fills ~60% of viewport height
AmbientLight: 0xffffff, intensity=0.15
DirectionalLight: 0x4488ff, intensity=1.2 (from upper-right — "sun")
PointLight (red): at critical emission zones when carbon is high
```

**Post-processing (via `@react-three/postprocessing`):**
- `UnrealBloom`: threshold=0.1, strength=0.8, radius=0.5 — makes neon elements glow
- `ChromaticAberration`: offset=(0.002, 0.002) — subtle lens distortion for sci-fi feel
- `Vignette`: darkness=0.4, offset=0.3 — draws focus to globe

**Performance:**
- Dynamic import: `const Globe = dynamic(() => import('./Globe'), { ssr: false })`
- LOD: reduce geometry detail on mobile (segments: 64→32)
- Suspend render when tab is not visible (`usePageVisibility`)

**2D fallback** (auto-selected when `prefers-reduced-motion: reduce`):
- Animated SVG donut chart showing CO₂e breakdown by category
- Data table of recent activities with sortable columns
- Toggle button lets users switch manually at any time

---

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  [ECOPULSE]  [nav icons]                              [user avatar] │  ← header (64px, glass)
├──────────────────────────────┬──────────────────────────────────────┤
│                              │  ┌──────────────────────────────┐   │
│                              │  │  CO₂e THIS MONTH             │   │
│                              │  │  ████ 2.4t  ↓12% vs last mo │   │
│         3D GLOBE             │  └──────────────────────────────┘   │
│       (full height,          │  ┌──────────────────────────────┐   │
│        left panel)           │  │  QUICK LOG                   │   │
│                              │  │  [📷 Snap] [✏ Type] [📄 PDF] │   │
│                              │  └──────────────────────────────┘   │
│                              │  ┌──────────────────────────────┐   │
│                              │  │  ACTIVITY FEED               │   │
│                              │  │  • Beef burger  1.2 kgCO₂e  │   │
│                              │  │  • Taxi 8km     0.8 kgCO₂e  │   │
│                              │  │  • ...                       │   │
│                              │  └──────────────────────────────┘   │
│                              │                                      │
├──────────────────────────────┴──────────────────────────────────────┤
│  🌡 TODAY  2.4kg    📅 WEEK  12.1kg    📆 MONTH  38.4kg   🌍 YEAR 461kg  │ ← metric strip
└─────────────────────────────────────────────────────────────────────┘
         [💬 CARBON AI]  ← floating chat FAB, bottom-right
```

**Responsive breakpoints:**
- Desktop (≥1280px): side-by-side layout as above
- Tablet (768–1279px): globe stacked above the panel, globe height = 50vh
- Mobile (<768px): globe = 40vh, panel below, metric strip scrolls horizontally

---

### Glass Card Component (`components/ui/GlassCard.tsx`)

The foundational surface. Every panel, modal, and widget is a GlassCard.

```css
background: rgba(13, 21, 38, 0.6);
border: 1px solid rgba(255, 255, 255, 0.07);
backdrop-filter: blur(24px) saturate(180%);
border-radius: 16px;
box-shadow:
  0 4px 24px rgba(0, 0, 0, 0.4),
  inset 0 1px 0 rgba(255, 255, 255, 0.05);
```

**Hover state** (Framer Motion, skipped if reduced-motion):
```
scale: 1.01
border-color: rgba(0, 245, 212, 0.2)  /* neon-cyan ghost border */
box-shadow: 0 0 30px rgba(0, 245, 212, 0.08)
```

**Variants (CVA):**
- `default`: as above
- `elevated`: add `0 8px 48px rgba(0,0,0,0.6)` shadow + slightly higher opacity
- `glow-cyan`: neon-cyan border + bloom glow — for active/focused state
- `glow-purple`: neon-purple border — for AI agent cards
- `danger`: neon-red border + red glow — for high-carbon warnings

---

### Neon Button (`components/ui/NeonButton.tsx`)

```css
/* Base */
background: transparent;
border: 1px solid currentColor;
border-radius: 8px;
padding: 10px 20px;
font-family: Space Grotesk;
font-weight: 600;
letter-spacing: 0.05em;
transition: all 0.2s ease;

/* Variants */
.cyan  { color: #00F5D4; }
.cyan:hover { 
  background: rgba(0, 245, 212, 0.1); 
  box-shadow: 0 0 20px rgba(0, 245, 212, 0.3);
}

.purple { color: #7B61FF; }
.purple:hover { 
  background: rgba(123, 97, 255, 0.1);
  box-shadow: 0 0 20px rgba(123, 97, 255, 0.3);
}

/* Solid primary (for CTAs) */
.solid-cyan {
  background: linear-gradient(135deg, #00F5D4, #00C896);
  color: #05080F;
  border: none;
  font-weight: 700;
}
.solid-cyan:hover {
  box-shadow: 0 0 30px rgba(0, 245, 212, 0.5), 0 4px 16px rgba(0,0,0,0.4);
  transform: translateY(-1px);
}
```

---

### Carbon Score Display (`components/CarbonScore.tsx`)

The big number. Rendered as:

```
     ┌─────────────────────────────┐
     │  THIS MONTH                 │   ← JetBrains Mono, 11px, text-muted, uppercase
     │                             │
     │     2.4                     │   ← 72px, Space Grotesk ExtraBold
     │       t CO₂e               │   ← 24px unit label, text-secondary
     │                             │
     │  ↓ 12% vs last month       │   ← neon-cyan if improving, carbon-high if worse
     └─────────────────────────────┘
```

The number animates on change: counter counts up/down over 1.2s (easing: spring). Glow pulses once on update.

---

### Quick-Log Widget (`components/QuickLog.tsx`)

Three capture modes as icon buttons inside a glass card:

1. **📷 Snap** — opens Snap-to-Carbon camera overlay (see Feature 1 UI below)
2. **✏ Type** — inline text input expands with Framer Motion height animation
3. **📄 PDF** — drag-drop zone for utility bills, flight confirmations

All three use the same optimistic-update pattern:
```
User action → immediate ghost card in feed → agent resolves → ghost replaced with real card
```

The ghost card shows a neon-cyan scanning animation:

```css
/* Scanning line animation */
@keyframes scan {
  0%   { transform: translateY(0); opacity: 0.7; }
  100% { transform: translateY(100%); opacity: 0; }
}
.scanning-line {
  position: absolute;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #00F5D4, transparent);
  animation: scan 1.5s linear infinite;
}
```

---

### Activity Feed (`components/ActivityFeed.tsx`)

Each activity card shows:
- Category icon (colored by category: 🥩 red, 🚗 orange, ⚡ yellow)
- Activity name
- CO₂e value (JetBrains Mono, neon-cyan colored)
- Time ago
- Swap suggestion badge (if one exists) — "💡 Oat milk saves −62%"

New items animate in with: `initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}` (stagger 0.05s per item)

Category color coding:
```
Food/Diet:      border-left: 3px solid #EF4444
Transport:      border-left: 3px solid #F97316
Energy/Home:    border-left: 3px solid #EAB308
Shopping:       border-left: 3px solid #8B5CF6
Travel/Flights: border-left: 3px solid #3B82F6
```

---

### Metric Strip (`components/MetricStrip.tsx`)

Horizontal bar at the bottom. Four KPIs — TODAY / THIS WEEK / THIS MONTH / THIS YEAR.

Each metric:
- Label: JetBrains Mono, UPPERCASE, 10px, text-muted
- Value: 28px, Space Grotesk Bold, color keyed to carbon severity scale
- Micro sparkline: 30-day history in 60×24px SVG, gradient fill (carbon-low → carbon-high)
- Delta badge: `+3%` or `−7%` vs previous period

Animated: values count up on initial load. On new activity, the relevant metric pulses.

---

## Snap-to-Carbon Camera UI

This is the on-stage WOW moment. The UI must be cinematic.

### Camera Overlay (full-screen)

```
┌──────────────────────────────────────────────────────────┐
│  ×                                       [GALLERY]       │  ← header
│                                                          │
│                                                          │
│          ┌────────────────────────────┐                  │
│          │                            │                  │  ← Scanner frame
│          │   L-shaped neon-cyan       │                  │     (8px corner brackets)
│          │   corner brackets          │                  │
│          │                            │                  │
│          │   ──── scanning line ────  │                  │  ← animated beam
│          │                            │                  │
│          └────────────────────────────┘                  │
│                                                          │
│         POINT AT MEAL, RECEIPT, OR PRODUCT               │  ← hint text, text-secondary
│                                                          │
│                    [●]                                   │  ← shutter button
└──────────────────────────────────────────────────────────┘
```

**After capture — analysis state:**
```
┌──────────────────────────────────────────────────────────┐
│  ×                           ANALYZING...                │
│                                                          │
│   [Captured photo, blurred/dimmed]                       │
│                                                          │
│   ┌──── streaming results panel ────┐                    │
│   │  ✓ Beef burger      1.2 kg CO₂e │   ← items appear  │
│   │  ✓ Fries            0.3 kg CO₂e │     one by one    │
│   │  ⏳ Sauce...                    │     as SSE streams │
│   └─────────────────────────────────┘                    │
│                                                          │
│   ┌──── swap suggestion ────────────┐                    │
│   │  💡 Try lentil burger           │                    │
│   │     Saves 68% CO₂e per meal     │                    │
│   │     [LOG SWAP]  [LOG AS-IS]     │                    │
│   └─────────────────────────────────┘                    │
└──────────────────────────────────────────────────────────┘
```

Each identified item label:
```css
border-left: 3px solid #00F5D4;
background: rgba(0, 245, 212, 0.08);
font-family: JetBrains Mono;
```

After all items are loaded, the total CO₂e "flies" to the globe: a particle animation shoots from the panel toward the globe position. The globe haze updates simultaneously.

---

## Parallel-You Simulator UI

**Layout (widescreen):**

```
CURRENT YOU                                    COMMITTED YOU
━━━━━━━━━━━━━━━━━━━━                           ━━━━━━━━━━━━━━━━━━━━
  [Dense orange globe]           vs.           [Cleaner cyan globe]
  4.8t CO₂e projected                           3.1t CO₂e projected
  (+12% vs avg)                                 (−35% vs current)

     ═══════════════[ DIVERGENCE CHART ]═══════════════
         Neon line chart — two lines diverging over 12 months
         Current You (orange), Committed You (cyan)
         Fill between lines is gradient (orange → cyan)

  ┌─────── INTERVENTIONS ──────────────────────────────┐
  │ [🚲 Cycle 2×/wk   −8%]  [🥦 2 plant meals  −12%]  │
  │ [✈ No short haul  −15%] [☀ Solar tariff    −6%]   │
  └────────────────────────────────────────────────────┘

       ◄──────[ JAN  FEB  MAR  APR  MAY... ]──────►
                      Timeline scrubber
```

- Both globes share the same orbital camera angle so divergence is visually obvious
- The divergence chart floats between the globes — a live-updating neon line chart (Recharts or D3)
- Active interventions: neon-cyan glow button + check icon
- Inactive interventions: glass button
- Timeline scrubber: Framer Motion slider, keyboard arrow key support, month labels tick marks

**2D fallback:**
- Two side-by-side donut charts + summary table
- Difference column highlighted in neon-cyan

---

## Carbon Conversations UI

A floating assistant panel — anchored bottom-right, expands upward on click.

**Collapsed state:**
```
                    ╭───────────────────╮
                    │ 💬 Ask Carbon AI  │  ← FAB, neon-purple glow
                    ╰───────────────────╯
```

**Expanded state (480×600px panel, glass card):**
```
┌─────────────────────────────────────────────────────┐
│ ✦ CARBON AI                               [—] [×]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [AI]  Based on your March data, your             │ ← previous messages
│        flights accounted for 68% of your          │
│        monthly total...  [→ Flight LAX-JFK]       │ ← cited activity link
│                                                     │
│  [YOU] Why was March so bad?                       │ ← user message, right-aligned
│                                                     │
│  [AI]  ▌ (streaming...)                           │ ← cursor animation while streaming
│                                                     │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐   │
│  │  Ask anything about your carbon data...     │   │
│  │                                    [↑ Send] │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

- AI messages: left-aligned, glass card with `glow-purple` variant, preceded by `✦` icon
- User messages: right-aligned, glass card with `glow-cyan` variant
- Streaming: each token appears with `aria-live="polite"` — screen readers pick up updates
- Cited activity links: neon-cyan underlined, open the activity detail sheet
- Agent routing badge: small label on AI messages — "via Analyst Agent" / "via Coach Agent"

---

## Tasks

### Design System Foundation
- [ ] Install `Space Grotesk`, `Inter`, `JetBrains Mono` via `next/font/google`
- [ ] Configure Tailwind with full "Deep Carbon" color system, typography scale, and custom shadows
- [ ] Build CVA component library: `GlassCard`, `NeonButton`, `CarbonBadge`, `MetricTile`, `CategoryIcon`
- [ ] Global CSS: `space-black` background, scrollbar styling, text rendering

### 3D Carbon Globe
- [ ] `Globe.tsx`: React Three Fiber sphere with atmosphere shader (custom GLSL, color driven by CO₂e prop)
- [ ] Particle system for CO₂ emissions (Three.js `Points` with custom shader)
- [ ] Rotating cloud layer mesh
- [ ] Aurora/AI glow rings at poles
- [ ] `UnrealBloom` + `ChromaticAberration` post-processing
- [ ] Mouse drag rotation + scroll zoom (OrbitControls, damping enabled)
- [ ] Hover tooltip on emission hotspots
- [ ] Dynamic import (no SSR), LOD on mobile
- [ ] 2D fallback: SVG donut + sortable data table, auto-selected on `prefers-reduced-motion`

### Dashboard Layout
- [ ] `DashboardLayout.tsx`: responsive grid — globe left, panel right, metric strip bottom
- [ ] `MetricStrip.tsx`: 4 KPIs with sparklines and animated count-up
- [ ] `CarbonScore.tsx`: hero number with glow, delta badge
- [ ] Navigation: floating icon bar with active glow states

### Quick-Log & Activity Feed
- [ ] `QuickLog.tsx`: 3-mode capture (camera, text, file) with optimistic updates
- [ ] Camera overlay: full-screen scanner UI with L-bracket frame and beam animation
- [ ] `ActivityFeed.tsx`: category-coded cards with staggered entry animation
- [ ] Ghost card + scanning line animation during agent processing

### Snap-to-Carbon Results UI
- [ ] Streaming results panel: items appear one-by-one as SSE arrives
- [ ] Item labels with neon-cyan left-border styling
- [ ] Swap suggestion card with LOG SWAP / LOG AS-IS CTAs
- [ ] Particle "fly-to-globe" animation on result completion

### Parallel-You Simulator
- [ ] Dual globe layout with shared camera angle
- [ ] Divergence chart: Recharts `AreaChart` with two neon-colored lines and gradient fill between
- [ ] Intervention toggle buttons: neon-cyan active / glass inactive, with live re-simulation
- [ ] Timeline scrubber: keyboard-accessible slider, month tick marks, ARIA value announcements

### Carbon Conversations
- [ ] Floating chat FAB (bottom-right, neon-purple glow)
- [ ] Chat panel: glass card, 480×600 expanded
- [ ] Streaming token display with cursor animation
- [ ] Cited activity links in messages
- [ ] Agent routing badge on AI responses

### Accessibility
- [ ] Semantic landmarks on all pages
- [ ] ARIA live regions: activity feed updates, streaming chat, globe CO₂e changes
- [ ] Full keyboard navigation including timeline scrubber (arrow keys)
- [ ] Visible focus rings (neon-cyan 2px outline, offset 2px)
- [ ] `prefers-reduced-motion`: disable ALL Framer Motion animations + Three.js animations, show 2D fallbacks
- [ ] NVDA manual test; findings in `/docs/a11y.md`

### Performance
- [ ] `next/image` for all static images; AVIF format preferred
- [ ] All non-critical components: `dynamic(() => import(...), { ssr: false })`
- [ ] Initial JS bundle <150KB (bundle analyzer CI artifact)
- [ ] Lighthouse CI ≥95 (perf + a11y)
- [ ] MSW mocks for all gateway API endpoints

---

## Acceptance Criteria

- [ ] axe-core reports zero violations in CI
- [ ] Playwright keyboard-only E2E journey passes (log activity → see globe update)
- [ ] Lighthouse CI ≥95 (performance + accessibility) enforced
- [ ] Globe degrades to 2D under `prefers-reduced-motion` (Playwright-tested)
- [ ] Initial JS bundle <150KB (bundle-analysis CI artifact)
- [ ] Component tests cover the design-system library; strict TS, no `any`
- [ ] The demo path (Snap-to-Carbon flow) completes in <3s on mocked data
- [ ] Dark theme contrast: all text ≥4.5:1 against background (automated Lighthouse check)

---

## Judge-Criteria Mapping

| Criterion | How this sprint satisfies it |
|---|---|
| Accessibility | axe zero-violations gate + WCAG 2.2 AA checklist + NVDA findings in `/docs/a11y.md` |
| Testing | Component tests + keyboard-only Playwright E2E + motion fallback tests |
| Efficiency | Lighthouse budgets, dynamic Three.js import, RSC, bundle <150KB |
| Quality | Strict TypeScript, CVA design system, Space Grotesk/Inter/JetBrains Mono type system |
| Security | No client-side secrets; image uploads via signed URLs (mocked, contract fixed) |

---

## Reference Assets

- Color tool: `https://oklch.com` — verify contrast ratios for all neon tokens on `space-black`
- Three.js atmosphere shader reference: NASA Worldwind atmosphere rendering technique
- Design inspiration: Linear.app dark mode + Vercel dashboard + SpaceX telemetry UI
- Font pairing rationale: Space Grotesk (identity/personality) + JetBrains Mono (precision/data) + Inter (readability)
