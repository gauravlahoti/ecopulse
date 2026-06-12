'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { motion, useReducedMotion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { GlassCard } from './ui/GlassCard'
import { useStore } from '@/lib/store'
import { fetchForecast } from '@/lib/api'

const GlobeScene = dynamic(
  () => import('./GlobeScene').then((m) => ({ default: m.GlobeScene })),
  { ssr: false }
)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function ParallelYouSimulator() {
  const { interventions, activities, toggleIntervention, currentScenarioCo2e, committedScenarioCo2e, setScenarios } =
    useStore()
  const [timelineIndex, setTimelineIndex] = useState(11)
  const [isLoading, setIsLoading] = useState(false)
  const reducedMotion = useReducedMotion()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadForecast = useCallback(async () => {
    setIsLoading(true)
    try {
      const activeKeys = interventions.filter((i) => i.active).map((i) => i.key)
      const { current, committed } = await fetchForecast(activities, activeKeys)
      setScenarios(current.monthly_co2e_kg as number[], committed.monthly_co2e_kg as number[])
    } catch {
      // Fallback to local calculation on API error
      const baseline = 440
      const activeSavings = interventions.filter((i) => i.active).reduce((s, i) => s + i.saving_pct, 0)
      const factor = 1 - Math.min(activeSavings, 80) / 100
      const current = Array(12).fill(baseline) as number[]
      const committed = current.map((v, i) => Math.round(v * Math.max(factor - i * 0.005, 0.25) * 10) / 10)
      setScenarios(current, committed)
    } finally {
      setIsLoading(false)
    }
  }, [interventions, activities, setScenarios])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { void loadForecast() }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [loadForecast])

  const currentTotal = (currentScenarioCo2e as number[]).reduce((s, v) => s + v, 0)
  const committedTotal = (committedScenarioCo2e as number[]).reduce((s, v) => s + v, 0)
  const savingPct = currentTotal > 0 ? Math.round((1 - committedTotal / currentTotal) * 100) : 0

  const chartData = MONTHS.map((month, i) => ({
    month,
    'Current You': currentScenarioCo2e[i] ?? 0,
    'Committed You': committedScenarioCo2e[i] ?? 0,
  }))

  const currentAtTime = currentScenarioCo2e.slice(0, timelineIndex + 1).reduce((s, v) => s + v, 0)
  const committedAtTime = committedScenarioCo2e.slice(0, timelineIndex + 1).reduce((s, v) => s + v, 0)

  function handleSliderKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowLeft') setTimelineIndex((v) => Math.max(0, v - 1))
    if (e.key === 'ArrowRight') setTimelineIndex((v) => Math.min(11, v + 1))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-text-primary">
          Parallel-You Simulator
        </h2>
        <span className="font-mono text-xs text-neon-cyan bg-neon-cyan/10 border border-neon-cyan/20 px-2 py-1 rounded-full">
          {isLoading ? '…' : `−${savingPct}% CO₂e`}
        </span>
      </div>

      {/* Dual globes */}
      <div className="grid grid-cols-2 gap-4">
        {['Current You', 'Committed You'].map((label, i) => {
          const co2e = i === 0 ? currentTotal * 0.08 : committedTotal * 0.08
          return (
            <GlassCard key={label} padding="sm" className="text-center">
              <p className="font-mono text-carbon-label text-text-muted uppercase tracking-widest mb-2">
                {label}
              </p>
              {reducedMotion ? (
                <div className="h-32 flex items-center justify-center">
                  <span className={`font-display text-3xl font-bold ${i === 0 ? 'text-carbon-high' : 'text-neon-cyan'}`}>
                    {(co2e / 10).toFixed(1)}t
                  </span>
                </div>
              ) : (
                <div className="h-32">
                  <GlobeScene co2eKg={co2e} height="128px" />
                </div>
              )}
              <p className={`font-mono text-lg font-bold mt-2 ${i === 0 ? 'text-carbon-high' : 'text-neon-cyan'}`}>
                {(i === 0 ? currentTotal : committedTotal).toFixed(0)} kg/yr
              </p>
              {i === 1 && savingPct > 0 && (
                <p className="text-carbon-low text-xs font-mono">↓ {savingPct}% vs current</p>
              )}
            </GlassCard>
          )
        })}
      </div>

      {/* Divergence chart */}
      <GlassCard padding="sm">
        <h3 className="font-mono text-carbon-label text-text-muted uppercase tracking-widest mb-3">
          12-Month Trajectory
        </h3>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="currentGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="committedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00F5D4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00F5D4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: '#4A5568', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#4A5568', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#0D1526', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#E8EDF5' }}
              formatter={(val: number) => [`${val} kg`, '']}
            />
            <Area type="monotone" dataKey="Current You" stroke="#FF6B35" strokeWidth={2} fill="url(#currentGrad)" dot={false} />
            <Area type="monotone" dataKey="Committed You" stroke="#00F5D4" strokeWidth={2} fill="url(#committedGrad)" dot={false} />
            <Legend wrapperStyle={{ color: '#8892A4', fontSize: 11 }} />
          </AreaChart>
        </ResponsiveContainer>

        {/* Timeline scrubber */}
        <div className="mt-3">
          <label htmlFor="timeline-scrubber" className="sr-only">
            Timeline — month {timelineIndex + 1} of 12 ({MONTHS[timelineIndex]})
          </label>
          <input
            id="timeline-scrubber"
            type="range"
            min={0}
            max={11}
            value={timelineIndex}
            onChange={(e) => setTimelineIndex(Number(e.target.value))}
            onKeyDown={handleSliderKey}
            className="w-full accent-neon-cyan cursor-pointer"
            aria-valuetext={`${MONTHS[timelineIndex]}: Current ${currentAtTime.toFixed(0)}kg, Committed ${committedAtTime.toFixed(0)}kg`}
          />
          <div className="flex justify-between mt-1">
            <span className="font-mono text-xs text-text-muted">Jan</span>
            <span className="font-mono text-xs text-neon-cyan">{MONTHS[timelineIndex]}</span>
            <span className="font-mono text-xs text-text-muted">Dec</span>
          </div>
          <div aria-live="polite" className="sr-only">
            {MONTHS[timelineIndex]}: Current You {currentAtTime.toFixed(0)}kg, Committed You {committedAtTime.toFixed(0)}kg
          </div>
        </div>
      </GlassCard>

      {/* Intervention toggles */}
      <GlassCard padding="sm">
        <h3 className="font-mono text-carbon-label text-text-muted uppercase tracking-widest mb-3">
          Interventions
        </h3>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Toggle interventions to see their impact">
          {interventions.map((intervention) => (
            <motion.button
              key={intervention.key}
              onClick={() => toggleIntervention(intervention.key)}
              aria-pressed={intervention.active}
              aria-label={`${intervention.label} — saves ${intervention.saving_pct}% CO₂e`}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/50 ${
                intervention.active
                  ? 'border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan shadow-neon-cyan'
                  : 'border-white/10 bg-white/5 text-text-secondary hover:border-white/20'
              }`}
              whileTap={reducedMotion ? {} : { scale: 0.97 }}
            >
              <span aria-hidden="true">{intervention.icon}</span>
              <span className="flex-1 text-left text-xs">{intervention.label}</span>
              <span className="font-mono text-xs opacity-70">−{intervention.saving_pct}%</span>
              {intervention.active && <span className="text-neon-cyan text-xs" aria-hidden="true">✓</span>}
            </motion.button>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
