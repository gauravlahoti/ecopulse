/**
 * Frontend type definitions — mirrors packages/schemas/models.ts.
 * Source of truth is the Python Pydantic models; keep in sync on schema changes.
 */

export type ActivityCategory =
  | 'food'
  | 'transport'
  | 'energy'
  | 'shopping'
  | 'travel'
  | 'other'

export type IdentifiedItem = {
  name: string
  quantity: number
  unit: string
  category: ActivityCategory
  confidence: number
}

export type ActivityRecord = {
  id: string
  user_id: string
  category: ActivityCategory
  description: string
  co2e_kg: number
  items: IdentifiedItem[]
  swap_suggestion?: string
  swap_co2e_saving_pct?: number
  timestamp: string
  source_type: string
}

export type ForecastScenario = {
  scenario_id: string
  label: string
  interventions: string[]
  monthly_co2e_kg: [number, number, number, number, number, number, number, number, number, number, number, number]
  total_co2e_kg: number
  vs_baseline_pct: number
}

export type CoachNudge = {
  nudge_id: string
  user_id: string
  message: string
  intervention_key: string
  estimated_saving_pct: number
  /** AI-suggested offset action (e.g. a verified reforestation contribution). */
  offset_suggestion?: string
  generated_at: string
}

export type AgentStreamEvent =
  | { type: 'item_identified'; item: IdentifiedItem; co2e_kg: number }
  | { type: 'swap_suggestion'; suggestion: string; saving_pct: number }
  | { type: 'activity_complete'; activity: ActivityRecord }
  | { type: 'error'; message: string }
  | { type: 'token'; content: string }

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  agent?: string
  isStreaming?: boolean
  citedActivityIds?: string[]
}

export type Intervention = {
  key: string
  label: string
  icon: string
  saving_pct: number
  active: boolean
}
