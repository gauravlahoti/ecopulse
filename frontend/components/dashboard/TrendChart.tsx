'use client'

import { useMemo } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { GlassCard } from '../ui/GlassCard'
import { formatCo2e } from '@/lib/insights'
import type { ActivityRecord } from '@/lib/types'

const DAY_MS = 86_400_000

type Point = { day: string; kg: number }

function buildSeries(activities: ActivityRecord[], days = 14, now = Date.now()): Point[] {
  const startOfToday = now - (now % DAY_MS)
  const buckets = new Array<number>(days).fill(0)
  for (const a of activities) {
    const t = new Date(a.timestamp).getTime()
    if (Number.isNaN(t)) continue
    const idx = Math.floor((startOfToday - (t - (t % DAY_MS))) / DAY_MS)
    if (idx >= 0 && idx < days) buckets[days - 1 - idx]! += a.co2e_kg
  }
  return buckets.map((kg, i) => {
    const d = new Date(startOfToday - (days - 1 - i) * DAY_MS)
    return { day: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }), kg: Number(kg.toFixed(2)) }
  })
}

type TipProps = {
  active?: boolean
  label?: string | number
  payload?: ReadonlyArray<{ value?: number | string }>
}

function ChartTooltip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null
  const kg = Number(payload[0]?.value ?? 0)
  return (
    <div className="glass rounded-lg border border-white/10 px-3 py-2 text-xs">
      <p className="font-mono text-text-muted">{label}</p>
      <p className="mt-0.5 font-display font-bold text-neon-cyan">{formatCo2e(kg)}</p>
    </div>
  )
}

export function TrendChart({ activities }: { activities: ActivityRecord[] }) {
  const data = useMemo(() => buildSeries(activities), [activities])
  const max = Math.max(...data.map((d) => d.kg), 1)

  return (
    <GlassCard padding="md" className="flex flex-col">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="eyebrow text-text-muted">14-day trend</h2>
        <span className="font-mono text-[11px] text-text-secondary">kg CO₂e / day</span>
      </div>
      <div className="h-44 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 4, bottom: 0, left: -22 }} accessibilityLayer={false}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00F5D4" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#00F5D4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              tick={{ fill: '#4A5568', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval={2}
            />
            <YAxis tick={{ fill: '#4A5568', fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, Math.ceil(max)]} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(0,245,212,0.3)' }} />
            <Area
              type="monotone"
              dataKey="kg"
              stroke="#00F5D4"
              strokeWidth={2}
              fill="url(#trendFill)"
              dot={false}
              activeDot={{ r: 4, fill: '#7CFFB2' }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="sr-only">
        Daily CO₂e totals for the last 14 days: {data.map((d) => `${d.day}: ${formatCo2e(d.kg)}`).join(', ')}.
      </p>
    </GlassCard>
  )
}
