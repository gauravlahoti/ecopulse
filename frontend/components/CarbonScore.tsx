'use client'

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { GlassCard } from './ui/GlassCard'

type CarbonScoreProps = {
  co2eKg: number
  period?: string
  deltaPercent?: number
}

function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(target)
  const reducedMotion = useReducedMotion()
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (reducedMotion) {
      setValue(target)
      return
    }
    const start = value
    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Spring-easing approximation
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(start + (target - start) * eased)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  return value
}

function getSeverityColor(co2eKg: number): string {
  if (co2eKg < 200) return 'text-carbon-low'
  if (co2eKg < 500) return 'text-carbon-mid'
  if (co2eKg < 1000) return 'text-carbon-high'
  return 'text-carbon-critical'
}

export function CarbonScore({ co2eKg, period = 'THIS MONTH', deltaPercent }: CarbonScoreProps) {
  const animated = useCountUp(co2eKg)
  const display = animated >= 1000 ? (animated / 1000).toFixed(2) : animated.toFixed(1)
  const unit = co2eKg >= 1000 ? 't' : 'kg'
  const color = getSeverityColor(co2eKg)

  const deltaPositive = deltaPercent !== undefined && deltaPercent > 0
  const deltaColor = deltaPercent !== undefined
    ? deltaPercent < 0 ? 'text-carbon-low' : 'text-carbon-critical'
    : ''

  return (
    <GlassCard variant="elevated" padding="lg">
      <p className="font-mono text-carbon-label text-text-muted uppercase tracking-widest mb-3">
        {period}
      </p>

      <div className="flex items-end gap-2 mb-2">
        <span
          className={`font-display font-extrabold leading-none text-[56px] md:text-[64px] ${color} text-glow-cyan`}
          aria-label={`${display} ${unit} CO₂ equivalent`}
        >
          {display}
        </span>
        <span className="text-2xl text-text-secondary font-display mb-2">
          {unit} CO₂e
        </span>
      </div>

      {deltaPercent !== undefined && (
        <p className={`font-mono text-sm ${deltaColor}`} aria-live="polite">
          {deltaPositive ? '↑' : '↓'} {Math.abs(deltaPercent).toFixed(0)}% vs last month
        </p>
      )}
    </GlassCard>
  )
}
