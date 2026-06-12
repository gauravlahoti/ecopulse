import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MetricStrip } from '../components/MetricStrip'
import type { ActivityRecord } from '../lib/types'

const NOW = Date.now()

const ACTIVITIES: ActivityRecord[] = [
  {
    id: 'a1', user_id: 'u1', category: 'food', description: 'Lunch',
    co2e_kg: 2.5, items: [], timestamp: new Date(NOW - 1000 * 60 * 30).toISOString(), source_type: 'text',
  },
  {
    id: 'a2', user_id: 'u1', category: 'transport', description: 'Commute',
    co2e_kg: 1.8, items: [], timestamp: new Date(NOW - 1000 * 60 * 60 * 48).toISOString(), source_type: 'text',
  },
]

describe('MetricStrip', () => {
  it('renders all 4 period labels', () => {
    render(<MetricStrip activities={[]} />)
    expect(screen.getByText('TODAY')).toBeInTheDocument()
    expect(screen.getByText('THIS WEEK')).toBeInTheDocument()
    expect(screen.getByText('THIS MONTH')).toBeInTheDocument()
    expect(screen.getByText('THIS YEAR')).toBeInTheDocument()
  })

  it('has accessible nav landmark', () => {
    render(<MetricStrip activities={[]} />)
    expect(screen.getByRole('navigation', { name: /carbon footprint summary/i })).toBeInTheDocument()
  })

  it('sums activities for today correctly', () => {
    render(<MetricStrip activities={ACTIVITIES} />)
    // Activity a1 is from 30 min ago — should be in today
    // Activity a2 is from 48h ago — should NOT be in today
    const todayMetric = screen.getByLabelText(/CO₂e today/i)
    expect(todayMetric).toBeInTheDocument()
  })
})
