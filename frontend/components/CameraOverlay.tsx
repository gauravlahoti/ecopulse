'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { GlassCard } from './ui/GlassCard'
import { NeonButton } from './ui/NeonButton'
import { CarbonBadge } from './ui/CarbonBadge'
import { useStore } from '@/lib/store'
import type { IdentifiedItem } from '@/lib/types'

type CameraOverlayProps = {
  onClose: () => void
}

export function CameraOverlay({ onClose }: CameraOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasCameraAccess, setHasCameraAccess] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [captured, setCaptured] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const reducedMotion = useReducedMotion()

  const {
    streamingItems,
    swapSuggestion,
    swapSavingPct,
    addStreamingItem,
    setSwapSuggestion,
    addActivity,
    clearSnap,
  } = useStore()

  // Request camera
  useEffect(() => {
    let stream: MediaStream | null = null
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((s) => {
        stream = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
        }
        setHasCameraAccess(true)
      })
      .catch(() => setCameraError('Camera access denied — try drag-drop instead'))

    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const handleClose = useCallback(() => {
    clearSnap()
    onClose()
  }, [clearSnap, onClose])

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    canvasRef.current.width = videoRef.current.videoWidth
    canvasRef.current.height = videoRef.current.videoHeight
    ctx.drawImage(videoRef.current, 0, 0)
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9)
    setCaptured(dataUrl)
    runAnalysis()
  }

  function runAnalysis() {
    setAnalyzing(true)
    // Simulate streaming SSE from agent — Sprint 3 replaces with real SSE
    const MOCK_RESULTS: Array<IdentifiedItem & { co2e_kg: number }> = [
      { name: 'Beef burger', quantity: 200, unit: 'g', category: 'food', confidence: 0.94, co2e_kg: 2.8 },
      { name: 'French fries', quantity: 150, unit: 'g', category: 'food', confidence: 0.91, co2e_kg: 0.42 },
      { name: 'Cola drink', quantity: 330, unit: 'ml', category: 'food', confidence: 0.97, co2e_kg: 0.1 },
    ]
    MOCK_RESULTS.forEach((item, i) => {
      setTimeout(() => {
        addStreamingItem(item)
        if (i === MOCK_RESULTS.length - 1) {
          setSwapSuggestion('Try a lentil burger — saves 68% CO₂e per meal', 68)
          setAnalyzing(false)
        }
      }, 800 + i * 600)
    })
  }

  function logActivity(useSwap: boolean) {
    const total = streamingItems.reduce((s, i) => s + i.co2e_kg, 0)
    addActivity({
      id: `snap-${Date.now()}`,
      user_id: 'demo-user',
      category: 'food',
      description: useSwap && swapSuggestion ? swapSuggestion : streamingItems.map((i) => i.name).join(', '),
      co2e_kg: useSwap ? total * (1 - (swapSavingPct ?? 0) / 100) : total,
      items: streamingItems,
      swap_suggestion: swapSuggestion ?? undefined,
      swap_co2e_saving_pct: swapSavingPct ?? undefined,
      timestamp: new Date().toISOString(),
      source_type: 'photo',
    })
    handleClose()
  }

  const totalCo2e = streamingItems.reduce((s, i) => s + i.co2e_kg, 0)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Snap to Carbon — photograph your meal"
      className="fixed inset-0 z-50 bg-space-black/95 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 glass border-b border-white/10">
        <button
          onClick={handleClose}
          className="text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan rounded-lg p-1"
          aria-label="Close camera overlay"
        >
          ✕
        </button>
        <h2 className="font-mono text-carbon-label text-neon-cyan uppercase tracking-widest">
          {analyzing ? 'ANALYSING...' : captured ? 'RESULTS' : 'SNAP TO CARBON'}
        </h2>
        <div className="w-8" aria-hidden="true" />
      </div>

      {/* Camera / capture view */}
      <div className="flex-1 relative overflow-hidden">
        {!captured && (
          <>
            {cameraError ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-text-secondary text-sm text-center px-8">{cameraError}</p>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                aria-label="Camera viewfinder"
              />
            )}

            {/* Scanner frame */}
            {!cameraError && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-64">
                  {/* Corner brackets */}
                  {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((pos) => (
                    <span
                      key={pos}
                      className={`absolute w-8 h-8 border-neon-cyan ${
                        pos === 'top-left' ? 'top-0 left-0 border-t-2 border-l-2' :
                        pos === 'top-right' ? 'top-0 right-0 border-t-2 border-r-2' :
                        pos === 'bottom-left' ? 'bottom-0 left-0 border-b-2 border-l-2' :
                        'bottom-0 right-0 border-b-2 border-r-2'
                      }`}
                      aria-hidden="true"
                    />
                  ))}

                  {/* Scanning beam */}
                  {!reducedMotion && hasCameraAccess && (
                    <motion.div
                      className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-neon-cyan to-transparent"
                      initial={{ top: 0 }}
                      animate={{ top: '100%' }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                      aria-hidden="true"
                    />
                  )}
                </div>
              </div>
            )}

            <p className="absolute bottom-20 inset-x-0 text-center text-text-secondary text-sm">
              Point at meal, receipt, or product
            </p>
          </>
        )}

        {/* Captured photo with results overlay */}
        {captured && (
          <div className="h-full flex flex-col">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={captured}
              alt="Captured meal photo for carbon analysis"
              className="w-full max-h-48 object-cover opacity-60"
            />

            {/* Streaming results */}
            <div className="flex-1 overflow-auto p-4 flex flex-col gap-3">
              <div
                aria-live="polite"
                aria-label="Carbon analysis results"
                className="flex flex-col gap-2"
              >
                <AnimatePresence>
                  {streamingItems.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between glass rounded-lg px-3 py-2 border-l-2 border-neon-cyan/60"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-neon-cyan text-xs" aria-hidden="true">✓</span>
                        <span className="text-text-primary text-sm font-mono">
                          {item.name}
                          <span className="text-text-muted ml-1 text-xs">
                            {item.quantity}{item.unit}
                          </span>
                        </span>
                      </div>
                      <CarbonBadge co2eKg={item.co2e_kg} />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {analyzing && (
                  <div className="relative glass rounded-lg px-3 py-2 overflow-hidden" role="status" aria-label="Identifying items...">
                    <div className="scanning-line" aria-hidden="true" />
                    <span className="text-text-muted text-sm font-mono">Identifying items...</span>
                  </div>
                )}
              </div>

              {/* Swap suggestion */}
              {swapSuggestion && (
                <GlassCard variant="glow-cyan" padding="sm">
                  <div className="flex items-start gap-2 mb-3">
                    <span className="text-xl" aria-hidden="true">💡</span>
                    <div>
                      <p className="text-neon-cyan text-sm font-medium">{swapSuggestion}</p>
                      {swapSavingPct && (
                        <p className="text-text-secondary text-xs mt-0.5">
                          Saves {swapSavingPct}% CO₂e · Total would be{' '}
                          <strong className="text-neon-cyan">
                            {(totalCo2e * (1 - swapSavingPct / 100)).toFixed(2)} kg
                          </strong>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <NeonButton size="sm" variant="solid" onClick={() => logActivity(true)}>
                      Log Swap
                    </NeonButton>
                    <NeonButton size="sm" variant="ghost" onClick={() => logActivity(false)}>
                      Log As-Is ({totalCo2e.toFixed(2)} kg)
                    </NeonButton>
                  </div>
                </GlassCard>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Shutter button */}
      {!captured && hasCameraAccess && (
        <div className="p-6 flex justify-center glass border-t border-white/10">
          <button
            onClick={capturePhoto}
            aria-label="Take photo"
            className="w-16 h-16 rounded-full border-4 border-neon-cyan flex items-center justify-center hover:bg-neon-cyan/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neon-cyan/50 transition-all"
          >
            <span className="w-10 h-10 rounded-full bg-neon-cyan" aria-hidden="true" />
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="sr-only" aria-hidden="true" />
    </div>
  )
}
