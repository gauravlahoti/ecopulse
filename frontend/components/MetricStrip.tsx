'use client'

import { useMemo } from 'react'
import type { ActivityRecord } from '@/lib/types'

const PERIODS = ['TODAY', 'THIS WEEK', 'THIS MONTH', 'THIS YEAR'] as const

const DAY = 86400000
const WEEK = DAY * 7
const MONTH = DAY * 30
const YEAR = DAY * 365

function getSeverityColor(co2eKg: number): string {
  if (co2eKg < 5) return 'text-carbon-low'
  if (co2eKg < 50) return 'text-carbon-mid'
  if (co2eKg < 200) return 'text-carbon-high'
  return 'text-carbon-critical'
}

function formatVal(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  if (kg >= 1) return `${kg.toFixed(1)}kg`
  return `${(kg * 1000).toFixed(0)}g`
}

type MetricStripProps = {
  activities: ActivityRecord[]
}

export function MetricStrip({ activities }: MetricStripProps) {
  const now = Date.now()

  const totals = useMemo(() => {
    const cutoffs = [now - DAY, now - WEEK, now - MONTH, now - YEAR]
    return cutoffs.map((cutoff) =>
      activities
        .filter((a) => new Date(a.timestamp).getTime() >= cutoff)
        .reduce((s, a) => s + a.co2e_kg, 0)
    )
  }, [activities, now])

  return (
    <nav
      aria-label="Carbon footprint summary"
      className="glass border-t border-white/[0.07] px-4 py-3 flex items-center gap-1 overflow-x-auto"
    >
      {PERIODS.map((label, i) => {
        const val = totals[i] ?? 0
        const color = getSeverityColor(val)
        return (
          <div
            key={label}
            className="flex-1 min-w-[80px] flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
              {label}
            </span>
            <span className={`font-mono text-lg font-bold ${color}`} aria-label={`${formatVal(val)} CO₂e ${label.toLowerCase()}`}>
              {formatVal(val)}
            </span>
          </div>
        )
      })}
    </nav>
  )
}
