'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { GlassCard } from '../ui/GlassCard'
import { categoryLabel, formatCo2e } from '@/lib/insights'
import type { ActivityCategory, ActivityRecord } from '@/lib/types'

const COLORS: Record<ActivityCategory, string> = {
  food: '#FF6B35',
  transport: '#FFB800',
  energy: '#00C896',
  shopping: '#7B61FF',
  travel: '#00F5D4',
  other: '#8892A4',
}

type Slice = { category: ActivityCategory; kg: number; pct: number }

export function CategoryDonut({ activities }: { activities: ActivityRecord[] }) {
  const { slices, total } = useMemo(() => {
    const totals = new Map<ActivityCategory, number>()
    for (const a of activities) totals.set(a.category, (totals.get(a.category) ?? 0) + a.co2e_kg)
    const sum = [...totals.values()].reduce((s, v) => s + v, 0)
    const arr: Slice[] = [...totals.entries()]
      .map(([category, kg]) => ({ category, kg, pct: sum > 0 ? (kg / sum) * 100 : 0 }))
      .sort((a, b) => b.kg - a.kg)
    return { slices: arr, total: sum }
  }, [activities])

  // Recharts renders its <svg> asynchronously (ResponsiveContainer measures
  // first) and leaves a focusable surface inside. This donut is decorative — the
  // legend beside it carries the data — so a MutationObserver strips any tab
  // stops as they appear, keeping the aria-hidden wrapper free of focusable
  // descendants (WCAG aria-hidden-focus).
  const chartRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = chartRef.current
    if (!root) return
    const neutralize = () => {
      root.querySelectorAll<HTMLElement>('svg, [tabindex], [role]').forEach((el) => {
        if (el.getAttribute('tabindex') !== '-1') el.setAttribute('tabindex', '-1')
        if (el.hasAttribute('role')) el.removeAttribute('role')
      })
    }
    neutralize()
    const mo = new MutationObserver(neutralize)
    mo.observe(root, { childList: true, subtree: true, attributes: true })
    return () => mo.disconnect()
  }, [])

  return (
    <GlassCard padding="md">
      <h2 className="eyebrow mb-2 text-text-muted">Where it comes from</h2>
      <div className="flex items-center gap-4">
        <div ref={chartRef} className="relative h-32 w-32 flex-shrink-0" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart accessibilityLayer={false}>
              <Pie
                data={slices}
                dataKey="kg"
                nameKey="category"
                innerRadius={42}
                outerRadius={62}
                paddingAngle={2}
                stroke="none"
                isAnimationActive={false}
              >
                {slices.map((s) => (
                  <Cell key={s.category} fill={COLORS[s.category]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-lg font-extrabold text-text-primary">
              {formatCo2e(total)}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-text-muted">total</span>
          </div>
        </div>

        <ul className="flex-1 space-y-1.5">
          {slices.map((s) => (
            <li key={s.category} className="flex items-center gap-2 text-sm">
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ background: COLORS[s.category] }}
                aria-hidden="true"
              />
              <span className="flex-1 text-text-secondary">{categoryLabel(s.category)}</span>
              <span className="font-mono text-xs text-text-primary">{s.pct.toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </GlassCard>
  )
}
