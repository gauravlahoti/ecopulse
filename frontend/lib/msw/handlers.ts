import { http, HttpResponse } from 'msw'
import type { ActivityRecord, ForecastScenario } from '../types'

const MOCK_ACTIVITIES: ActivityRecord[] = [
  {
    id: 'act-001',
    user_id: 'demo-user',
    category: 'food',
    description: 'Beef burger + fries',
    co2e_kg: 3.2,
    items: [
      { name: 'Beef burger', quantity: 200, unit: 'g', category: 'food', confidence: 0.94 },
      { name: 'Fries', quantity: 150, unit: 'g', category: 'food', confidence: 0.91 },
    ],
    swap_suggestion: 'Try a lentil burger — saves 68% CO₂e',
    swap_co2e_saving_pct: 68,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    source_type: 'photo',
  },
  {
    id: 'act-002',
    user_id: 'demo-user',
    category: 'transport',
    description: 'Taxi ride 8km',
    co2e_kg: 1.6,
    items: [],
    swap_suggestion: 'Cycling this route saves 100% CO₂e',
    swap_co2e_saving_pct: 100,
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    source_type: 'text',
  },
  {
    id: 'act-003',
    user_id: 'demo-user',
    category: 'energy',
    description: 'Home electricity — March bill',
    co2e_kg: 12.4,
    items: [],
    swap_suggestion: 'Switching to a renewable tariff saves 85%',
    swap_co2e_saving_pct: 85,
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    source_type: 'pdf',
  },
  {
    id: 'act-004',
    user_id: 'demo-user',
    category: 'food',
    description: 'Oat milk latte',
    co2e_kg: 0.2,
    items: [{ name: 'Oat milk latte', quantity: 350, unit: 'ml', category: 'food', confidence: 0.97 }],
    timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    source_type: 'text',
  },
  {
    id: 'act-005',
    user_id: 'demo-user',
    category: 'travel',
    description: 'Flight LHR → JFK (economy)',
    co2e_kg: 430,
    items: [],
    swap_suggestion: 'Train to Edinburgh instead saves 92%',
    swap_co2e_saving_pct: 92,
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    source_type: 'text',
  },
]

const MOCK_CURRENT_SCENARIO: ForecastScenario = {
  scenario_id: 'current-2026',
  label: 'Current You',
  interventions: [],
  monthly_co2e_kg: [85, 92, 110, 88, 76, 82, 79, 84, 91, 87, 95, 98],
  total_co2e_kg: 1067,
  vs_baseline_pct: 0,
}

const MOCK_COMMITTED_SCENARIO: ForecastScenario = {
  scenario_id: 'committed-2026',
  label: 'Committed You',
  interventions: ['cycle_2x', 'plant_meals'],
  monthly_co2e_kg: [85, 80, 74, 68, 62, 58, 54, 51, 49, 47, 46, 44],
  total_co2e_kg: 718,
  vs_baseline_pct: -32.7,
}

export const handlers = [
  http.get('/api/v1/activities', () => {
    return HttpResponse.json({ activities: MOCK_ACTIVITIES, total: MOCK_ACTIVITIES.length })
  }),

  http.post('/api/v1/upload', async () => {
    await new Promise((r) => setTimeout(r, 800))
    return HttpResponse.json(
      { upload_id: 'mock-upload-' + Date.now(), signed_url: '/mock-image.jpg' },
      { status: 202 }
    )
  }),

  http.get('/api/v1/forecast', () => {
    return HttpResponse.json({
      current: MOCK_CURRENT_SCENARIO,
      committed: MOCK_COMMITTED_SCENARIO,
    })
  }),

  http.post('/api/v1/chat', async () => {
    await new Promise((r) => setTimeout(r, 400))
    return HttpResponse.json({
      message: 'Your March footprint was high primarily due to the LHR→JFK flight (act-005), which alone accounted for 430 kg CO₂e — about 40% of your monthly total.',
      agent: 'Analyst Agent',
      cited_activity_ids: ['act-005'],
    })
  }),

  http.get('http://localhost:8000/health', () => {
    return HttpResponse.json({ status: 'ok', service: 'ecopulse-gateway', version: '0.1.0' })
  }),
]
