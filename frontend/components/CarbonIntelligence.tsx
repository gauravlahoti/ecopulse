'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { GlassCard } from './ui/GlassCard'
import { Sparkline } from './ui/Sparkline'
import { CarbonOrb } from './CarbonOrb'
import { AgentPipeline } from './AgentPipeline'
import { computeInsights, formatCo2e, categoryLabel } from '@/lib/insights'
import type { ActivityRecord } from '@/lib/types'

function severityColor(co2eKg: number): string {
  if (co2eKg < 200) return 'text-carbon-low'
  if (co2eKg < 500) return 'text-carbon-mid'
  if (co2eKg < 1000) return 'text-carbon-high'
  return 'text-carbon-critical'
}

function useCountUp(target: number, duration = 1000): number {
  const [value, setValue] = useState(target)
  const reducedMotion = useReducedMotion()
  const fromRef = useRef(target)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (reducedMotion) {
      setValue(target)
      return
    }
    const from = fromRef.current
    const start = performance.now()
    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(from + (target - from) * eased)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return value
}

type InsightCardProps = {
  label: string
  children: ReactNode
  accent?: 'cyan' | 'purple'
  index: number
}

function InsightCard({ label, children, accent = 'cyan', index }: InsightCardProps) {
  const reducedMotion = useReducedMotion()
  const ring = accent === 'purple' ? 'hover:border-neon-purple/25' : 'hover:border-neon-cyan/25'
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.08, duration: 0.35, ease: 'easeOut' }}
      className={`rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 transition-colors ${ring}`}
    >
      <p className="font-mono text-[10px] uppercase tracking-widest text-text-muted">{label}</p>
      <div className="mt-1.5">{children}</div>
    </motion.div>
  )
}

type CarbonIntelligenceProps = {
  activities: ActivityRecord[]
  co2eKg: number
  /** Headline month-over-month delta (negative = improvement). */
  deltaPercent?: number
  /** True while a Quick Log is being analysed. */
  processing?: boolean
  isLoading?: boolean
}

export function CarbonIntelligence({
  activities,
  co2eKg,
  deltaPercent,
  processing = false,
  isLoading = false,
}: CarbonIntelligenceProps) {
  const insights = computeInsights(activities)
  const animated = useCountUp(co2eKg)
  const display = animated >= 1000 ? (animated / 1000).toFixed(2) : animated.toFixed(1)
  const unit = co2eKg >= 1000 ? 't' : 'kg'
  const isEmpty = !isLoading && activities.length === 0

  const deltaDown = deltaPercent !== undefined && deltaPercent < 0
  const deltaColor = deltaPercent === undefined ? '' : deltaDown ? 'text-carbon-low' : 'text-carbon-critical'

  return (
    <GlassCard variant="elevated" padding="lg" className="flex flex-col gap-5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-mono text-carbon-label uppercase tracking-widest text-neon-cyan/80">
            Carbon Intelligence
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            Your AI coaching staff, working on every log
          </p>
        </div>
        <CarbonOrb co2eKg={co2eKg} size={88} className="flex-shrink-0 -mt-1 -mr-1" />
      </div>

      {/* Agent pipeline */}
      <AgentPipeline processing={processing} />

      <div className="h-px bg-white/[0.06]" aria-hidden="true" />

      {/* Score */}
      <div>
        <p className="font-mono text-carbon-label uppercase tracking-widest text-text-muted">
          This Month
        </p>
        <div className="mt-1 flex items-end gap-2">
          <span
            className={`font-display text-[56px] font-extrabold leading-none md:text-[64px] ${severityColor(co2eKg)} text-glow-cyan`}
            aria-label={`${display} ${unit} CO₂ equivalent`}
          >
            {display}
          </span>
          <span className="mb-2 font-display text-2xl text-text-secondary">{unit} CO₂e</span>
          {deltaPercent !== undefined && (
            <span className={`mb-2.5 ml-1 font-mono text-sm ${deltaColor}`} aria-live="polite">
              {deltaDown ? '↓' : '↑'} {Math.abs(deltaPercent).toFixed(0)}% vs last month
            </span>
          )}
        </div>
      </div>

      {/* Insights / onboarding */}
      {isEmpty ? (
        <div className="rounded-xl border border-dashed border-neon-cyan/25 bg-neon-cyan/[0.03] p-5 text-center">
          <p className="font-display text-base font-semibold text-text-primary">
            Welcome to EcoPulse 👋
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-text-secondary">
            Snap a meal, type an activity, or drop a utility bill below. The agents identify
            it, compute verified CO₂e, and surface where to cut next — no manual tracking.
          </p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-neon-cyan/80">
            ↑ Snap, upload, or describe an activity above
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <InsightCard label="Top source" index={0}>
            {insights.topSource ? (
              <>
                <p className="font-display text-lg font-bold text-text-primary">
                  {categoryLabel(insights.topSource.category)}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {formatCo2e(insights.topSource.kg)} · {insights.topSource.pct.toFixed(0)}% of total
                </p>
              </>
            ) : (
              <p className="text-sm text-text-muted">—</p>
            )}
          </InsightCard>

          <InsightCard label="7-day trend" index={1}>
            <div className="flex items-center justify-between gap-2">
              <Sparkline data={insights.sparkline} />
              {insights.weekDeltaPct !== null ? (
                <span
                  className={`font-mono text-xs ${insights.weekDeltaPct < 0 ? 'text-carbon-low' : 'text-carbon-high'}`}
                >
                  {insights.weekDeltaPct < 0 ? '↓' : '↑'} {Math.abs(insights.weekDeltaPct).toFixed(0)}%
                </span>
              ) : (
                <span className="font-mono text-xs text-text-muted">new</span>
              )}
            </div>
          </InsightCard>

          <InsightCard label="Projected month-end" index={2} accent="purple">
            {insights.projectedMonthEndKg !== null ? (
              <>
                <p className="font-display text-lg font-bold text-neon-purple-light">
                  {formatCo2e(insights.projectedMonthEndKg)}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">at your current pace</p>
              </>
            ) : (
              <p className="text-sm text-text-muted">—</p>
            )}
          </InsightCard>
        </div>
      )}
    </GlassCard>
  )
}
