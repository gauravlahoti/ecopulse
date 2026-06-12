/**
 * SSE streaming hook for agent responses.
 *
 * Usage:
 *   const { stream, abort } = useSSEStream()
 *   await stream('/api/v1/ingest/text', { text: 'beef burger' }, onEvent)
 */
'use client'

import { useCallback, useRef } from 'react'
import type { AgentStreamEvent } from './types'

type SSEOptions = {
  method?: 'POST' | 'GET'
  body?: object
  headers?: Record<string, string>
}

type SSEHook = {
  stream: (
    url: string,
    options: SSEOptions,
    onEvent: (event: AgentStreamEvent) => void,
    onDone?: () => void,
    onError?: (err: Error) => void,
  ) => Promise<void>
  abort: () => void
}

export function useSSEStream(): SSEHook {
  const controllerRef = useRef<AbortController | null>(null)

  const abort = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
  }, [])

  const stream = useCallback(
    async (
      url: string,
      options: SSEOptions,
      onEvent: (event: AgentStreamEvent) => void,
      onDone?: () => void,
      onError?: (err: Error) => void,
    ): Promise<void> => {
      abort() // Cancel any in-flight stream
      const controller = new AbortController()
      controllerRef.current = controller

      try {
        const bodyStr = options.body ? JSON.stringify(options.body) : null
        const res = await fetch(url, {
          method: options.method ?? 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          ...(bodyStr !== null ? { body: bodyStr } : {}),
          signal: controller.signal,
        })

        if (!res.ok || !res.body) {
          const msg = `SSE request failed: ${res.status} ${res.statusText}`
          onError?.(new Error(msg))
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Process complete SSE lines
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? '' // Keep incomplete last line

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const jsonStr = trimmed.slice(5).trim()
            if (!jsonStr) continue

            try {
              const event = JSON.parse(jsonStr) as AgentStreamEvent
              onEvent(event)
            } catch {
              // Malformed SSE line — skip silently
            }
          }
        }

        onDone?.()
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        onError?.(err instanceof Error ? err : new Error(String(err)))
      }
    },
    [abort],
  )

  return { stream, abort }
}
