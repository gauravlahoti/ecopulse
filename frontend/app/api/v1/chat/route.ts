import type { NextRequest } from 'next/server'
import { answerCarbonQuestion, QuotaError } from '@/lib/gemini-vision'
import type { ActivityRecord } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function sse(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`
}

/**
 * POST { message, relevant_activities, session_history } → Gemini answers the
 * question grounded ONLY in the user's logged activities, streamed back as token
 * events for the chat UI. Code-computed co2e is the source of truth.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as {
    message?: string
    relevant_activities?: ActivityRecord[]
    session_history?: Array<{ role: string; content: string }>
  }
  const question = (body.message ?? '').trim()

  const activitiesJson = JSON.stringify(
    (body.relevant_activities ?? []).slice(0, 20).map((a) => ({
      name: a.description,
      category: a.category,
      co2e_kg: Number(a.co2e_kg),
      when: String(a.timestamp).slice(0, 10),
    })),
  )
  const historyText = (body.session_history ?? [])
    .slice(-6)
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n')

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder()
      const send = (o: unknown) => controller.enqueue(enc.encode(sse(o)))
      try {
        if (!question) {
          send({ type: 'token', content: 'Ask me something about your logged activities.' })
          send({ type: 'complete' })
          controller.close()
          return
        }
        const answer = await answerCarbonQuestion(question, activitiesJson, historyText)
        // Stream word-by-word so the chat keeps its live typing feel.
        const words = answer.split(/(\s+)/)
        for (const w of words) {
          send({ type: 'token', content: w })
          await new Promise((r) => setTimeout(r, 12))
        }
        send({ type: 'complete' })
      } catch (err) {
        const message =
          err instanceof QuotaError
            ? 'I’m rate-limited right now (free-tier quota). Try again in a moment.'
            : 'Sorry — I couldn’t answer that just now. Please try again.'
        send({ type: 'token', content: message })
        send({ type: 'complete' })
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}
