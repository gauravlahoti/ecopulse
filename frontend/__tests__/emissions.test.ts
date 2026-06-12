import { describe, it, expect } from 'vitest'
import {
  calculate,
  scoreItems,
  parseText,
  buildDualForecast,
  lookupFactorKey,
} from '@/lib/emissions'
import type { IdentifiedItem } from '@/lib/types'

describe('calculate — quantity × DEFRA factor', () => {
  it('computes beef per kg with gram→kg conversion', () => {
    const b = calculate('beef', 200, 'g', 'food')
    expect(b.matched).toBe(true)
    expect(b.factorKey).toBe('beef')
    expect(b.factorPerUnit).toBe(27)
    expect(b.normalisedQuantity).toBe(0.2)
    expect(b.co2eKg).toBe(5.4)
  })

  it('computes a car distance in km (no conversion)', () => {
    const b = calculate('car petrol', 1400, 'km', 'transport')
    expect(b.factorKey).toBe('car_petrol_avg')
    expect(b.co2eKg).toBeCloseTo(229.6, 1)
  })

  it('converts ml→litre for drinks', () => {
    const b = calculate('cola', 330, 'ml', 'food')
    expect(b.factorKey).toBe('cola_soft_drink')
    expect(b.co2eKg).toBeCloseTo(0.1023, 4)
  })

  it('does NOT fabricate a factor for unmatched non-food items', () => {
    const b = calculate('plastic action figure', 1, 'item', 'shopping')
    expect(b.matched).toBe(false)
    expect(b.co2eKg).toBe(0)
  })

  it('rejects non-positive quantities', () => {
    expect(calculate('beef', 0, 'g', 'food').matched).toBe(false)
    expect(calculate('beef', -5, 'g', 'food').co2eKg).toBe(0)
  })
})

describe('lookupFactorKey — alias matching', () => {
  it('matches aliases and falls back to a category default for food', () => {
    expect(lookupFactorKey('grilled chicken breast', 'food')).toBe('chicken')
    expect(lookupFactorKey('totally unknown dish', 'food')).toBe('vegetables') // food default proxy
  })

  it('returns null for unknown shopping items (no default)', () => {
    expect(lookupFactorKey('mystery gadget', 'shopping')).toBeNull()
  })
})

describe('scoreItems — totals and swap suggestion', () => {
  const items: IdentifiedItem[] = [
    { name: 'beef', quantity: 200, unit: 'g', category: 'food', confidence: 0.9 },
    { name: 'potatoes', quantity: 150, unit: 'g', category: 'food', confidence: 0.9 },
  ]

  it('sums per-item CO₂e from the engine', () => {
    const r = scoreItems(items)
    expect(r.items).toHaveLength(2)
    expect(r.totalCo2eKg).toBeCloseTo(5.469, 3) // 5.4 + 0.069
  })

  it('suggests a lower-carbon swap for the worst item with an engine-derived %', () => {
    const r = scoreItems(items)
    expect(r.swapSuggestion).toMatch(/plant-based burger/i)
    expect(r.swapSavingPct).toBeGreaterThanOrEqual(80) // beef 27 → plant_burger 3.5 ≈ 87%
  })

  it('returns no swap when nothing is high-impact', () => {
    const r = scoreItems([{ name: 'lettuce', quantity: 30, unit: 'g', category: 'food', confidence: 0.9 }])
    expect(r.swapSuggestion).toBeNull()
  })
})

describe('parseText — offline lexical fallback', () => {
  it('extracts a transport distance with the right unit', () => {
    const items = parseText('drove 20km to work')
    expect(items.length).toBeGreaterThan(0)
    const car = items.find((i) => i.category === 'transport')
    expect(car).toBeDefined()
    expect(car!.unit).toBe('km')
    expect(car!.quantity).toBe(20)
  })

  it('extracts a food item with grams', () => {
    const items = parseText('chicken 250g')
    const food = items.find((i) => i.category === 'food')
    expect(food).toBeDefined()
    expect(food!.unit).toBe('g')
  })
})

describe('buildDualForecast — deterministic projection', () => {
  it('uses the global baseline when there is no history', () => {
    const { current, committed } = buildDualForecast([], [])
    expect(current.monthly_co2e_kg).toHaveLength(12)
    expect(current.total_co2e_kg).toBeCloseTo(440 * 12, 0)
    expect(committed.total_co2e_kg).toBe(current.total_co2e_kg) // no interventions = same
  })

  it('reduces the committed trajectory when interventions are active', () => {
    const { current, committed } = buildDualForecast([], ['plant_meals', 'cycle_2x'])
    expect(committed.total_co2e_kg).toBeLessThan(current.total_co2e_kg)
    expect(committed.vs_baseline_pct).toBeLessThan(0)
  })
})
