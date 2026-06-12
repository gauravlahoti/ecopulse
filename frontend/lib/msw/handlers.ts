/**
 * MSW mock handlers — backend-independent frontend development.
 *
 * Simulates all gateway + agents endpoints including SSE streams.
 * Sprint 3 replaces with real backend; MSW stays for offline dev/testing.
 */
import { http, HttpResponse, delay } from 'msw'
import type { ActivityRecord, ForecastScenario, CoachNudge, IdentifiedItem } from '../types'

// ── Static mock data ──────────────────────────────────────────────────────

const MOCK_ACTIVITIES: ActivityRecord[] = [
  {
    id: 'act_a1b2c3d4e5f6',
    user_id: 'demo-user',
    category: 'food',
    description: 'Beef burger with fries',
    co2e_kg: 5.82,
    items: [
      { name: 'beef burger patty', quantity: 150, unit: 'g', category: 'food', confidence: 0.94 },
      { name: 'french fries',      quantity: 100, unit: 'g', category: 'food', confidence: 0.88 },
      { name: 'cola',              quantity: 330, unit: 'ml',category: 'food', confidence: 0.97 },
    ],
    swap_suggestion: 'Try a lentil burger — saves 87% CO₂e',
    swap_co2e_saving_pct: 87,
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    source_type: 'photo',
  },
  {
    id: 'act_b2c3d4e5f6a1',
    user_id: 'demo-user',
    category: 'transport',
    description: 'Car commute 25km',
    co2e_kg: 4.1,
    items: [],
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    source_type: 'text',
  },
  {
    id: 'act_c3d4e5f6a1b2',
    user_id: 'demo-user',
    category: 'food',
    description: 'Chicken Caesar salad',
    co2e_kg: 1.38,
    items: [
      { name: 'chicken breast', quantity: 120, unit: 'g', category: 'food', confidence: 0.91 },
      { name: 'salad',          quantity: 80,  unit: 'g', category: 'food', confidence: 0.85 },
    ],
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    source_type: 'text',
  },
  {
    id: 'act_d4e5f6a1b2c3',
    user_id: 'demo-user',
    category: 'energy',
    description: 'Home electricity 20kWh',
    co2e_kg: 4.24,
    items: [],
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    source_type: 'text',
  },
  {
    id: 'act_e5f6a1b2c3d4',
    user_id: 'demo-user',
    category: 'food',
    description: 'Lamb chops with potatoes',
    co2e_kg: 8.1,
    items: [
      { name: 'lamb chops', quantity: 200, unit: 'g', category: 'food', confidence: 0.93 },
      { name: 'potatoes',   quantity: 150, unit: 'g', category: 'food', confidence: 0.89 },
    ],
    swap_suggestion: 'Try chicken instead of lamb — saves 82% CO₂e',
    swap_co2e_saving_pct: 82,
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    source_type: 'text',
  },
]

const MOCK_CURRENT_SCENARIO: ForecastScenario = {
  scenario_id: 'current_baseline',
  label: 'Current You',
  interventions: [],
  monthly_co2e_kg: [440, 455, 438, 461, 449, 442, 458, 445, 452, 467, 441, 448],
  total_co2e_kg: 5396,
  vs_baseline_pct: 0,
}

const MOCK_COACH_NUDGE: CoachNudge = {
  nudge_id: 'nudge_a1b2c3d4e5f6',
  user_id: 'demo-user',
  message: "Your food choices account for 63% of this week's footprint. Swapping to plant-based meals just twice this week could save the equivalent of a 20km car journey.",
  intervention_key: 'plant_meals',
  estimated_saving_pct: 12,
  generated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
}

// ── SSE helper ────────────────────────────────────────────────────────────

function sseEvent(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

async function* ingestSSEStream(text: string): AsyncGenerator<Uint8Array> {
  const encoder = new TextEncoder()
  const isBeefy = text.toLowerCase().includes('beef') || text.toLowerCase().includes('burger')
  const isChicken = text.toLowerCase().includes('chicken')

  const items: IdentifiedItem[] = isBeefy
    ? [
        { name: 'beef burger patty', quantity: 150, unit: 'g', category: 'food', confidence: 0.94 },
        { name: 'french fries',      quantity: 100, unit: 'g', category: 'food', confidence: 0.88 },
        { name: 'cola drink',        quantity: 330, unit: 'ml', category: 'food', confidence: 0.97 },
      ]
    : isChicken
    ? [
        { name: 'chicken breast', quantity: 120, unit: 'g', category: 'food', confidence: 0.91 },
        { name: 'salad',          quantity: 80,  unit: 'g', category: 'food', confidence: 0.85 },
      ]
    : [
        { name: 'mixed meal', quantity: 300, unit: 'g', category: 'food', confidence: 0.8 },
      ]

  const co2eValues = isBeefy ? [4.05, 0.046, 0.1] : isChicken ? [0.83, 0.16] : [0.6]

  yield encoder.encode(sseEvent({ type: 'start', count: items.length }))
  await delay(300)

  for (let i = 0; i < items.length; i++) {
    yield encoder.encode(sseEvent({ type: 'item_identified', item: items[i], co2e_kg: co2eValues[i] }))
    await delay(600)
  }

  if (isBeefy) {
    yield encoder.encode(sseEvent({
      type: 'swap_suggestion',
      suggestion: 'Try a lentil burger — saves 87% CO₂e',
      saving_pct: 87,
    }))
    await delay(200)
  }

  const activity: ActivityRecord = {
    id: `act_${Date.now().toString(36)}`,
    user_id: 'demo-user',
    category: 'food',
    description: items.map(i => i.name).join(', '),
    co2e_kg: Number(co2eValues.reduce((s, v) => s + v, 0).toFixed(3)),
    items: items.map((item, i) => ({ ...item, co2e_kg: co2eValues[i] ?? 0 })),
    timestamp: new Date().toISOString(),
    source_type: 'text',
    ...(isBeefy ? { swap_suggestion: 'Try a lentil burger — saves 87% CO₂e', swap_co2e_saving_pct: 87 } : {}),
  }

  yield encoder.encode(sseEvent({ type: 'activity_complete', activity }))
}

async function* chatSSEStream(message: string): AsyncGenerator<Uint8Array> {
  const encoder = new TextEncoder()
  const response = message.toLowerCase().includes('highest')
    ? 'Your highest-emission activity this week was lamb chops at 8.10 kg CO₂e [act_e5f6a1b2c3d4]. Consider swapping to chicken or plant-based protein to cut that by 80%.'
    : message.toLowerCase().includes('total')
    ? 'Your total logged carbon footprint is 23.64 kg CO₂e across 5 activities. Food accounts for 65%, transport 17%, and energy 18%.'
    : 'Based on your recent activities, your daily average is about 4.7 kg CO₂e. Your food choices have the highest impact — particularly beef and lamb meals [act_a1b2c3d4e5f6, act_e5f6a1b2c3d4].'

  const tokens = response.split(' ')
  for (let i = 0; i < tokens.length; i++) {
    const content = tokens[i] + (i < tokens.length - 1 ? ' ' : '')
    yield encoder.encode(sseEvent({ type: 'token', content }))
    await delay(45)
  }

  yield encoder.encode(sseEvent({ type: 'citations', ids: ['act_a1b2c3d4e5f6', 'act_e5f6a1b2c3d4'] }))
  yield encoder.encode(sseEvent({ type: 'complete' }))
}

// ── Handlers ──────────────────────────────────────────────────────────────

export const handlers = [
  // Activities list
  http.get('/api/v1/activities', async () => {
    await delay(400)
    return HttpResponse.json({ activities: MOCK_ACTIVITIES, total: MOCK_ACTIVITIES.length })
  }),

  // Text ingest → SSE stream
  http.post('/api/v1/ingest/text', async ({ request }) => {
    const body = await request.json() as { text: string }
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of ingestSSEStream(body.text)) {
          controller.enqueue(chunk)
        }
        controller.close()
      },
    })
    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  }),

  // Image ingest → SSE stream
  http.post('/api/v1/ingest/image', async () => {
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        const items: IdentifiedItem[] = [
          { name: 'beef burger patty', quantity: 150, unit: 'g', category: 'food', confidence: 0.94 },
          { name: 'french fries',      quantity: 100, unit: 'g', category: 'food', confidence: 0.88 },
          { name: 'cola',              quantity: 330, unit: 'ml', category: 'food', confidence: 0.97 },
        ]
        const co2e = [4.05, 0.046, 0.1]

        controller.enqueue(encoder.encode(sseEvent({ type: 'start', count: 3 })))
        await delay(500)

        for (let i = 0; i < items.length; i++) {
          controller.enqueue(encoder.encode(sseEvent({ type: 'item_identified', item: items[i], co2e_kg: co2e[i] })))
          await delay(700)
        }

        controller.enqueue(encoder.encode(sseEvent({
          type: 'swap_suggestion',
          suggestion: 'Try a lentil burger — saves 87% CO₂e',
          saving_pct: 87,
        })))

        const activity: ActivityRecord = {
          id: `act_${Date.now().toString(36)}`,
          user_id: 'demo-user',
          category: 'food',
          description: 'beef burger patty, french fries, cola',
          co2e_kg: 4.196,
          items: items.map((item, i) => ({ ...item, co2e_kg: co2e[i] ?? 0 })),
          swap_suggestion: 'Try a lentil burger — saves 87% CO₂e',
          swap_co2e_saving_pct: 87,
          timestamp: new Date().toISOString(),
          source_type: 'photo',
        }

        controller.enqueue(encoder.encode(sseEvent({ type: 'activity_complete', activity })))
        controller.close()
      },
    })
    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  }),

  // Forecast
  http.post('/api/v1/forecast', async ({ request }) => {
    await delay(300)
    const body = await request.json() as { interventions?: string[] }
    const interventions = body.interventions ?? []

    const reduction = interventions.reduce((acc, key) => {
      const savings: Record<string, number> = {
        cycle_2x: 0.08, plant_meals: 0.12, no_short_haul: 0.15, solar_tariff: 0.06,
      }
      return acc * (1 - (savings[key] ?? 0))
    }, 1.0)

    const committedMonthly = MOCK_CURRENT_SCENARIO.monthly_co2e_kg.map((v, i) => {
      const adoption = Math.min(1, (i + 1) / 3)
      return Math.round(v * (1 - (1 - reduction) * adoption) * 10) / 10
    }) as ForecastScenario['monthly_co2e_kg']

    const committed: ForecastScenario = {
      scenario_id: `committed_${interventions.join('_') || 'none'}`,
      label: 'Committed You',
      interventions,
      monthly_co2e_kg: committedMonthly,
      total_co2e_kg: Math.round(committedMonthly.reduce((s, v) => s + v, 0) * 10) / 10,
      vs_baseline_pct: Math.round((1 - reduction) * -100 * 10) / 10,
    }

    return HttpResponse.json({ current: MOCK_CURRENT_SCENARIO, committed })
  }),

  // Coach nudge
  http.post('/api/v1/coach/nudge', async () => {
    await delay(800)
    return HttpResponse.json(MOCK_COACH_NUDGE)
  }),

  // Carbon Conversations → SSE stream
  http.post('/api/v1/chat', async ({ request }) => {
    const body = await request.json() as { message: string }
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of chatSSEStream(body.message)) {
          controller.enqueue(chunk)
        }
        controller.close()
      },
    })
    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    })
  }),

  // Health check
  http.get('/api/v1/health', () => HttpResponse.json({ status: 'ok', mode: 'mock' })),
]
