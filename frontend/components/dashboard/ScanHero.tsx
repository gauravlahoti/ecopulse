'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { QuickLog } from '@/components/QuickLog'
import { CarbonPulse } from '@/components/landing/CarbonPulse'

/**
 * The dashboard's centerpiece: the three ways to log (Snap / Upload / Describe),
 * framed as a captivating animated hero. The animated carbon-pulse canvas sits
 * behind it as ambient motion (gated by prefers-reduced-motion inside CarbonPulse).
 */
export function ScanHero() {
  const reduced = useReducedMotion()
  const rise = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as number[] },
      }

  return (
    <section
      aria-label="Log your carbon"
      className="bg-grain relative overflow-hidden rounded-3xl border border-white/[0.08] p-6 md:p-8"
      style={{ background: 'linear-gradient(135deg, rgba(0,245,212,0.07), rgba(123,97,255,0.06))' }}
    >
      {/* Aurora + animated pulse backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {!reduced && (
          <>
            <div className="absolute -left-16 -top-20 h-72 w-72 animate-aurora rounded-full bg-[radial-gradient(circle,rgba(0,245,212,0.18),transparent_60%)]" />
            <div className="absolute -right-10 top-0 h-64 w-64 animate-aurora rounded-full bg-[radial-gradient(circle,rgba(123,97,255,0.16),transparent_60%)] [animation-delay:-8s]" />
          </>
        )}
        {/* The animated carbon pulse as an ambient floor, masked to fade upward */}
        <div className="absolute inset-x-0 bottom-0 h-28 opacity-50 [mask-image:linear-gradient(to_top,black,transparent)]">
          <CarbonPulse />
        </div>
      </div>

      <div className="relative z-10">
        <motion.p {...rise} className="eyebrow mb-3 text-neon-cyan">
          Your carbon, in three seconds
        </motion.p>
        <motion.h1
          {...(reduced ? {} : { ...rise, transition: { ...rise.transition, delay: 0.05 } })}
          className="font-display text-2xl font-extrabold leading-tight text-text-primary md:text-3xl"
        >
          Snap it. Upload it. Or just <span className="text-gradient">describe it.</span>
        </motion.h1>
        <motion.p
          {...(reduced ? {} : { ...rise, transition: { ...rise.transition, delay: 0.1 } })}
          className="mt-2 max-w-xl text-sm text-text-secondary md:text-base"
        >
          AI identifies what it is; the deterministic engine computes verified CO₂e from DEFRA
          factors — every number explained.
        </motion.p>

        <motion.div {...(reduced ? {} : { ...rise, transition: { ...rise.transition, delay: 0.16 } })} className="mt-5">
          <QuickLog />
        </motion.div>
      </div>
    </section>
  )
}
