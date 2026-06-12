/**
 * Derived dashboard intelligence — pure functions over the activity log.
 *
 * The hot path (Ingest/Analyst/Forecast agents) hands the UI an ActivityRecord[]
 * with verified CO₂e per item. These helpers summarise that log into the few
 * numbers the "Carbon Intelligence" hero surfaces: where emissions come from,
 * which way the trend is heading, and where the month is projected to land.
 * No LLM, no arithmetic guesses — deterministic reductions only.
 */
import type { ActivityCategory, ActivityRecord } from './types'

const DAY_MS = 86_400_000

export type TopSource = {
  category: ActivityCategory
  kg: number
  /** Share of total CO₂e, 0–100. */
  pct: number
}

export type Insights = {
  total: number
  topSource: TopSource | null
  /** This-7-days vs prior-7-days change, in %. null when there's no prior data. */
  weekDeltaPct: number | null
  /** Daily CO₂e totals for the last 7 days, oldest → newest. */
  sparkline: number[]
  /** Linear projection of the current calendar month's total CO₂e. */
  projectedMonthEndKg: number | null
}

function categoryTotals(activities: ActivityRecord[]): Map<ActivityCategory, number> {
  const totals = new Map<ActivityCategory, number>()
  for (const a of activities) {
    totals.set(a.category, (totals.get(a.category) ?? 0) + a.co2e_kg)
  }
  return totals
}

function computeTopSource(activities: ActivityRecord[], total: number): TopSource | null {
  if (activities.length === 0 || total <= 0) return null
  let best: TopSource | null = null
  for (const [category, kg] of categoryTotals(activities)) {
    if (!best || kg > best.kg) {
      best = { category, kg, pct: (kg / total) * 100 }
    }
  }
  return best
}

/** Daily CO₂e buckets for the trailing `days` window, oldest → newest. */
function computeSparkline(activities: ActivityRecord[], now: number, days = 7): number[] {
  const buckets = new Array<number>(days).fill(0)
  const startOfToday = now - (now % DAY_MS)
  for (const a of activities) {
    const t = new Date(a.timestamp).getTime()
    if (Number.isNaN(t)) continue
    const dayIndex = Math.floor((startOfToday - (t - (t % DAY_MS))) / DAY_MS)
    if (dayIndex >= 0 && dayIndex < days) {
      buckets[days - 1 - dayIndex]! += a.co2e_kg
    }
  }
  return buckets
}

function sumWithin(activities: ActivityRecord[], from: number, to: number): number {
  return activities.reduce((sum, a) => {
    const t = new Date(a.timestamp).getTime()
    return t >= from && t < to ? sum + a.co2e_kg : sum
  }, 0)
}

function computeWeekDelta(activities: ActivityRecord[], now: number): number | null {
  const thisWeek = sumWithin(activities, now - 7 * DAY_MS, now)
  const priorWeek = sumWithin(activities, now - 14 * DAY_MS, now - 7 * DAY_MS)
  if (priorWeek <= 0) return null
  return ((thisWeek - priorWeek) / priorWeek) * 100
}

function computeProjection(activities: ActivityRecord[], now: number): number | null {
  const ref = new Date(now)
  const monthStart = new Date(ref.getFullYear(), ref.getMonth(), 1).getTime()
  const daysInMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate()
  const dayOfMonth = ref.getDate()
  const monthTotal = sumWithin(activities, monthStart, now + DAY_MS)
  if (monthTotal <= 0 || dayOfMonth < 1) return null
  return (monthTotal / dayOfMonth) * daysInMonth
}

/** Summarise an activity log into the dashboard's headline intelligence. */
export function computeInsights(activities: ActivityRecord[], now: number = Date.now()): Insights {
  const total = activities.reduce((sum, a) => sum + a.co2e_kg, 0)
  return {
    total,
    topSource: computeTopSource(activities, total),
    weekDeltaPct: computeWeekDelta(activities, now),
    sparkline: computeSparkline(activities, now),
    projectedMonthEndKg: computeProjection(activities, now),
  }
}

export function formatCo2e(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`
  if (kg >= 1) return `${kg.toFixed(1)} kg`
  return `${(kg * 1000).toFixed(0)} g`
}

const CATEGORY_LABEL: Record<ActivityCategory, string> = {
  food: 'Food',
  transport: 'Transport',
  energy: 'Energy',
  shopping: 'Shopping',
  travel: 'Travel',
  other: 'Other',
}

export function categoryLabel(category: ActivityCategory): string {
  return CATEGORY_LABEL[category] ?? 'Other'
}
