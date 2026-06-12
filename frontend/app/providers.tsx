'use client'

import { useEffect, useState } from 'react'

// Use MSW mocks only in dev AND when not explicitly pointing at the live backend.
// Set NEXT_PUBLIC_USE_LIVE_BACKEND=true to bypass MSW so /api/v1/* requests reach
// the Next.js route handlers, which proxy to the deployed ADK agents.
const USE_MSW =
  process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_LIVE_BACKEND !== 'true'

export function Providers({ children }: { children: React.ReactNode }) {
  // When using MSW we must wait for the service worker to be intercepting before
  // rendering anything that fetches, otherwise the first request races the worker
  // registration and escapes to the network (404). `ready` starts the same on
  // server and client so there is no hydration mismatch; the client flips it to
  // true once the worker is active (or immediately when MSW is disabled).
  const [ready, setReady] = useState(!USE_MSW)

  useEffect(() => {
    if (!USE_MSW) return
    let active = true
    import('../lib/msw/browser')
      .then(({ worker }) => worker.start({ onUnhandledRequest: 'bypass' }))
      .then(() => {
        if (active) setReady(true)
      })
      .catch((err) => {
        // If MSW fails to start, don't trap the app behind the loader.
        // eslint-disable-next-line no-console
        console.error('[MSW] failed to start:', err)
        if (active) setReady(true)
      })
    return () => {
      active = false
    }
  }, [])

  if (!ready) {
    return (
      <div
        className="min-h-dvh flex items-center justify-center bg-space-black"
        role="status"
        aria-label="Initialising"
      >
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border border-neon-cyan/20 animate-pulse" />
          <div className="absolute inset-2 rounded-full border border-neon-cyan/40 animate-pulse" />
          <div className="absolute inset-4 rounded-full border border-neon-cyan/60 animate-pulse" />
        </div>
        <span className="sr-only">Loading EcoPulse…</span>
      </div>
    )
  }

  return <>{children}</>
}
