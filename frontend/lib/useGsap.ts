'use client'

/**
 * GSAP helpers for the EcoPulse redesign.
 *
 * Design constraint (from prior user feedback): motion must read as *calm and
 * purposeful*, never flashy or flickering. Every animation here is:
 *   1. Gated behind prefers-reduced-motion — when reduced, nothing animates and
 *      content is shown in its final state (we use gsap.from, so the resting
 *      state is the authored markup; if JS never runs, content is fully visible).
 *   2. Scoped with gsap.context so it cleanly reverts on unmount (Strict Mode safe).
 */
import { useEffect, useRef, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let registered = false

export function ensureGsap(): void {
  if (!registered && typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger)
    registered = true
  }
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Returns a ref to attach to a section. Any descendant carrying a `data-reveal`
 * attribute fades + rises into place once, when it scrolls into view. Elements
 * sharing a `data-reveal-group` stagger together.
 */
export function useReveal<T extends HTMLElement = HTMLElement>(): RefObject<T | null> {
  const scope = useRef<T>(null)

  useEffect(() => {
    ensureGsap()
    if (prefersReducedMotion() || !scope.current) return

    const ctx = gsap.context(() => {
      const groups = new Map<string, HTMLElement[]>()
      const singles: HTMLElement[] = []

      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        const group = el.dataset.revealGroup
        if (group) {
          const arr = groups.get(group) ?? []
          arr.push(el)
          groups.set(group, arr)
        } else {
          singles.push(el)
        }
      })

      singles.forEach((el) => {
        gsap.from(el, {
          y: 32,
          opacity: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        })
      })

      groups.forEach((els) => {
        const first = els[0]
        if (!first) return
        gsap.from(els, {
          y: 28,
          opacity: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger: 0.1,
          scrollTrigger: { trigger: first, start: 'top 85%', once: true },
        })
      })
    }, scope)

    return () => ctx.revert()
  }, [])

  return scope
}

export { gsap, ScrollTrigger }
