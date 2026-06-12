import { describe, it, expect } from 'vitest'
import { calculate, lookupFactorKey, scoreItems } from '@/lib/emissions'
import type { IdentifiedItem } from '@/lib/types'

/**
 * Regression tests for the factor-matching logic. Naive substring matching
 * mis-maps short/overlapping names ("car" → "carrot", "oat milk" → dairy "milk",
 * "chocolate" → "cola"). The engine uses whole-word + longest-alias matching;
 * these tests lock that behaviour in.
 */
describe('lookupFactorKey — whole-word matching (no substring false-positives)', () => {
  it('maps "car" to car_petrol_avg, not "carrot" (vegetables)', () => {
    expect(lookupFactorKey('car', 'transport')).toBe('car_petrol_avg')
  })

  it('maps "oat milk" to plant_milk, not dairy "milk" (longest alias wins)', () => {
    expect(lookupFactorKey('oat milk', 'food')).toBe('plant_milk')
  })

  it('does not map "chocolate" to "cola" (substring overlap)', () => {
    expect(lookupFactorKey('dark chocolate', 'food')).toBe('chocolate')
  })

  it('still matches genuine aliases', () => {
    expect(lookupFactorKey('hamburger', 'food')).toBe('beef')
    expect(lookupFactorKey('tube journey', 'transport')).toBe('train_rail')
    expect(lookupFactorKey('grilled chicken', 'food')).toBe('chicken')
  })

  it('falls back to the category default only when nothing matches', () => {
    expect(lookupFactorKey('mystery dish xyz', 'food')).toBe('vegetables')
    expect(lookupFactorKey('mystery gadget', 'shopping')).toBeNull()
  })
})

describe('calculate — unit handling across categories', () => {
  it('computes energy in kWh', () => {
    const r = calculate('electricity', 10, 'kWh', 'energy')
    expect(r.factorKey).toBe('electricity_uk')
    expect(r.co2eKg).toBeCloseTo(2.12, 2)
  })

  it('treats zero-carbon transport (cycling) as 0', () => {
    const r = calculate('cycling', 20, 'km', 'transport')
    expect(r.co2eKg).toBe(0)
  })

  it('matched flag reflects whether a factor was found', () => {
    expect(calculate('beef', 100, 'g', 'food').matched).toBe(true)
    expect(calculate('plastic toy', 1, 'item', 'shopping').matched).toBe(false)
  })
})

describe('scoreItems — mixed-category totals stay additive', () => {
  it('sums food + transport without cross-contamination', () => {
    const items: IdentifiedItem[] = [
      { name: 'chicken', quantity: 100, unit: 'g', category: 'food', confidence: 0.9 },
      { name: 'car', quantity: 10, unit: 'km', category: 'transport', confidence: 0.9 },
    ]
    const r = scoreItems(items)
    // chicken 0.1kg × 6.9 = 0.69 ; car 10km × 0.164 = 1.64 ; total ≈ 2.33
    expect(r.totalCo2eKg).toBeCloseTo(2.33, 2)
  })
})
