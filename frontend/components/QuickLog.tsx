'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { NeonButton } from './ui/NeonButton'
import { EmissionBreakdown } from './EmissionBreakdown'
import { useStore } from '@/lib/store'
import { parseText, scoreItems } from '@/lib/emissions'
import type { ActivityRecord, IdentifiedItem } from '@/lib/types'

type Mode = 'idle' | 'text' | 'upload'
type Phase = 'idle' | 'working' | 'done' | 'error'
type Stage = 'read' | 'identify' | 'calculate'

const TEXT_STAGES: Array<{ key: Stage; label: string }> = [
  { key: 'read', label: 'Reading your description' },
  { key: 'identify', label: 'Gemini AI identifying activities & quantities' },
  { key: 'calculate', label: 'Computing CO₂e from DEFRA factors (deterministic engine)' },
]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function buildActivity(description: string, items: IdentifiedItem[], sourceType: string): ActivityRecord {
  // CODE calculates — recompute every figure from the deterministic engine.
  const { totalCo2eKg, swapSuggestion, swapSavingPct } = scoreItems(items)
  return {
    id: `act_${Date.now().toString(36)}`,
    user_id: 'demo-user',
    category: items[0]?.category ?? 'other',
    description,
    co2e_kg: totalCo2eKg,
    items,
    timestamp: new Date().toISOString(),
    source_type: sourceType,
    ...(swapSuggestion && swapSavingPct !== null
      ? { swap_suggestion: swapSuggestion, swap_co2e_saving_pct: swapSavingPct }
      : {}),
  }
}

export function QuickLog() {
  const [mode, setMode] = useState<Mode>('idle')
  const [textInput, setTextInput] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [stage, setStage] = useState<Stage>('read')
  const [query, setQuery] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [lastItems, setLastItems] = useState<IdentifiedItem[] | null>(null)
  const [modelUsed, setModelUsed] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const reducedMotion = useReducedMotion()
  const { setIsSnapping, addActivity, openScanWithPhoto } = useStore()

  const handleTextSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const text = textInput.trim()
      if (!text) return
      const dwell = reducedMotion ? 0 : 480

      setQuery(text)
      setTextInput('')
      setMode('idle')
      setLastItems(null)
      setModelUsed(null)
      setPhase('working')

      // Stage 1 — show we've received the description.
      setStage('read')
      await sleep(dwell)

      // Stage 2 — AI identification (infers distances/portions from world knowledge).
      setStage('identify')
      let items: IdentifiedItem[] = []
      let model: string | null = null
      try {
        const res = await fetch('/api/v1/ingest/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
        const data = (await res.json()) as { items?: IdentifiedItem[]; model?: string }
        items = data.items ?? []
        model = data.model ?? null
      } catch {
        /* network issue — fall through to the offline parser */
      }
      if (!items.length) {
        items = parseText(text) // offline fallback if AI unavailable/rate-limited
        if (items.length) model = 'offline parser'
      }

      // Stage 3 — deterministic engine does the maths.
      setStage('calculate')
      await sleep(dwell)

      if (!items.length) {
        setErrorMsg("Couldn't recognise an activity. Try e.g. “chicken biryani 300g” or “Mumbai to Delhi by car”.")
        setPhase('error')
        return
      }
      addActivity(buildActivity(text, items, 'text'))
      setLastItems(items)
      setModelUsed(model)
      setPhase('done')
    },
    [textInput, addActivity, reducedMotion],
  )

  const handlePhotoUpload = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Please choose an image (JPEG, PNG, or WebP).')
        setPhase('error')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('Image too large (max 10 MB).')
        setPhase('error')
        return
      }
      setPhase('idle')
      openScanWithPhoto(file)
    },
    [openScanWithPhoto],
  )

  const spring = { type: 'spring' as const, stiffness: 400, damping: 30 }
  const currentStageIdx = TEXT_STAGES.findIndex((s) => s.key === stage)

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Log activity method">
        <NeonButton size="sm" variant="cyan" onClick={() => { setMode('idle'); setIsSnapping(true) }}>
          📷 Snap
        </NeonButton>
        <NeonButton
          size="sm"
          variant={mode === 'upload' ? 'solid' : 'cyan'}
          onClick={() => fileInputRef.current?.click()}
          aria-pressed={mode === 'upload'}
        >
          🖼 Upload photo
        </NeonButton>
        <NeonButton
          size="sm"
          variant={mode === 'text' ? 'solid' : 'cyan'}
          onClick={() => setMode(mode === 'text' ? 'idle' : 'text')}
          aria-pressed={mode === 'text'}
          aria-expanded={mode === 'text'}
        >
          ✏ Describe
        </NeonButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Upload a photo of food to calculate its carbon footprint"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handlePhotoUpload(f)
            e.target.value = ''
          }}
        />
      </div>

      <AnimatePresence>
        {mode === 'text' && (
          <motion.div
            key="text-panel"
            initial={reducedMotion ? {} : { height: 0, opacity: 0 }}
            animate={reducedMotion ? {} : { height: 'auto', opacity: 1 }}
            exit={reducedMotion ? {} : { height: 0, opacity: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            <form onSubmit={(e) => void handleTextSubmit(e)} className="flex gap-2">
              <label htmlFor="activity-text" className="sr-only">
                Describe your activity (e.g. &quot;drove 20km&quot;, &quot;chicken biryani 300g&quot;)
              </label>
              <input
                id="activity-text"
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder='e.g. "paneer butter masala 250g, 2 rotis" or "drove 20km"'
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-neon-cyan/50 focus:outline-none focus:ring-1 focus:ring-neon-cyan/30"
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
              <NeonButton type="submit" size="sm" variant="solid" disabled={!textInput.trim()}>
                Calculate
              </NeonButton>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Echo what was asked + processing/result — keeps the flow transparent */}
      {phase !== 'idle' && query && (
        <div className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
          <p className="text-sm">
            <span className="font-mono text-[11px] uppercase tracking-widest text-text-muted">You described</span>
            <br />
            <span className="text-text-primary">“{query}”</span>
          </p>

          {phase === 'working' && (
            <ol className="mt-3 flex flex-col gap-2" aria-label="Processing" aria-live="polite">
              {TEXT_STAGES.map((s, i) => {
                const done = i < currentStageIdx
                const active = i === currentStageIdx
                return (
                  <li key={s.key} className="flex items-center gap-2.5 text-sm">
                    {done ? (
                      <span className="text-carbon-low" aria-hidden="true">✓</span>
                    ) : active ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neon-cyan/30 border-t-neon-cyan" aria-hidden="true" />
                    ) : (
                      <span className="h-2 w-2 rounded-full bg-white/15" aria-hidden="true" />
                    )}
                    <span className={done ? 'text-text-secondary' : active ? 'text-text-primary' : 'text-text-muted'}>
                      {s.label}
                    </span>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      )}

      {phase === 'error' && (
        <p className="mt-3 rounded-lg border border-carbon-high/30 bg-carbon-high/[0.08] px-3 py-2 text-sm text-carbon-high" role="alert">
          {errorMsg}
        </p>
      )}

      {phase === 'done' && lastItems && (
        <div className="mt-3">
          <p className="mb-2 text-sm text-carbon-low">
            ✓ Logged{modelUsed && modelUsed !== 'offline parser' ? ` · identified by ${modelUsed}` : ''}
          </p>
          {modelUsed === 'offline parser' && (
            <p className="mb-2 rounded-lg border border-carbon-mid/30 bg-carbon-mid/[0.08] px-3 py-2 text-xs text-carbon-mid">
              AI was rate-limited, so this used the offline parser — quantities/distances are rough
              estimates. Re-run when the AI quota refreshes (or switch to Vertex) for precise identification.
            </p>
          )}
          <EmissionBreakdown items={lastItems} />
        </div>
      )}
    </div>
  )
}
