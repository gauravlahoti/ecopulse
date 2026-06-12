'use client'

import { scoreItems, DEFRA_META } from '@/lib/emissions'
import type { IdentifiedItem } from '@/lib/types'

/**
 * Transparent CO₂e breakdown. Recomputes every figure from the deterministic
 * engine (never trusts a stored/LLM number) and shows the exact arithmetic:
 *   normalised quantity × DEFRA factor = kg CO₂e
 * so the user can see precisely how the footprint was derived.
 */
export function EmissionBreakdown({
  items,
  className = '',
}: {
  items: IdentifiedItem[]
  className?: string
}) {
  if (!items.length) return null
  const { items: scored, totalCo2eKg } = scoreItems(items)

  const fmtQty = (q: number) => (Number.isInteger(q) ? q.toString() : q.toFixed(q < 1 ? 3 : 2))

  return (
    <div className={`rounded-xl border border-white/[0.07] bg-white/[0.02] ${className}`}>
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
        <span className="eyebrow text-neon-cyan/80">How this was calculated</span>
        <span className="font-mono text-[10px] text-text-muted">AI identified · engine verified the maths</span>
      </div>

      <ul className="divide-y divide-white/[0.05]">
        {scored.map((it, i) => {
          const b = it.breakdown
          return (
            <li key={`${it.name}-${i}`} className="px-3 py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-text-primary">{it.name}</span>
                <span className="font-mono text-sm font-bold text-text-primary">
                  {b.co2eKg.toFixed(b.co2eKg < 1 ? 3 : 2)} kg
                </span>
              </div>
              {b.matched ? (
                <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-text-secondary">
                  {fmtQty(b.inputQuantity)} {b.inputUnit}
                  {b.inputUnit !== b.factorUnit && (
                    <span className="text-text-muted"> = {fmtQty(b.normalisedQuantity)} {b.factorUnit}</span>
                  )}{' '}
                  <span className="text-text-muted">×</span> {b.factorPerUnit} kg/{b.factorUnit}{' '}
                  <span className="text-text-muted">=</span>{' '}
                  <span className="text-neon-cyan">{b.co2eKg.toFixed(b.co2eKg < 1 ? 3 : 2)} kg CO₂e</span>
                  <span className="ml-1 rounded bg-white/[0.06] px-1 py-0.5 text-[9px] uppercase tracking-wider text-text-muted">
                    {b.factorLabel}
                  </span>
                </p>
              ) : (
                <p className="mt-0.5 font-mono text-[11px] text-text-muted">
                  No DEFRA factor matched — counted as 0.
                </p>
              )}
            </li>
          )
        })}
      </ul>

      <div className="flex items-center justify-between border-t border-white/[0.06] px-3 py-2">
        <a
          href={DEFRA_META.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[10px] text-text-muted underline-offset-2 hover:text-neon-cyan hover:underline"
        >
          Source: DEFRA {DEFRA_META.version}
        </a>
        <span className="font-mono text-sm font-extrabold text-neon-cyan text-glow-cyan">
          {totalCo2eKg.toFixed(totalCo2eKg < 1 ? 3 : 2)} kg CO₂e
        </span>
      </div>
    </div>
  )
}
