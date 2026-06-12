import type { NextRequest } from 'next/server'
import { identifyFromText, QuotaError } from '@/lib/gemini-vision'
import type { IdentifiedItem } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST { text } → Gemini extracts structured activities (inferring distances /
 * portions from world knowledge) → returns identified items. The client's
 * deterministic engine computes CO₂e. The model identifies; code calculates.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { text?: string }
  const text = (body.text ?? '').trim()
  if (!text) return Response.json({ items: [], error: 'Empty input.' })

  try {
    const { items, modelUsed } = await identifyFromText(text)
    const identified: IdentifiedItem[] = items.map((v) => ({
      name: v.name,
      quantity: v.quantity,
      unit: v.unit,
      category: v.category,
      confidence: v.confidence,
    }))
    return Response.json({ items: identified, model: modelUsed })
  } catch (err) {
    const error =
      err instanceof QuotaError
        ? 'AI is rate-limited right now (free-tier quota reached). Try again shortly.'
        : `AI extraction failed: ${err instanceof Error ? err.message : 'unknown error'}`
    // 200 with an error field so the client can fall back without a console error.
    return Response.json({ items: [], error })
  }
}
