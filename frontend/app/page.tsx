'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CarbonPulse } from '@/components/landing/CarbonPulse'
import { CountUp } from '@/components/landing/CountUp'
import { useReveal } from '@/lib/useGsap'

// ── Content ───────────────────────────────────────────────────────────────

const AGENTS = [
  {
    n: '01',
    name: 'Snap Agent',
    role: 'Ingest & identify',
    color: '#00F5D4',
    body: 'Photograph a meal, type a commute, drop a utility bill. It identifies every item and extracts quantities with 90%+ accuracy — in under three seconds.',
    stat: '< 3s per scan',
  },
  {
    n: '02',
    name: 'Analyst Agent',
    role: 'Emissions calculation',
    color: '#7CFFB2',
    body: 'Every CO₂e figure is computed by a deterministic engine using DEFRA 2024 factors — the dataset UK government bodies rely on. No estimates. No AI arithmetic.',
    stat: '80+ DEFRA factors',
  },
  {
    n: '03',
    name: 'Coach Agent',
    role: 'Overnight coaching',
    color: '#FFB800',
    body: 'While you sleep it reviews your week, finds your three highest-impact habits, and writes one personalised nudge calibrated to your real lifestyle.',
    stat: 'Runs every night',
  },
  {
    n: '04',
    name: 'Forecast Agent',
    role: '12-month simulation',
    color: '#7B61FF',
    body: 'Current You versus Committed You, projected over twelve months. Toggle any habit and both trajectories recompute instantly — the maths is reproducible.',
    stat: '12-month horizon',
  },
]

const FEATURES = [
  {
    tag: 'Snap-to-Carbon',
    title: 'A photo is worth 2.4 kg CO₂e.',
    body: 'Point your camera at a chicken biryani. In three seconds EcoPulse identifies the basmati rice, chicken, and oil — then suggests a lighter dal-based swap that cuts most of the emissions. Not a guess. A calculation.',
    accent: '#00F5D4',
    metric: '87%',
    metricLabel: 'saved by switching chicken to dal',
  },
  {
    tag: 'AI Coach',
    title: 'An overnight plan, written for your data.',
    body: 'Your Coach reads everything you have logged, finds your single biggest source, and writes one specific, personalised way to cut it — plus a real offset action. Grounded in your own numbers, never generic tips.',
    accent: '#7B61FF',
    metric: 'Daily',
    metricLabel: 'personalised brief from your own data',
  },
  {
    tag: 'Carbon Conversations',
    title: '“What drove my footprint last week?” — just ask.',
    body: 'Ask anything in plain language. Every answer is grounded in your own activity log, cited to the exact entries, and never fabricated. Your data, made legible.',
    accent: '#7CFFB2',
    metric: '100%',
    metricLabel: 'answers cited to your data',
  },
]

const FACTORS = [
  { label: 'Paneer (cheese)', value: '13.5', unit: 'kg CO₂e / kg', color: '#FF6B35', pct: 100 },
  { label: 'Chicken', value: '6.9', unit: 'kg CO₂e / kg', color: '#FFB800', pct: 51 },
  { label: 'Rice', value: '2.7', unit: 'kg CO₂e / kg', color: '#FFB800', pct: 26 },
  { label: 'Dal / lentils', value: '0.9', unit: 'kg CO₂e / kg', color: '#7CFFB2', pct: 10 },
  { label: 'Car — petrol', value: '0.164', unit: 'kg CO₂e / km', color: '#FFB800', pct: 40 },
  { label: 'Train', value: '0.035', unit: 'kg CO₂e / km', color: '#7CFFB2', pct: 13 },
  { label: 'Cycling', value: '0.000', unit: 'kg CO₂e / km', color: '#00F5D4', pct: 2 },
]

// ── Nav ─────────────────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass border-b border-white/[0.07] py-3' : 'border-b border-transparent py-5'
      }`}
    >
      <nav
        aria-label="Primary"
        className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-10"
      >
        <Link
          href="/"
          className="font-display text-xl font-extrabold tracking-tight rounded-lg focus-visible:ring-2 focus-visible:ring-neon-cyan"
        >
          Eco<span className="text-neon-cyan text-glow-cyan">Pulse</span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <a href="#agents" className="text-sm text-text-secondary transition-colors hover:text-text-primary">
            Coaching staff
          </a>
          <a href="#features" className="text-sm text-text-secondary transition-colors hover:text-text-primary">
            Features
          </a>
          <a href="#science" className="text-sm text-text-secondary transition-colors hover:text-text-primary">
            The science
          </a>
        </div>
        <Link
          href="/dashboard"
          className="btn-primary rounded-xl px-5 py-2.5 font-display text-sm font-bold focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-space-black"
        >
          Open dashboard →
        </Link>
      </nav>
    </header>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const heroRef = useReveal<HTMLElement>()
  const agentsRef = useReveal<HTMLElement>()
  const featuresRef = useReveal<HTMLElement>()
  const scienceRef = useReveal<HTMLElement>()
  const ctaRef = useReveal<HTMLElement>()

  return (
    <>
      <Nav />
      <main id="main-content" className="overflow-x-hidden bg-space-black text-text-primary">
        {/* ── HERO ──────────────────────────────────────────────────── */}
        <section
          ref={heroRef}
          className="bg-grain relative flex min-h-dvh items-center overflow-hidden px-6 pb-16 pt-24 lg:px-10"
        >
          {/* Aurora field */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-10%] top-[-10%] h-[620px] w-[620px] animate-aurora rounded-full bg-[radial-gradient(circle,rgba(0,245,212,0.16),transparent_62%)]" />
            <div className="absolute bottom-[-15%] right-[-8%] h-[560px] w-[560px] animate-aurora rounded-full bg-[radial-gradient(circle,rgba(123,97,255,0.16),transparent_60%)] [animation-delay:-8s]" />
            <div className="absolute inset-0 bg-dot-grid opacity-[0.04]" />
          </div>

          <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            {/* Left — message */}
            <div>
              <div
                data-reveal
                className="glass mb-7 inline-flex items-center gap-2.5 rounded-full border border-neon-cyan/20 px-4 py-1.5"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-cyan opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-cyan" />
                </span>
                <span className="eyebrow text-neon-cyan">4 AI agents · live</span>
              </div>

              <h1 data-reveal className="text-fluid-hero font-display font-extrabold">
                Stop guessing
                <br />
                your <span className="text-gradient">carbon</span>
                <br />
                footprint.
              </h1>

              <p data-reveal className="mt-7 max-w-xl text-lg leading-relaxed text-text-secondary">
                Four specialised AI agents track every meal, commute, and bill — then compute{' '}
                <span className="font-semibold text-text-primary">verified CO₂e</span> from
                peer-reviewed DEFRA science. Overnight, your Coach builds the plan. You wake up
                with a roadmap, not a lecture.
              </p>

              <div data-reveal className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard"
                  className="btn-primary rounded-xl px-7 py-4 text-center font-display text-base font-bold tracking-wide focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-space-black"
                >
                  Start tracking free →
                </Link>
                <a
                  href="#agents"
                  className="glass rounded-xl border border-white/10 px-7 py-4 text-center font-display text-base font-semibold text-text-primary transition-colors hover:border-neon-cyan/30 hover:text-neon-cyan"
                >
                  Meet your coaching staff
                </a>
              </div>

              <p data-reveal className="eyebrow mt-8 text-text-muted">
                Emission factors: DEFRA 2024 · <span className="text-neon-cyan/70">zero AI arithmetic</span>
              </p>
            </div>

            {/* Right — live pulse panel */}
            <div data-reveal className="glass relative overflow-hidden rounded-3xl border border-white/[0.08] p-6 shadow-glass">
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow text-text-muted">Live carbon pulse</p>
                  <p className="mt-1 font-display text-sm text-text-secondary">Illustrative — your tracking, once you log</p>
                </div>
                <span className="eyebrow rounded-full border border-eco-lime/30 bg-eco-lime/10 px-2.5 py-1 text-eco-lime">
                  example
                </span>
              </div>

              <div className="relative mt-4 h-40 w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-space-black/40">
                <CarbonPulse />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="eyebrow text-text-muted">Today</p>
                  <p className="mt-1 font-display text-3xl font-extrabold text-neon-cyan text-glow-cyan">
                    <CountUp value={2.34} decimals={2} suffix="" />
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary">kg CO₂e · below UK avg</p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="eyebrow text-text-muted">This month</p>
                  <p className="mt-1 font-display text-3xl font-extrabold text-eco-lime">
                    <CountUp value={12} prefix="↓ " suffix="%" />
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary">vs last month</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Last scan · chicken biryani</p>
                  <p className="text-xs text-carbon-low">→ dal swap saves 68%</p>
                </div>
                <span className="font-display text-xl font-bold text-carbon-high">2.40</span>
              </div>

              <p className="mt-3 text-center text-[11px] text-text-muted">
                Sample numbers — log a meal or activity and your real footprint replaces this.
              </p>
            </div>
          </div>
        </section>

        {/* ── STAT BAND ──────────────────────────────────────────────── */}
        <section aria-label="Key metrics" className="border-y border-white/[0.06] bg-space-deep">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4 lg:px-10">
            {[
              { v: 3, label: 'seconds, photo to CO₂e', suffix: 's', prefix: '< ' },
              { v: 80, label: 'DEFRA 2024 factors', suffix: '+' },
              { v: 4, label: 'AI agents, working 24/7' },
              { v: 12, label: 'month personalised forecast', suffix: 'mo' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-3xl font-extrabold text-neon-cyan md:text-4xl">
                  <CountUp value={s.v} prefix={s.prefix ?? ''} suffix={s.suffix ?? ''} />
                </div>
                <div className="mt-1 text-xs text-text-secondary md:text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── AGENTS ─────────────────────────────────────────────────── */}
        <section ref={agentsRef} id="agents" className="px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 max-w-2xl">
              <p data-reveal className="eyebrow mb-4 text-neon-cyan">Your coaching staff</p>
              <h2 data-reveal className="text-fluid-h2 font-display font-bold">
                Four agents. <span className="text-gradient">None of them sleep.</span> None of them guess.
              </h2>
              <p data-reveal className="mt-5 text-lg leading-relaxed text-text-secondary">
                Most apps hand you a number and walk away. EcoPulse runs a squad of specialised
                agents that watch, calculate, coach, and simulate — continuously, accurately, and
                without inventing the maths.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {AGENTS.map((a) => (
                <article
                  key={a.name}
                  data-reveal
                  data-reveal-group="agents"
                  className="group relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.02] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.14]"
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                    style={{ background: a.color }}
                  />
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-5xl font-extrabold text-white/[0.08]">{a.n}</span>
                    <span className="eyebrow" style={{ color: a.color }}>{a.role}</span>
                  </div>
                  <h3 className="mt-4 font-display text-2xl font-bold text-text-primary">{a.name}</h3>
                  <p className="mt-3 leading-relaxed text-text-secondary">{a.body}</p>
                  <span
                    className="mt-5 inline-block rounded-full px-3 py-1 font-mono text-[11px] tracking-widest"
                    style={{ background: `${a.color}14`, color: a.color, border: `1px solid ${a.color}33` }}
                  >
                    {a.stat}
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ───────────────────────────────────────────────── */}
        <section ref={featuresRef} id="features" className="bg-space-deep px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <p data-reveal className="eyebrow mb-4 text-neon-purple">Core experiences</p>
              <h2 data-reveal className="text-fluid-h2 font-display font-bold">
                Three ways to take control
              </h2>
            </div>

            <div className="flex flex-col gap-6">
              {FEATURES.map((f, i) => (
                <article
                  key={f.tag}
                  data-reveal
                  className="group relative grid items-center gap-8 overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.02] p-8 md:grid-cols-[1.6fr_1fr] md:p-12"
                >
                  <div className={i % 2 === 1 ? 'md:order-2' : ''}>
                    <p className="eyebrow mb-3" style={{ color: f.accent }}>{f.tag}</p>
                    <h3 className="font-display text-2xl font-bold text-text-primary md:text-3xl">
                      {f.title}
                    </h3>
                    <p className="mt-4 max-w-2xl leading-relaxed text-text-secondary">{f.body}</p>
                  </div>
                  <div
                    className={`flex flex-col items-center justify-center rounded-2xl border p-8 text-center ${
                      i % 2 === 1 ? 'md:order-1' : ''
                    }`}
                    style={{ borderColor: `${f.accent}22`, background: `${f.accent}0a` }}
                  >
                    <span
                      className="font-display text-6xl font-extrabold md:text-7xl"
                      style={{ color: f.accent, textShadow: `0 0 40px ${f.accent}55` }}
                    >
                      {f.metric}
                    </span>
                    <span className="mt-2 text-sm text-text-secondary">{f.metricLabel}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── SCIENCE ────────────────────────────────────────────────── */}
        <section ref={scienceRef} id="science" className="px-6 py-20 lg:px-10">
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
            <div>
              <p data-reveal className="eyebrow mb-4 text-neon-cyan">The science behind it</p>
              <h2 data-reveal className="text-fluid-h2 font-display font-bold">
                Not one CO₂e figure comes from an AI guess.
              </h2>
              <p data-reveal className="mt-5 leading-relaxed text-text-secondary">
                EcoPulse uses the{' '}
                <span className="font-semibold text-neon-cyan">
                  DEFRA 2024 Greenhouse Gas Reporting Conversion Factors
                </span>{' '}
                — the same dataset used by UK government agencies and Fortune 500 sustainability
                teams. The AI identifies items and quantities; a deterministic Python engine does
                every calculation. Reproducible, auditable, traceable to a published source.
              </p>
              <div data-reveal className="mt-8 grid grid-cols-3 gap-4">
                {[
                  { v: 80, s: '+', l: 'factors bundled' },
                  { v: 100, s: '%', l: 'reproducible' },
                  { v: 0, s: '', l: 'AI arithmetic' },
                ].map((x) => (
                  <div key={x.l} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                    <div className="font-display text-2xl font-extrabold text-neon-cyan">
                      <CountUp value={x.v} suffix={x.s} />
                    </div>
                    <div className="mt-1 text-xs text-text-secondary">{x.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div data-reveal className="glass rounded-3xl border border-white/[0.08] p-6">
              <p className="eyebrow mb-4 text-text-muted">Emission factors · DEFRA 2024</p>
              <div className="flex flex-col gap-2.5">
                {FACTORS.map((row) => (
                  <div key={row.label} className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text-primary">{row.label}</span>
                      <span className="font-mono text-sm font-bold" style={{ color: row.color }}>
                        {row.value}
                        <span className="ml-1 text-[11px] font-normal text-text-muted">{row.unit}</span>
                      </span>
                    </div>
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
                      <div className="h-full rounded-full" style={{ width: `${row.pct}%`, background: row.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ──────────────────────────────────────────────── */}
        <section ref={ctaRef} className="relative overflow-hidden px-6 py-24 lg:px-10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,245,212,0.1),transparent_60%)]"
          />
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <p data-reveal className="eyebrow mb-5 text-neon-cyan">
              The planet&apos;s carbon budget is counting down.
            </p>
            <h2 data-reveal className="text-fluid-h2 font-display font-extrabold">
              Your footprint. <span className="text-gradient">Your call.</span> Your future.
            </h2>
            <p data-reveal className="mx-auto mt-6 max-w-xl text-lg text-text-secondary">
              Your AI coaching staff is ready and waiting. Start tracking in seconds — no setup,
              no spreadsheets.
            </p>
            <div data-reveal className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/dashboard"
                className="btn-primary rounded-xl px-10 py-4 font-display text-base font-bold tracking-wide focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-space-black"
              >
                Open the dashboard →
              </Link>
              <a
                href="#agents"
                className="glass rounded-xl border border-white/10 px-8 py-4 font-display text-base font-semibold text-text-secondary transition-colors hover:text-text-primary"
              >
                Meet the agents
              </a>
            </div>
          </div>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────────────── */}
        <footer className="border-t border-white/[0.06] px-6 py-10 lg:px-10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
            <div className="font-display text-lg font-extrabold">
              Eco<span className="text-neon-cyan text-glow-cyan">Pulse</span>
            </div>
            <p className="text-center text-xs text-text-muted">
              Emission factors sourced from DEFRA 2024 Greenhouse Gas Reporting Conversion Factors.
            </p>
            <div className="flex gap-6 text-sm text-text-muted">
              <Link href="/dashboard" className="transition-colors hover:text-neon-cyan">Dashboard</Link>
              <a href="/docs" className="transition-colors hover:text-neon-cyan">Docs</a>
            </div>
          </div>
        </footer>
      </main>
    </>
  )
}
