/**
 * EcoPulse deterministic emissions engine (TypeScript port).
 *
 * THE GOLDEN RULE — the model identifies and classifies; THIS CODE calculates.
 * Every CO₂e number shown to the user is `quantity × DEFRA factor`, computed
 * here from the bundled DEFRA 2024 table — never invented by an LLM. Each result
 * carries a full breakdown so the UI can show exactly how the number was derived.
 *
 * Mirrors services/agents/ecopulse_agents/emissions/engine.py (same factor file).
 */
import factorsRaw from './defra_2024.json'
import type { ActivityCategory, ForecastScenario, IdentifiedItem } from '../types'

type RawEntry = { co2e_per_unit: number; unit: string; aliases: string[] }
type Meta = { source: string; version: string; url: string; notes: string }

export type FactorEntry = RawEntry & { key: string; categoryGroup: string }

/** Per-item transparent calculation breakdown. */
export type Breakdown = {
  name: string
  category: ActivityCategory
  inputQuantity: number
  inputUnit: string
  /** Quantity converted into the factor's native unit (e.g. 200 g → 0.2 kg). */
  normalisedQuantity: number
  factorKey: string | null
  factorLabel: string
  factorPerUnit: number
  factorUnit: string
  co2eKg: number
  matched: boolean
}

export type ScoreResult = {
  items: Array<IdentifiedItem & { co2e_kg: number; breakdown: Breakdown }>
  totalCo2eKg: number
  swapSuggestion: string | null
  swapSavingPct: number | null
}

export const DEFRA_META: Meta = (factorsRaw as Record<string, unknown>)._meta as Meta

// Swap map: high-impact key → [lower-impact key, label]
const SWAPS: Record<string, [string, string]> = {
  beef: ['plant_burger', 'Try a lentil/plant-based burger'],
  lamb: ['chicken', 'Try chicken instead of lamb'],
  pork: ['chicken', 'Try chicken instead of pork'],
  butter: ['olive_oil', 'Use olive oil instead of butter'],
  cheese: ['legumes', 'Try hummus or a legume-based spread'],
  shrimp_prawns: ['legumes', 'Try tofu or legumes instead of shrimp'],
  car_petrol_avg: ['cycling', 'Cycle or take the train instead'],
  car_diesel_avg: ['train_rail', 'Take the train instead of driving'],
  flight_domestic: ['train_rail', 'Take the train — far less CO₂e'],
  flight_short_haul: ['train_rail', 'Consider rail for short-haul trips'],
  milk: ['plant_milk', 'Swap dairy milk for oat milk'],
  cream: ['plant_milk', 'Use oat cream instead'],
  chocolate: ['fruit', 'Try fresh fruit as a lower-carbon snack'],
  coffee: ['tea', 'Green tea has a lower footprint than coffee'],
}

const UNIT_TO_KG: Record<string, number> = {
  kg: 1, g: 0.001, mg: 0.000001,
  litre: 1, l: 1, ml: 0.001,
  item: 1, km: 1, m: 0.001, pax_km: 1, kwh: 1,
}

// Last-resort proxy when an item's name doesn't alias-match any factor. Only for
// the categories where a generic proxy is defensible; otherwise the item is left
// unmatched (co2e 0, shown as "no factor matched") rather than fabricating a number
// for things like toys or unknown goods.
const CATEGORY_DEFAULTS: Record<string, string> = {
  food: 'vegetables',
  transport: 'car_petrol_avg',
  energy: 'electricity_uk',
}

let FLAT: Record<string, FactorEntry> | null = null

export function loadFactors(): Record<string, FactorEntry> {
  if (FLAT) return FLAT
  const flat: Record<string, FactorEntry> = {}
  for (const [group, entries] of Object.entries(factorsRaw as Record<string, unknown>)) {
    if (group.startsWith('_')) continue
    for (const [key, val] of Object.entries(entries as Record<string, RawEntry>)) {
      flat[key] = { ...val, key, categoryGroup: group }
    }
  }
  FLAT = flat
  return flat
}

/** Human-readable label for a factor key, e.g. car_petrol_avg → "Car (petrol)". */
export function factorLabel(key: string): string {
  const map: Record<string, string> = {
    car_petrol_avg: 'Car · petrol',
    car_diesel_avg: 'Car · diesel',
    car_hybrid: 'Car · hybrid',
    car_electric: 'Car · electric',
    train_rail: 'Train / rail',
    taxi_ride_hail: 'Taxi / ride-hail',
    flight_domestic: 'Flight · domestic',
    flight_short_haul: 'Flight · short-haul',
    flight_long_haul: 'Flight · long-haul',
    ferry_car: 'Ferry',
    electricity_uk: 'UK grid electricity',
    natural_gas: 'Natural gas',
    heating_oil: 'Heating oil',
    renewable_electricity: 'Renewable electricity',
    cola_soft_drink: 'Cola / soft drink',
    plant_burger: 'Plant-based burger',
    plant_milk: 'Plant milk',
    shrimp_prawns: 'Shrimp / prawns',
    fish_wild: 'Fish (wild)',
    fish_farmed: 'Fish (farmed)',
    clothing_tshirt: 'T-shirt',
    clothing_jeans: 'Jeans',
    clothing_jacket: 'Jacket',
    clothing_shoes: 'Shoes',
  }
  if (map[key]) return map[key]
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
}

function normaliseUnit(value: number, unit: string): number {
  return value * (UNIT_TO_KG[unit.toLowerCase().trim()] ?? 1)
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Find the best matching factor key for an item name.
 * Matches aliases on WORD BOUNDARIES (so "cola" no longer matches "choCOLAte" and
 * "tea" no longer matches "sTEAk"), preferring the longest matching alias, then
 * falls back to a category default. Exact key match always wins first.
 */
export function lookupFactorKey(name: string, category: string): string | null {
  const factors = loadFactors()
  const n = name.toLowerCase().trim()
  if (factors[n]) return n

  let best: { key: string; len: number } | null = null
  for (const [key, entry] of Object.entries(factors)) {
    for (const alias of entry.aliases) {
      const re = new RegExp(`\\b${escapeRegExp(alias)}\\b`)
      if (re.test(n) && (!best || alias.length > best.len)) best = { key, len: alias.length }
    }
  }
  if (best) return best.key
  return CATEGORY_DEFAULTS[category] ?? null
}

/** Calculate kg CO₂e for one item, returning the full transparent breakdown. */
export function calculate(
  name: string,
  quantity: number,
  unit: string,
  category: ActivityCategory,
): Breakdown {
  const factors = loadFactors()
  const key = Number.isFinite(quantity) && quantity > 0 ? lookupFactorKey(name, category) : null
  const entry = key ? factors[key] : undefined

  if (!entry) {
    return {
      name, category, inputQuantity: quantity, inputUnit: unit,
      normalisedQuantity: 0, factorKey: null, factorLabel: 'No factor matched',
      factorPerUnit: 0, factorUnit: '—', co2eKg: 0, matched: false,
    }
  }

  const normalised = normaliseUnit(quantity, unit)
  const co2e = Math.round(normalised * entry.co2e_per_unit * 10000) / 10000
  return {
    name,
    category,
    inputQuantity: quantity,
    inputUnit: unit,
    normalisedQuantity: Math.round(normalised * 10000) / 10000,
    factorKey: key,
    factorLabel: factorLabel(key!),
    factorPerUnit: entry.co2e_per_unit,
    factorUnit: entry.unit,
    co2eKg: co2e,
    matched: true,
  }
}

/** Score a list of identified items: per-item breakdown, total, and a swap suggestion. */
export function scoreItems(items: IdentifiedItem[]): ScoreResult {
  const factors = loadFactors()
  const enriched = items.map((it) => {
    const breakdown = calculate(it.name, it.quantity, it.unit, it.category)
    return { ...it, co2e_kg: breakdown.co2eKg, breakdown }
  })
  const total = Math.round(enriched.reduce((s, i) => s + i.co2e_kg, 0) * 1000) / 1000

  let swapSuggestion: string | null = null
  let swapSavingPct: number | null = null
  if (enriched.length) {
    const worst = enriched.reduce((a, b) => (b.co2e_kg > a.co2e_kg ? b : a))
    if (worst.co2e_kg > 0.1 && worst.breakdown.factorKey) {
      const swap = SWAPS[worst.breakdown.factorKey]
      if (swap && factors[swap[0]]) {
        const orig = factors[worst.breakdown.factorKey]!.co2e_per_unit
        const repl = factors[swap[0]]!.co2e_per_unit
        if (orig > 0) {
          const pct = Math.round((1 - repl / orig) * 1000) / 10
          if (pct >= 5) {
            swapSavingPct = pct
            swapSuggestion = `${swap[1]} — saves ${Math.round(pct)}% CO₂e`
          }
        }
      }
    }
  }

  return { items: enriched, totalCo2eKg: total, swapSuggestion, swapSavingPct }
}

// ── Free-text parser ────────────────────────────────────────────────────────
// Turns "drove 20km and ate a 200g beef burger" into IdentifiedItems. Purely
// lexical (quantity regex + alias match) so it stays transparent and offline.

const UNIT_ALIASES: Record<string, string> = {
  g: 'g', gram: 'g', grams: 'g', gm: 'g',
  kg: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg',
  ml: 'ml', l: 'l', litre: 'litre', litres: 'litre', liter: 'litre', liters: 'litre',
  km: 'km', kilometre: 'km', kilometres: 'km', kilometer: 'km', kilometers: 'km',
  mile: 'km', miles: 'km', // approximate miles→km handled below
  kwh: 'kwh', kw: 'kwh',
}

function categoryOf(key: string): ActivityCategory {
  const factors = loadFactors()
  const group = factors[key]?.categoryGroup
  if (group === 'food' || group === 'transport' || group === 'energy' || group === 'shopping') {
    return group
  }
  return 'other'
}

/** Sensible default unit + quantity for a factor when the text omits them. */
function defaultsFor(unit: string): { quantity: number; unit: string } {
  switch (unit) {
    case 'kg': return { quantity: 200, unit: 'g' } // a typical portion
    case 'litre': return { quantity: 330, unit: 'ml' }
    case 'km': return { quantity: 10, unit: 'km' }
    case 'kWh': return { quantity: 10, unit: 'kwh' }
    case 'item': return { quantity: 1, unit: 'item' }
    default: return { quantity: 1, unit: 'item' }
  }
}

export function parseText(text: string): IdentifiedItem[] {
  const factors = loadFactors()
  const lower = ` ${text.toLowerCase()} `
  const fragments = lower.split(/,|\band\b|\bwith\b|\bplus\b|;|\+/)
  const items: IdentifiedItem[] = []
  const usedKeys = new Set<string>()

  for (const frag of fragments) {
    // find a factor whose alias appears in this fragment
    let matchKey: string | null = null
    let matchAliasLen = 0
    for (const [key, entry] of Object.entries(factors)) {
      for (const alias of entry.aliases) {
        if (frag.includes(alias) && alias.length > matchAliasLen) {
          matchKey = key
          matchAliasLen = alias.length
        }
      }
    }
    if (!matchKey || usedKeys.has(matchKey)) continue
    usedKeys.add(matchKey)

    const entry = factors[matchKey]!
    // quantity + unit, e.g. "200g", "1.5 kg", "20 km"
    const qtyMatch = frag.match(/(\d+(?:\.\d+)?)\s*(kg|kilograms?|kilos?|g|grams?|gm|ml|litres?|liters?|l|km|kilometres?|kilometers?|miles?|mile|kwh|kw)?/)
    let quantity: number
    let unit: string
    if (qtyMatch && qtyMatch[1]) {
      quantity = parseFloat(qtyMatch[1])
      const rawUnit = qtyMatch[2] ? UNIT_ALIASES[qtyMatch[2]] ?? entry.unit : null
      if (rawUnit) {
        unit = rawUnit
        if (/mile/.test(qtyMatch[2] ?? '')) quantity = Math.round(quantity * 1.609 * 10) / 10
      } else {
        // bare number — treat as count of the default portion
        const d = defaultsFor(entry.unit)
        quantity = quantity * d.quantity
        unit = d.unit
      }
    } else {
      const d = defaultsFor(entry.unit)
      quantity = d.quantity
      unit = d.unit
    }

    items.push({
      name: factorLabel(matchKey),
      quantity,
      unit,
      category: categoryOf(matchKey),
      confidence: 0.85,
    })
  }

  return items
}

// ── Deterministic 12-month forecast (Parallel-You Simulator) ────────────────
// Mirrors engine.py project_trajectory / build_dual_forecast.

const INTERVENTION_SAVINGS: Record<string, number> = {
  cycle_2x: 0.08,
  plant_meals: 0.12,
  no_short_haul: 0.15,
  solar_tariff: 0.06,
}
const GLOBAL_MONTHLY_AVG_KG = 440

function projectTrajectory(baselineMonthly: number, interventions: string[], months = 12): number[] {
  let totalReduction = 1
  for (const k of interventions) totalReduction *= 1 - (INTERVENTION_SAVINGS[k] ?? 0)
  const out: number[] = []
  for (let m = 0; m < months; m++) {
    const adoption = Math.min(1, (m + 1) / 3)
    const eff = 1 - (1 - totalReduction) * adoption
    out.push(Math.round(baselineMonthly * eff * 100) / 100)
  }
  return out
}

function baselineMonthlyAvg(history: Array<{ co2e_kg: number; timestamp: string }>): number {
  if (!history.length) return GLOBAL_MONTHLY_AVG_KG
  const monthly = new Map<string, number>()
  for (const a of history) {
    const d = new Date(a.timestamp)
    if (Number.isNaN(d.getTime())) continue
    const key = `${d.getFullYear()}-${d.getMonth()}`
    monthly.set(key, (monthly.get(key) ?? 0) + a.co2e_kg)
  }
  if (!monthly.size) return GLOBAL_MONTHLY_AVG_KG
  const recent = [...monthly.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).slice(-3).map(([, v]) => v)
  const avg = recent.reduce((s, v) => s + v, 0) / recent.length
  return avg < 50 ? Math.round(((avg + GLOBAL_MONTHLY_AVG_KG) / 2) * 100) / 100 : Math.round(avg * 100) / 100
}

function scenario(baseline: number, interventions: string[], id: string, label: string): ForecastScenario {
  const monthly = projectTrajectory(baseline, interventions)
  const total = Math.round(monthly.reduce((s, v) => s + v, 0) * 100) / 100
  const baselineTotal = Math.round(baseline * 12 * 100) / 100
  const vs = Math.round(((total - baselineTotal) / Math.max(baselineTotal, 0.001)) * 1000) / 10
  return {
    scenario_id: id,
    label,
    interventions,
    monthly_co2e_kg: monthly as ForecastScenario['monthly_co2e_kg'],
    total_co2e_kg: total,
    vs_baseline_pct: vs,
  }
}

/** Deterministic dual forecast — the same math the agent's tool runs, available offline. */
export function buildDualForecast(
  history: Array<{ co2e_kg: number; timestamp: string }>,
  interventions: string[],
): { current: ForecastScenario; committed: ForecastScenario } {
  const baseline = baselineMonthlyAvg(history)
  const valid = interventions.filter((k) => k in INTERVENTION_SAVINGS)
  return {
    current: scenario(baseline, [], 'current_baseline', 'Current You'),
    committed: scenario(baseline, valid, `committed_${valid.join('_') || 'none'}`, 'Committed You'),
  }
}
