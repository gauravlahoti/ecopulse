import type { NextRequest } from 'next/server'
import { identifyFood, QuotaError } from '@/lib/gemini-vision'
import { scoreItems } from '@/lib/emissions'
import type { ActivityRecord, IdentifiedItem } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function sse(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`
}

/**
 * POST raw image bytes (Content-Type image/*) → Gemini vision identifies items
 * (+ bounding boxes) → deterministic engine computes CO₂e → UI SSE contract.
 * The model only identifies; every kg figure comes from the engine.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const mimeType = req.headers.get('content-type') || 'image/jpeg'
  const buf = await req.arrayBuffer()
  if (buf.byteLength > 10 * 1024 * 1024) {
    return new Response(JSON.stringify({ error: 'Image too large (max 10MB)' }), { status: 413 })
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder()
      const send = (o: unknown) => controller.enqueue(enc.encode(sse(o)))
      try {
        const { items: visionItems, modelUsed } = await identifyFood(buf, mimeType)
        if (!visionItems.length) {
          send({ type: 'error', message: 'No food items were recognised in the photo. Try a clearer shot, or describe the meal in text.' })
          controller.close()
          return
        }

        const identified: IdentifiedItem[] = visionItems.map((v) => ({
          name: v.name,
          quantity: v.quantity,
          unit: v.unit,
          category: v.category,
          confidence: v.confidence,
        }))
        const { items: scored, totalCo2eKg, swapSuggestion, swapSavingPct } = scoreItems(identified)

        send({ type: 'start', count: scored.length, model: modelUsed })
        scored.forEach((it, i) => {
          send({
            type: 'item_identified',
            item: { name: it.name, quantity: it.quantity, unit: it.unit, category: it.category, confidence: it.confidence },
            co2e_kg: it.co2e_kg,
            box: visionItems[i]?.box ?? null,
          })
        })
        if (swapSuggestion) {
          send({ type: 'swap_suggestion', suggestion: swapSuggestion, saving_pct: swapSavingPct ?? 0 })
        }

        const activity: ActivityRecord = {
          id: `act_${Date.now().toString(36)}`,
          user_id: 'demo-user',
          category: identified[0]?.category ?? 'food',
          description: identified.map((i) => i.name).join(', '),
          co2e_kg: totalCo2eKg,
          items: identified,
          ...(swapSuggestion ? { swap_suggestion: swapSuggestion, swap_co2e_saving_pct: swapSavingPct ?? 0 } : {}),
          timestamp: new Date().toISOString(),
          source_type: 'photo',
        }
        send({ type: 'activity_complete', activity })
      } catch (err) {
        const message =
          err instanceof QuotaError
            ? 'AI image analysis is rate-limited right now (free-tier quota reached). Try again shortly, or describe the meal in text — the calculation is identical.'
            : `Couldn't analyse the photo: ${err instanceof Error ? err.message : 'unknown error'}`
        send({ type: 'error', message })
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}
