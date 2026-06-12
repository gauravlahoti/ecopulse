'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'

/**
 * The agentic story, made visible. Shows the four ADK roles the platform runs —
 * Ingest → Analyst → Forecast on the hot path, Coach on the weekly batch — and
 * lights them up while a log is being processed. This is the "AI coaching staff
 * that works while you sleep" rendered as a live pipeline, not marketing copy.
 */

type AgentStatus = 'ready' | 'active' | 'scheduled'

type Agent = {
  key: string
  name: string
  model: string
  hint: string
}

const AGENTS: Agent[] = [
  { key: 'ingest', name: 'Ingest', model: 'Flash', hint: 'Identifies items & quantities' },
  { key: 'analyst', name: 'Analyst', model: 'Engine', hint: 'Computes verified CO₂e' },
  { key: 'forecast', name: 'Forecast', model: 'Flash', hint: 'Projects trajectories' },
  { key: 'coach', name: 'Coach', model: 'Pro · weekly', hint: 'Plans nudges while you sleep' },
]

const DOT: Record<AgentStatus, string> = {
  ready: 'bg-neon-cyan/50',
  active: 'bg-neon-cyan',
  scheduled: 'bg-neon-purple/70',
}

type AgentPipelineProps = {
  /** True while a Quick Log is being analysed — lights up the hot path. */
  processing?: boolean
  className?: string
}

export function AgentPipeline({ processing = false, className }: AgentPipelineProps) {
  const reducedMotion = useReducedMotion()

  function statusFor(key: string): AgentStatus {
    if (key === 'coach') return 'scheduled'
    if (processing && (key === 'ingest' || key === 'analyst')) return 'active'
    return 'ready'
  }

  return (
    <div
      className={cn('flex items-stretch gap-1.5', className)}
      role="group"
      aria-label="Agent pipeline status"
    >
      {AGENTS.map((agent, i) => {
        const status = statusFor(agent.key)
        const active = status === 'active'
        return (
          <div key={agent.key} className="flex items-center gap-1.5 flex-1 min-w-0">
            <div
              className={cn(
                'flex-1 min-w-0 rounded-lg border px-2.5 py-2 transition-colors',
                active
                  ? 'border-neon-cyan/40 bg-neon-cyan/[0.06]'
                  : status === 'scheduled'
                  ? 'border-neon-purple/25 bg-neon-purple/[0.04]'
                  : 'border-white/[0.07] bg-white/[0.02]'
              )}
              title={agent.hint}
            >
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  {active && !reducedMotion && (
                    <motion.span
                      className="absolute inline-flex h-full w-full rounded-full bg-neon-cyan"
                      animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                      transition={{ duration: 1.2, ease: 'easeOut', repeat: Infinity }}
                    />
                  )}
                  <span className={cn('relative inline-flex h-2 w-2 rounded-full', DOT[status])} />
                </span>
                <span className="font-display text-xs font-semibold text-text-primary truncate">
                  {agent.name}
                </span>
              </div>
              <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-widest text-text-muted truncate">
                {agent.model}
              </span>
            </div>

            {/* Connector between stages (not after the last) */}
            {i < AGENTS.length - 1 && (
              <div className="relative h-px w-3 flex-shrink-0 bg-white/10" aria-hidden="true">
                {processing && !reducedMotion && i < 2 && (
                  <motion.span
                    className="absolute inset-y-0 left-0 w-1.5 rounded-full bg-neon-cyan"
                    animate={{ x: ['-100%', '300%'], opacity: [0, 1, 0] }}
                    transition={{ duration: 1, ease: 'linear', repeat: Infinity, delay: i * 0.3 }}
                  />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
