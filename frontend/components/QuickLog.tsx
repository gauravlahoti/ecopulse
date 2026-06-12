'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { NeonButton } from './ui/NeonButton'
import { EmissionBreakdown } from './EmissionBreakdown'
import { useStore } from '@/lib/store'
import { parseText, scoreItems } from '@/lib/emissions'
import type { ActivityRecord, IdentifiedItem } from '@/lib/types'

type Mode = 'idle' | 'text' | 'upload'
type Status = { kind: 'idle' | 'working' | 'done' | 'error'; message?: string }

function buildActivity(
  description: string,
  items: IdentifiedItem[],
  sourceType: string,
): ActivityRecord {
  // CODE calculates — recompute every figure from the deterministic engine,
  // regardless of where identification came from (typed parse or Ingest Agent).
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
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [lastItems, setLastItems] = useState<IdentifiedItem[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const reducedMotion = useReducedMotion()
  const { setIsSnapping, addActivity, openScanWithPhoto } = useStore()

  const showResult = useCallback((items: IdentifiedItem[]) => {
    setLastItems(items)
    setStatus({ kind: 'done' })
  }, [])

  const handleTextSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const text = textInput.trim()
      if (!text) return
      setTextInput('')
      setMode('idle')
      setStatus({ kind: 'working', message: 'AI is reading your activity…' })

      // AI extracts items (infers distances/portions); engine then calculates.
      let items: IdentifiedItem[] = []
      try {
        const res = await fetch('/api/v1/ingest/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
        const data = (await res.json()) as { items?: IdentifiedItem[]; error?: string }
        items = data.items ?? []
      } catch {
        /* network issue — fall through to the offline parser */
      }
      // Fallback: offline lexical parser if AI is unavailable/rate-limited.
      if (!items.length) items = parseText(text)

      if (!items.length) {
        setStatus({
          kind: 'error',
          message: "Couldn't recognise an activity. Try e.g. “chicken biryani 300g” or “Mumbai to Delhi by car”.",
        })
        return
      }
      addActivity(buildActivity(text, items, 'text'))
      showResult(items)
    },
    [textInput, addActivity, showResult],
  )

  const handlePhotoUpload = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        setStatus({ kind: 'error', message: 'Please choose an image (JPEG, PNG, or WebP).' })
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setStatus({ kind: 'error', message: 'Image too large (max 10 MB).' })
        return
      }
      setStatus({ kind: 'idle' })
      // Open the annotated scan overlay with this photo (same view as Snap).
      openScanWithPhoto(file)
    },
    [openScanWithPhoto],
  )

  const spring = { type: 'spring' as const, stiffness: 400, damping: 30 }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Log activity method">
        <NeonButton
          size="sm"
          variant="cyan"
          onClick={() => {
            setMode('idle')
            setIsSnapping(true)
          }}
        >
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
                Describe your activity (e.g. &quot;drove 20km&quot;, &quot;beef burger 200g&quot;)
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

      {/* Status + transparent result */}
      {status.kind === 'working' && (
        <div className="mt-3 flex items-center gap-2 text-sm text-text-secondary" role="status" aria-live="polite">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-neon-cyan/30 border-t-neon-cyan" aria-hidden="true" />
          {status.message}
        </div>
      )}

      {status.kind === 'error' && (
        <p className="mt-3 rounded-lg border border-carbon-high/30 bg-carbon-high/[0.08] px-3 py-2 text-sm text-carbon-high" role="alert">
          {status.message}
        </p>
      )}

      {status.kind === 'done' && lastItems && (
        <div className="mt-3">
          <p className="mb-2 text-sm text-carbon-low">✓ Logged · calculated from DEFRA factors</p>
          <EmissionBreakdown items={lastItems} />
        </div>
      )}
    </div>
  )
}
