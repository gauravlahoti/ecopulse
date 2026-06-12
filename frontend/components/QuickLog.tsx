'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { GlassCard } from './ui/GlassCard'
import { NeonButton } from './ui/NeonButton'
import { useStore } from '@/lib/store'
import { useSSEStream } from '@/lib/sse'
import type { AgentStreamEvent } from '@/lib/types'

type Mode = 'idle' | 'camera' | 'text' | 'file'

export function QuickLog() {
  const [mode, setMode] = useState<Mode>('idle')
  const [textInput, setTextInput] = useState('')
  const [isAnalysing, setIsAnalysing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const reducedMotion = useReducedMotion()
  const { setIsSnapping, addActivity, addStreamingItem, setSwapSuggestion, clearSnap } = useStore()
  const { stream, abort } = useSSEStream()

  function handleSnapClick() {
    setMode('camera')
    setIsSnapping(true)
  }

  const handleTextSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    const text = textInput.trim()
    if (!text || isAnalysing) return
    setTextInput('')
    setIsAnalysing(true)

    await stream(
      '/api/v1/ingest/text',
      { body: { text } },
      (event: AgentStreamEvent) => {
        if (event.type === 'item_identified') {
          addStreamingItem({ ...event.item, co2e_kg: event.co2e_kg })
        } else if (event.type === 'swap_suggestion') {
          setSwapSuggestion(event.suggestion, event.saving_pct)
        } else if (event.type === 'activity_complete') {
          addActivity(event.activity)
          clearSnap()
        }
      },
      () => setIsAnalysing(false),
      () => setIsAnalysing(false),
    )
    setMode('idle')
  }, [textInput, isAnalysing, stream, addStreamingItem, setSwapSuggestion, addActivity, clearSnap])

  function handleFileDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  function handleFileUpload(file: File) {
    addActivity({
      id: `opt-${Date.now()}`,
      user_id: 'demo-user',
      category: 'energy',
      description: `Uploaded: ${file.name}`,
      co2e_kg: 0,
      items: [],
      timestamp: new Date().toISOString(),
      source_type: 'pdf',
    })
    setMode('idle')
  }

  const spring = { type: 'spring' as const, stiffness: 400, damping: 30 }

  return (
    <GlassCard padding="md">
      <h2 className="font-mono text-carbon-label text-text-muted uppercase tracking-widest mb-3">
        Quick Log
      </h2>

      {/* Mode buttons */}
      <div className="flex gap-2 mb-3" role="group" aria-label="Log activity method">
        <NeonButton
          size="sm"
          variant={mode === 'camera' ? 'solid' : 'cyan'}
          onClick={handleSnapClick}
          aria-pressed={mode === 'camera'}
        >
          📷 Snap
        </NeonButton>
        <NeonButton
          size="sm"
          variant={mode === 'text' ? 'solid' : 'cyan'}
          onClick={() => { abort(); setMode(mode === 'text' ? 'idle' : 'text') }}
          aria-pressed={mode === 'text'}
          aria-expanded={mode === 'text'}
        >
          ✏ Type
        </NeonButton>
        <NeonButton
          size="sm"
          variant={mode === 'file' ? 'solid' : 'cyan'}
          onClick={() => setMode(mode === 'file' ? 'idle' : 'file')}
          aria-pressed={mode === 'file'}
          aria-expanded={mode === 'file'}
        >
          📄 PDF
        </NeonButton>
      </div>

      {/* Expanding panels */}
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
            <form onSubmit={(e) => { void handleTextSubmit(e) }} className="flex gap-2">
              <label htmlFor="activity-text" className="sr-only">
                Describe your activity (e.g. &quot;drove 20km&quot;, &quot;beef burger&quot;)
              </label>
              <input
                id="activity-text"
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder='e.g. "beef burger lunch" or "drove 20km"'
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/30"
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
              <NeonButton type="submit" size="sm" variant="solid" disabled={!textInput.trim() || isAnalysing}>
                {isAnalysing ? '…' : 'Log'}
              </NeonButton>
            </form>
          </motion.div>
        )}

        {mode === 'file' && (
          <motion.div
            key="file-panel"
            initial={reducedMotion ? {} : { height: 0, opacity: 0 }}
            animate={reducedMotion ? {} : { height: 'auto', opacity: 1 }}
            exit={reducedMotion ? {} : { height: 0, opacity: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            <div
              role="button"
              tabIndex={0}
              aria-label="Drop PDF or image here, or click to browse"
              className="border border-dashed border-neon-cyan/30 rounded-xl p-6 text-center cursor-pointer hover:border-neon-cyan/60 hover:bg-neon-cyan/5 transition-all"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
              }}
            >
              <span className="text-2xl block mb-2" aria-hidden="true">📄</span>
              <p className="text-text-secondary text-sm">Drop utility bill or flight confirmation</p>
              <p className="text-text-muted text-xs mt-1">PDF, JPG, PNG up to 10MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                className="sr-only"
                aria-label="Upload file"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFileUpload(f)
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  )
}
