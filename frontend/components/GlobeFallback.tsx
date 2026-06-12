'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { GlassCard } from './ui/GlassCard'
import { CarbonBadge } from './ui/CarbonBadge'
import type { ActivityRecord } from '@/lib/types'

const CATEGORY_COLORS: Record<string, string> = {
  food: '#EF4444',
  transport: '#F97316',
  energy: '#EAB308',
  shopping: '#8B5CF6',
  travel: '#3B82F6',
  other: '#6B7280',
}

type GlobeFallbackProps = {
  co2eKg: number
  activities: ActivityRecord[]
}

export function GlobeFallback({ co2eKg, activities }: GlobeFallbackProps) {
  const categoryTotals = activities.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] ?? 0) + a.co2e_kg
    return acc
  }, {})

  const chartData = Object.entries(categoryTotals).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: Math.round(value * 10) / 10,
    category: name,
  }))

  const sorted = [...activities].sort((a, b) => b.co2e_kg - a.co2e_kg)

  return (
    <div className="w-full h-full flex flex-col gap-4 p-4 overflow-auto">
      {/* Accessible notice */}
      <p className="text-xs font-mono text-text-muted uppercase tracking-widest" role="note">
        2D view — reduced motion active
      </p>

      {/* Donut chart */}
      <GlassCard padding="sm">
        <h2 className="font-mono text-carbon-label text-text-muted uppercase tracking-widest mb-3">
          Carbon by Category
        </h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                dataKey="value"
                paddingAngle={2}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.category}
                    fill={CATEGORY_COLORS[entry.category] ?? '#6B7280'}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: number) => [`${val} kg CO₂e`, '']}
                contentStyle={{
                  background: '#0D1526',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  color: '#E8EDF5',
                }}
              />
              <Legend
                formatter={(val) => (
                  <span className="text-xs text-text-secondary">{val}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-text-muted text-sm text-center py-8">No activity data yet</p>
        )}
      </GlassCard>

      {/* Data table */}
      <GlassCard padding="sm">
        <h2 className="font-mono text-carbon-label text-text-muted uppercase tracking-widest mb-3">
          Activity Log — Total:{' '}
          <span className="text-neon-cyan">{co2eKg.toFixed(1)} kg CO₂e</span>
        </h2>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-white/10">
                <th className="pb-2 font-mono text-xs text-text-muted uppercase tracking-wider pr-4">Activity</th>
                <th className="pb-2 font-mono text-xs text-text-muted uppercase tracking-wider pr-4">Category</th>
                <th className="pb-2 font-mono text-xs text-text-muted uppercase tracking-wider">CO₂e</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => (
                <tr key={a.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2 pr-4 text-text-primary">{a.description}</td>
                  <td className="py-2 pr-4 text-text-secondary capitalize">{a.category}</td>
                  <td className="py-2">
                    <CarbonBadge co2eKg={a.co2e_kg} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sorted.length === 0 && (
            <p className="text-text-muted text-sm py-4 text-center">No activities logged yet</p>
          )}
        </div>
      </GlassCard>
    </div>
  )
}
