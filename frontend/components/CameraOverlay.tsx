'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { NeonButton } from './ui/NeonButton'
import { EmissionBreakdown } from './EmissionBreakdown'
import { useStore } from '@/lib/store'
import { scoreItems } from '@/lib/emissions'
import type { ActivityRecord, IdentifiedItem } from '@/lib/types'

type Box = [number, number, number, number] // [ymin, xmin, ymax, xmax] normalized 0–1000
type ScannedItem = IdentifiedItem & { co2e_kg: number; box: Box | null }
type Phase = 'camera' | 'analysing' | 'results' | 'error'

const PIN_COLORS = ['#00F5D4', '#7CFFB2', '#FFB800', '#7B61FF', '#FF6B35', '#00C896']

const STAGES: Array<{ key: 'upload' | 'identify' | 'calculate'; label: string }> = [
  { key: 'upload', label: 'Uploading your photo' },
  { key: 'identify', label: 'Gemini AI is recognising items in the image' },
  { key: 'calculate', label: 'Computing CO₂e from DEFRA factors (deterministic engine)' },
]

export function CameraOverlay({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { addActivity, clearSnap, pendingPhoto } = useStore()
  const reducedMotion = useReducedMotion()

  const [hasCamera, setHasCamera] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [captured, setCaptured] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>(pendingPhoto ? 'analysing' : 'camera')
  const [items, setItems] = useState<ScannedItem[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [stage, setStage] = useState<'upload' | 'identify' | 'calculate'>('upload')
  const startedRef = useRef(false)

  const handleClose = useCallback(() => {
    clearSnap()
    onClose()
  }, [clearSnap, onClose])

  const analyse = useCallback(async (blob: Blob) => {
    setPhase('analysing')
    setStage('upload')
    const collected: ScannedItem[] = []
    try {
      const res = await fetch('/api/v1/ingest/image', {
        method: 'POST',
        headers: { 'Content-Type': blob.type || 'image/jpeg' },
        body: await blob.arrayBuffer(),
      })
      if (!res.ok || !res.body) throw new Error(`Ingest failed (${res.status})`)
      setStage('identify') // bytes uploaded; Gemini vision is now reading the image
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let errored: string | null = null
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const t = line.trim()
          if (!t.startsWith('data:')) continue
          const json = t.slice(5).trim()
          if (!json) continue
          try {
            const ev = JSON.parse(json) as
              | { type: 'item_identified'; item: IdentifiedItem; co2e_kg: number; box: Box | null }
              | { type: 'error'; message: string }
              | { type: string }
            if (ev.type === 'item_identified' && 'item' in ev) {
              collected.push({ ...ev.item, co2e_kg: ev.co2e_kg, box: ev.box ?? null })
              setItems([...collected])
              setStage('calculate') // items identified; engine is computing CO₂e
            } else if (ev.type === 'error' && 'message' in ev) {
              errored = ev.message
            }
          } catch {
            /* skip */
          }
        }
      }
      if (errored) throw new Error(errored)
      if (!collected.length) throw new Error('No items identified in the photo.')
      setPhase('results')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Analysis failed.')
      setPhase('error')
    }
  }, [])

  // Init: uploaded photo → analyse immediately; otherwise open the camera.
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    if (pendingPhoto) {
      setCaptured(URL.createObjectURL(pendingPhoto))
      void analyse(pendingPhoto)
      return
    }
    let stream: MediaStream | null = null
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => {
        stream = s
        if (videoRef.current) videoRef.current.srcObject = s
        setHasCamera(true)
      })
      .catch(() => setCameraError('Camera unavailable — use “Upload photo” instead.'))
    return () => stream?.getTracks().forEach((t) => t.stop())
  }, [pendingPhoto, analyse])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && handleClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handleClose])

  const capture = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = video.videoWidth || 1080
    canvas.height = video.videoHeight || 1080
    ctx.drawImage(video, 0, 0)
    setCaptured(canvas.toDataURL('image/jpeg', 0.85))
    canvas.toBlob((blob) => blob && void analyse(blob), 'image/jpeg', 0.85)
  }, [analyse])

  const logActivity = useCallback(
    (useSwap: boolean) => {
      const plain: IdentifiedItem[] = items.map(({ name, quantity, unit, category, confidence }) => ({
        name, quantity, unit, category, confidence,
      }))
      const { totalCo2eKg, swapSuggestion, swapSavingPct } = scoreItems(plain)
      const co2e =
        useSwap && swapSavingPct !== null
          ? Math.round(totalCo2eKg * (1 - swapSavingPct / 100) * 1000) / 1000
          : totalCo2eKg
      const activity: ActivityRecord = {
        id: `act_${Date.now().toString(36)}`,
        user_id: 'demo-user',
        category: plain[0]?.category ?? 'food',
        description: useSwap && swapSuggestion ? swapSuggestion : plain.map((i) => i.name).join(', '),
        co2e_kg: co2e,
        items: plain,
        timestamp: new Date().toISOString(),
        source_type: 'photo',
        ...(swapSuggestion && swapSavingPct !== null
          ? { swap_suggestion: swapSuggestion, swap_co2e_saving_pct: swapSavingPct }
          : {}),
      }
      addActivity(activity)
      handleClose()
    },
    [items, addActivity, handleClose],
  )

  const plain = items.map(({ name, quantity, unit, category, confidence }) => ({
    name, quantity, unit, category, confidence,
  }))
  const { totalCo2eKg, swapSuggestion, swapSavingPct } = scoreItems(plain)
  const headerLabel =
    phase === 'analysing' ? 'ANALYSING…' : phase === 'results' ? 'RESULTS' : phase === 'error' ? 'COULDN’T ANALYSE' : 'SNAP TO CARBON'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Snap to Carbon — photograph your meal"
      className="fixed inset-0 z-50 flex flex-col bg-space-black/95"
    >
      <div className="glass flex items-center justify-between border-b border-white/10 p-4">
        <button
          onClick={handleClose}
          className="rounded-lg p-1 text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan"
          aria-label="Close scan overlay"
        >
          ✕
        </button>
        <h2 className="eyebrow text-neon-cyan">{headerLabel}</h2>
        <div className="w-8" aria-hidden="true" />
      </div>

      <div className="relative flex-1 overflow-y-auto">
        {/* Live camera */}
        {!captured && (
          <>
            {cameraError ? (
              <div className="flex h-full items-center justify-center px-8">
                <p className="text-center text-sm text-text-secondary">{cameraError}</p>
              </div>
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" aria-label="Camera viewfinder" />
            )}
            {!cameraError && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-64 w-64">
                  {['tl', 'tr', 'bl', 'br'].map((p) => (
                    <span
                      key={p}
                      className={`absolute h-8 w-8 border-neon-cyan ${
                        p === 'tl' ? 'left-0 top-0 border-l-2 border-t-2' :
                        p === 'tr' ? 'right-0 top-0 border-r-2 border-t-2' :
                        p === 'bl' ? 'bottom-0 left-0 border-b-2 border-l-2' :
                        'bottom-0 right-0 border-b-2 border-r-2'
                      }`}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>
            )}
            <p className="absolute inset-x-0 bottom-20 text-center text-sm text-text-secondary">
              Point at a meal and tap the shutter
            </p>
          </>
        )}

        {/* Captured + annotated results */}
        {captured && (
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
            {/* Annotated image */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={captured} alt="Your meal, with each identified item highlighted" className="block w-full" />

              {/* Scanning sweep while analysing */}
              {phase === 'analysing' && !reducedMotion && (
                <motion.div
                  className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-neon-cyan to-transparent shadow-[0_0_18px_rgba(0,245,212,0.8)]"
                  initial={{ top: '0%' }}
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  aria-hidden="true"
                />
              )}

              {/* Labeled bounding boxes */}
              {items.map((it, i) => {
                if (!it.box) return null
                const [ymin, xmin, ymax, xmax] = it.box
                const color = PIN_COLORS[i % PIN_COLORS.length]
                const labelOnTop = ymin / 10 > 14
                return (
                  <motion.div
                    key={`${it.name}-${i}`}
                    className="absolute"
                    style={{
                      top: `${ymin / 10}%`,
                      left: `${xmin / 10}%`,
                      width: `${(xmax - xmin) / 10}%`,
                      height: `${(ymax - ymin) / 10}%`,
                    }}
                    initial={reducedMotion ? false : { opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: reducedMotion ? 0 : i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="h-full w-full rounded-lg border-2" style={{ borderColor: color, boxShadow: `0 0 12px ${color}66` }} />
                    <span
                      className={`absolute left-0 whitespace-nowrap rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ${labelOnTop ? '-top-5' : 'top-full mt-1'}`}
                      style={{ background: color, color: '#05080F' }}
                    >
                      {it.name} · {it.co2e_kg < 1 ? `${Math.round(it.co2e_kg * 1000)} g` : `${it.co2e_kg.toFixed(1)} kg`}
                    </span>
                  </motion.div>
                )
              })}
            </div>

            {/* AI pipeline stages — narrates what each step is doing */}
            {phase === 'analysing' && (
              <ol className="flex flex-col gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3" aria-label="Analysis progress">
                {STAGES.map((s, i) => {
                  const current = STAGES.findIndex((x) => x.key === stage)
                  const done = i < current
                  const active = i === current
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

            {/* Identified items (aria-live for SR) */}
            {items.length > 0 && (
              <div aria-live="polite" aria-label="Identified items" className="flex flex-wrap gap-2">
                {items.map((it, i) => (
                  <span
                    key={`chip-${it.name}-${i}`}
                    className="rounded-full border px-2.5 py-1 font-mono text-[11px]"
                    style={{ borderColor: `${PIN_COLORS[i % PIN_COLORS.length]}55`, color: PIN_COLORS[i % PIN_COLORS.length] }}
                  >
                    {it.name} {it.quantity}{it.unit}
                  </span>
                ))}
              </div>
            )}

            {/* Honest error */}
            {phase === 'error' && (
              <div className="rounded-xl border border-carbon-high/30 bg-carbon-high/[0.08] p-4" role="alert">
                <p className="text-sm font-medium text-carbon-high">{errorMsg}</p>
                <div className="mt-3">
                  <NeonButton size="sm" variant="ghost" onClick={handleClose}>Close</NeonButton>
                </div>
              </div>
            )}

            {/* Transparent breakdown + log */}
            {phase === 'results' && items.length > 0 && (
              <>
                <EmissionBreakdown items={plain} />
                {swapSuggestion && (
                  <div className="rounded-xl border border-neon-cyan/25 bg-neon-cyan/[0.06] p-3">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-neon-cyan">
                      <span aria-hidden="true">💡</span> {swapSuggestion}
                    </p>
                    {swapSavingPct !== null && (
                      <p className="mt-0.5 text-xs text-text-secondary">
                        Total would be{' '}
                        <strong className="text-neon-cyan">{(totalCo2eKg * (1 - swapSavingPct / 100)).toFixed(2)} kg</strong>{' '}
                        instead of {totalCo2eKg.toFixed(2)} kg
                      </p>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  {swapSuggestion && (
                    <NeonButton size="sm" variant="solid" onClick={() => logActivity(true)}>Log swap</NeonButton>
                  )}
                  <NeonButton size="sm" variant={swapSuggestion ? 'ghost' : 'solid'} onClick={() => logActivity(false)}>
                    Log as-is ({totalCo2eKg.toFixed(2)} kg)
                  </NeonButton>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Shutter */}
      {!captured && hasCamera && (
        <div className="glass flex justify-center border-t border-white/10 p-6">
          <button
            onClick={capture}
            aria-label="Take photo"
            className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-neon-cyan transition-all hover:bg-neon-cyan/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neon-cyan/50"
          >
            <span className="h-10 w-10 rounded-full bg-neon-cyan" aria-hidden="true" />
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="sr-only" aria-hidden="true" />
    </div>
  )
}
