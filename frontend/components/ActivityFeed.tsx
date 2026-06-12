'use client'

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { GlassCard } from './ui/GlassCard'
import { CarbonBadge, CategoryDot } from './ui/CarbonBadge'
import type { ActivityRecord } from '@/lib/types'

const CATEGORY_BORDER: Record<string, string> = {
  food: 'border-l-red-500',
  transport: 'border-l-orange-500',
  energy: 'border-l-yellow-500',
  shopping: 'border-l-violet-500',
  travel: 'border-l-blue-500',
  other: 'border-l-gray-500',
}

const CATEGORY_ICON: Record<string, string> = {
  food: '🥩',
  transport: '🚗',
  energy: '⚡',
  shopping: '🛍',
  travel: '✈',
  other: '📊',
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

type ActivityCardProps = {
  activity: ActivityRecord
  animate?: boolean
}

function ActivityCard({ activity: a, animate = true }: ActivityCardProps) {
  const reducedMotion = useReducedMotion()
  const border = CATEGORY_BORDER[a.category] ?? 'border-l-gray-500'

  const card = (
    <div
      className={`glass rounded-xl border-l-[3px] ${border} p-3 flex items-start gap-3`}
      role="article"
      aria-label={`${a.description}, ${a.co2e_kg} kg CO₂e`}
    >
      <span className="text-xl mt-0.5 flex-shrink-0" aria-hidden="true">
        {CATEGORY_ICON[a.category] ?? '📊'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-text-primary text-sm font-medium truncate">{a.description}</p>
          <CarbonBadge co2eKg={a.co2e_kg} />
        </div>
        <div className="flex items-center gap-2">
          <CategoryDot category={a.category} />
          <span className="text-text-muted text-xs capitalize">{a.category}</span>
          <span className="text-text-muted text-xs">·</span>
          <time className="text-text-muted text-xs" dateTime={a.timestamp}>
            {timeAgo(a.timestamp)}
          </time>
        </div>
        {a.swap_suggestion && (
          <p className="mt-1.5 text-xs text-neon-cyan flex items-center gap-1">
            <span aria-hidden="true">💡</span>
            {a.swap_suggestion}
          </p>
        )}
      </div>
    </div>
  )

  if (!animate || reducedMotion) return card

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 25 }}
    >
      {card}
    </motion.div>
  )
}

type ActivityFeedProps = {
  activities: ActivityRecord[]
  isLoading?: boolean
}

export function ActivityFeed({ activities, isLoading = false }: ActivityFeedProps) {
  const reducedMotion = useReducedMotion()

  return (
    <GlassCard padding="md" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-carbon-label text-text-muted uppercase tracking-widest">
          Activity Feed
        </h2>
        <span className="font-mono text-xs text-text-muted">{activities.length} logged</span>
      </div>

      {/* Live region — announces new activities to screen readers */}
      <div
        aria-live="polite"
        aria-label="Activity feed updates"
        className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin"
      >
        {isLoading && (
          <div className="flex items-center gap-2 p-3" role="status" aria-label="Loading activities">
            <div className="scanning-line rounded" />
            <span className="text-text-muted text-sm">Loading...</span>
          </div>
        )}

        {!isLoading && activities.length === 0 && (
          <p className="text-text-muted text-sm text-center py-6">
            No activities yet — log your first one above
          </p>
        )}

        {reducedMotion
          ? activities.map((a) => <ActivityCard key={a.id} activity={a} animate={false} />)
          : (
            <AnimatePresence initial={false}>
              {activities.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                >
                  <ActivityCard activity={a} animate={false} />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
      </div>
    </GlassCard>
  )
}
