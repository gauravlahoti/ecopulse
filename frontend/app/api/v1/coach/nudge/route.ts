import type { NextRequest } from 'next/server'
import { generateCoach, QuotaError } from '@/lib/gemini-vision'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST { activity_summary, top_categories } → Gemini generates a personalised
 * reduction + offset recommendation from the user's real logged data. Returns a
 * null message (200) when there's nothing to coach on or the model is unavailable,
 * so the client degrades gracefully.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as {
    activity_summary?: string
    top_categories?: string
  }
  const summary = (body.activity_summary ?? '').trim()
  if (!summary) return Response.json({ message: null })

  try {
    const tip = await generateCoach(summary)
    return Response.json({
      nudge_id: `nudge_${Date.now().toString(36)}`,
      user_id: 'demo-user',
      message: tip.message,
      intervention_key: 'ai',
      estimated_saving_pct: tip.estimated_saving_pct,
      offset_suggestion: tip.offset_suggestion,
      generated_at: new Date().toISOString(),
    })
  } catch (err) {
    void (err instanceof QuotaError) // quota or other failure → graceful null
    return Response.json({ message: null })
  }
}
