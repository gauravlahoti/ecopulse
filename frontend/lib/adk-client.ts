/**
 * Server-only client for the deployed ADK API server (adk deploy cloud_run).
 *
 * Talks the native ADK protocol: create a session, then POST /run_sse and read
 * the Event stream. Route handlers under app/api/v1/* use this and translate the
 * ADK events into the UI's own SSE/JSON contract. Never import from client code —
 * it reads server-only env (AGENTS_SERVICE_URL).
 */

const BASE = process.env.AGENTS_SERVICE_URL?.replace(/\/$/, '')
const APP = process.env.AGENTS_APP_NAME ?? 'ecopulse_agents'

export type AdkPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }

export type AdkEvent = {
  author?: string
  partial?: boolean
  content?: { role?: string; parts?: Array<Record<string, unknown>> }
}

export function adkConfigured(): boolean {
  return Boolean(BASE)
}

async function createSession(userId: string, sessionId: string): Promise<void> {
  const res = await fetch(`${BASE}/apps/${APP}/users/${userId}/sessions/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  // 400 typically means "already exists" — non-fatal since we use fresh UUIDs.
  if (!res.ok && res.status !== 400) {
    throw new Error(`ADK session create failed: ${res.status} ${res.statusText}`)
  }
}

/** Run one turn against the deployed coordinator agent; yields parsed ADK events. */
export async function* runAgent(opts: {
  userId: string
  parts: AdkPart[]
}): AsyncGenerator<AdkEvent> {
  if (!BASE) throw new Error('AGENTS_SERVICE_URL is not configured')

  const sessionId =
    globalThis.crypto?.randomUUID?.() ?? `s_${Date.now()}_${Math.round(Math.random() * 1e9)}`
  await createSession(opts.userId, sessionId)

  const res = await fetch(`${BASE}/run_sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appName: APP,
      userId: opts.userId,
      sessionId,
      newMessage: { role: 'user', parts: opts.parts },
      streaming: true,
    }),
  })
  if (!res.ok || !res.body) {
    throw new Error(`ADK run_sse failed: ${res.status} ${res.statusText}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const json = trimmed.slice(5).trim()
      if (!json) continue
      try {
        yield JSON.parse(json) as AdkEvent
      } catch {
        // skip malformed SSE frame
      }
    }
  }
}

/** Return the result dict of a named tool's functionResponse part, or null. */
export function findFunctionResponse(ev: AdkEvent, toolName: string): Record<string, unknown> | null {
  const parts = ev.content?.parts ?? []
  for (const p of parts) {
    const fr = (p['functionResponse'] ?? p['function_response']) as
      | { name?: string; response?: Record<string, unknown> }
      | undefined
    if (fr && fr.name === toolName && fr.response) {
      const r = fr.response
      // ADK wraps non-dict returns as { result: ... }; our tools return dicts.
      if (r && typeof r === 'object' && 'result' in r && Object.keys(r).length === 1) {
        return (r['result'] as Record<string, unknown>) ?? null
      }
      return r
    }
  }
  return null
}

/** Concatenated text of an event's text parts. */
export function textOf(ev: AdkEvent): string {
  const parts = ev.content?.parts ?? []
  return parts
    .map((p) => (typeof p['text'] === 'string' ? (p['text'] as string) : ''))
    .join('')
}
