/**
 * Shared TypeScript types — mirrors packages/schemas/models.py.
 * Keep these in sync whenever the Python models change.
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

export type IngestOutput = {
  items: IdentifiedItem[]
  source_type: 'photo' | 'text' | 'pdf'
  raw_description: string
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
  timestamp: string  // ISO 8601
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
  /** One concrete offset action (e.g. a verified reforestation contribution). */
  offset_suggestion?: string
  generated_at: string  // ISO 8601
}

// API response wrappers
export type ActivitiesResponse = {
  activities: ActivityRecord[]
  total: number
}

export type UploadResponse = {
  upload_id: string
  signed_url: string
}

// SSE event types for streaming agent responses
export type AgentStreamEvent =
  | { type: 'item_identified'; item: IdentifiedItem; co2e_kg: number }
  | { type: 'swap_suggestion'; suggestion: string; saving_pct: number }
  | { type: 'activity_complete'; activity: ActivityRecord }
  | { type: 'error'; message: string }
  | { type: 'token'; content: string }  // for Carbon Conversations streaming
