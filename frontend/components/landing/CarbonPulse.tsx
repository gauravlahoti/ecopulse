'use client'

import { useEffect, useRef } from 'react'

/**
 * The hero's signature motion — a calm, breathing "carbon pulse" waveform with a
 * soft gradient fill and a few drifting data motes. Pure 2D canvas (no WebGL /
 * post-processing) so it reads as smooth and premium rather than the jittery 3D
 * the earlier design suffered from. Frozen to a static crest under
 * prefers-reduced-motion.
 */
export function CarbonPulse({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvasEl = canvasRef.current
    if (!canvasEl) return
    const context = canvasEl.getContext('2d')
    if (!context) return
    // Non-null aliases so TS keeps the narrowing inside the nested closures below.
    const canvas: HTMLCanvasElement = canvasEl
    const ctx: CanvasRenderingContext2D = context

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 0
    let h = 0
    let raf = 0

    type Mote = { x: number; y: number; r: number; vx: number; phase: number }
    const motes: Mote[] = []

    function resize() {
      const rect = canvas.getBoundingClientRect()
      w = rect.width
      h = rect.height
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (motes.length === 0) {
        for (let i = 0; i < 14; i++) {
          motes.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: 0.8 + Math.random() * 2.2,
            vx: 0.08 + Math.random() * 0.22,
            phase: Math.random() * Math.PI * 2,
          })
        }
      }
    }

    // Layered sine wave — the "pulse". Two stacked waves give it body.
    function waveY(x: number, t: number, baseAmp: number, mid: number): number {
      const k1 = Math.sin(x * 0.012 + t * 0.9) * baseAmp
      const k2 = Math.sin(x * 0.026 - t * 1.4) * baseAmp * 0.45
      const beat = Math.sin(x * 0.06 + t * 2.2) * baseAmp * 0.12
      return mid + k1 + k2 + beat
    }

    function draw(t: number) {
      ctx.clearRect(0, 0, w, h)
      const mid = h * 0.56
      const amp = Math.min(h * 0.16, 64)

      // Area fill under the wave
      const grad = ctx.createLinearGradient(0, mid - amp, 0, h)
      grad.addColorStop(0, 'rgba(0, 245, 212, 0.20)')
      grad.addColorStop(0.5, 'rgba(124, 255, 178, 0.07)')
      grad.addColorStop(1, 'rgba(5, 8, 15, 0)')

      ctx.beginPath()
      ctx.moveTo(0, h)
      for (let x = 0; x <= w; x += 6) ctx.lineTo(x, waveY(x, t, amp, mid))
      ctx.lineTo(w, h)
      ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()

      // Bright stroke on top
      ctx.beginPath()
      for (let x = 0; x <= w; x += 4) {
        const y = waveY(x, t, amp, mid)
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      const stroke = ctx.createLinearGradient(0, 0, w, 0)
      stroke.addColorStop(0, 'rgba(0, 245, 212, 0.65)')
      stroke.addColorStop(0.55, 'rgba(124, 255, 178, 0.95)')
      stroke.addColorStop(1, 'rgba(123, 97, 255, 0.7)')
      ctx.strokeStyle = stroke
      ctx.lineWidth = 2
      ctx.shadowColor = 'rgba(0, 245, 212, 0.55)'
      ctx.shadowBlur = 16
      ctx.stroke()
      ctx.shadowBlur = 0

      // A travelling highlight node riding the crest
      const hx = (t * 60) % w
      const hy = waveY(hx, t, amp, mid)
      ctx.beginPath()
      ctx.arc(hx, hy, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#A8FFE4'
      ctx.shadowColor = 'rgba(0, 245, 212, 0.9)'
      ctx.shadowBlur = 18
      ctx.fill()
      ctx.shadowBlur = 0

      // Drifting motes
      for (const m of motes) {
        m.x += m.vx
        if (m.x > w + 4) m.x = -4
        const yy = m.y + Math.sin(t + m.phase) * 6
        ctx.beginPath()
        ctx.arc(m.x, yy, m.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(124, 255, 178, ${0.18 + (m.r / 3) * 0.22})`
        ctx.fill()
      }
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    if (reduced) {
      draw(0.6) // a single pleasant static frame
    } else {
      let start = 0
      const loop = (now: number) => {
        if (!start) start = now
        draw((now - start) / 1000)
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
}
