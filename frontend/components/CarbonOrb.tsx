'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'

/**
 * A small, calm carbon orb — the dashboard's ambient status light.
 *
 * Replaces the full Three.js globe on the dashboard hero: no post-processing,
 * no chromatic aberration, no per-frame particle churn (the sources of the old
 * flicker). Just a severity-tinted sphere with a soft halo and one slow sheen
 * sweep, fully disabled under prefers-reduced-motion.
 */

type Severity = {
  /** CSS color for the orb core + halo. */
  color: string
  label: string
}

function severityFor(co2eKg: number): Severity {
  if (co2eKg < 200) return { color: '#00F5D4', label: 'low' }
  if (co2eKg < 500) return { color: '#FFB800', label: 'moderate' }
  if (co2eKg < 1000) return { color: '#FF6B35', label: 'high' }
  return { color: '#FF2D55', label: 'critical' }
}

type CarbonOrbProps = {
  co2eKg: number
  /** Diameter in px. */
  size?: number
  className?: string
}

export function CarbonOrb({ co2eKg, size = 132, className }: CarbonOrbProps) {
  const reducedMotion = useReducedMotion()
  const { color, label } = severityFor(co2eKg)

  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Carbon load: ${label}`}
    >
      {/* Soft halo */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full blur-2xl"
        style={{ background: color, opacity: 0.28 }}
      />

      {/* Orbiting ring */}
      <motion.div
        aria-hidden="true"
        className="absolute rounded-full border"
        style={{ inset: -6, borderColor: `${color}55` }}
        animate={reducedMotion ? false : { rotate: 360 }}
        transition={{ duration: 36, ease: 'linear', repeat: Infinity }}
      >
        <span
          className="absolute top-1/2 -left-[3px] h-1.5 w-1.5 -translate-y-1/2 rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
        />
      </motion.div>

      {/* Core sphere */}
      <div
        aria-hidden="true"
        className="relative rounded-full overflow-hidden"
        style={{
          width: size * 0.78,
          height: size * 0.78,
          background: `radial-gradient(circle at 32% 28%, ${color}EE 0%, ${color}66 38%, #0A1424 78%, #060B16 100%)`,
          boxShadow: `inset 0 0 ${size * 0.18}px ${color}55, 0 0 ${size * 0.22}px ${color}33`,
        }}
      >
        {/* Slow sheen sweep */}
        {!reducedMotion && (
          <motion.div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(115deg, transparent 35%, ${color}33 50%, transparent 65%)`,
            }}
            animate={{ x: ['-60%', '60%'] }}
            transition={{ duration: 6, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse' }}
          />
        )}
        {/* Latitude hint lines for a globe feel */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full opacity-40"
          style={{
            background:
              'repeating-linear-gradient(0deg, transparent 0, transparent 13px, rgba(255,255,255,0.06) 13px, rgba(255,255,255,0.06) 14px)',
          }}
        />
      </div>
    </div>
  )
}
