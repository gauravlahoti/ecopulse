'use client'

import dynamic from 'next/dynamic'
import { useReducedMotion } from 'framer-motion'
import { GlobeFallback } from './GlobeFallback'
import type { ActivityRecord } from '@/lib/types'

// Dynamic import — Three.js is large; never SSR it
const GlobeScene = dynamic(
  () => import('./GlobeScene').then((m) => ({ default: m.GlobeScene })),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full h-full flex items-center justify-center"
        role="status"
        aria-label="Loading 3D globe"
      >
        <div className="relative w-32 h-32">
          <div className="absolute inset-0 rounded-full border border-neon-cyan/20 animate-pulse" />
          <div className="absolute inset-4 rounded-full border border-neon-cyan/30 animate-pulse delay-75" />
          <div className="absolute inset-8 rounded-full border border-neon-cyan/40 animate-pulse delay-150" />
          <span className="sr-only">Loading globe...</span>
        </div>
      </div>
    ),
  }
)

type GlobeProps = {
  co2eKg: number
  activities?: ActivityRecord[]
  height?: string
  className?: string
}

export function Globe({ co2eKg, activities = [], height = '100%', className }: GlobeProps) {
  const reducedMotion = useReducedMotion()

  if (reducedMotion) {
    return <GlobeFallback co2eKg={co2eKg} activities={activities} />
  }

  return (
    <div className={className} style={{ height }}>
      <GlobeScene co2eKg={co2eKg} height={height} />
    </div>
  )
}
