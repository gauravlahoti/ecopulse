/**
 * Typed API client for the EcoPulse gateway.
 * All calls are routed through /api/v1 — the Next.js proxy handles the
 * gateway URL so the client never constructs absolute URLs.
 */
import type { ActivityRecord, ForecastScenario, CoachNudge } from './types'

const BASE = '/api/v1'

type ApiError = {
  error: string
  message: string
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({ error: 'network_error', message: res.statusText }))
    throw new Error(err.message || `API error ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ── Activities ────────────────────────────────────────────────────────────

export async function fetchActivities(limit = 50): Promise<ActivityRecord[]> {
  const data = await apiFetch<{ activities: ActivityRecord[] }>(`/activities?limit=${limit}`)
  return data.activities
}

export async function deleteActivity(id: string): Promise<void> {
  await apiFetch(`/activities/${id}`, { method: 'DELETE' })
}

// ── Forecast ──────────────────────────────────────────────────────────────

type DualForecastResponse = {
  current: ForecastScenario
  committed: ForecastScenario
}

export async function fetchForecast(
  activityHistory: ActivityRecord[],
  interventions: string[],
): Promise<DualForecastResponse> {
  return apiFetch('/forecast', {
    method: 'POST',
    body: JSON.stringify({ activity_history: activityHistory, interventions }),
  })
}

// ── Coach nudge ───────────────────────────────────────────────────────────

export async function fetchCoachNudge(
  activitySummary: string,
  topCategories: string,
  previousNudgeKeys: string[],
): Promise<CoachNudge> {
  return apiFetch('/coach/nudge', {
    method: 'POST',
    body: JSON.stringify({
      activity_summary: activitySummary,
      top_categories: topCategories,
      previous_nudge_keys: previousNudgeKeys,
    }),
  })
}
