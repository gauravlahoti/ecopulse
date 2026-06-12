import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ActivityFeed } from '../components/ActivityFeed'
import type { ActivityRecord } from '../lib/types'

const MOCK_ACTIVITIES: ActivityRecord[] = [
  {
    id: 'a1',
    user_id: 'u1',
    category: 'food',
    description: 'Beef burger',
    co2e_kg: 2.8,
    items: [],
    swap_suggestion: 'Try a lentil burger',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    source_type: 'photo',
  },
  {
    id: 'a2',
    user_id: 'u1',
    category: 'transport',
    description: 'Taxi 8km',
    co2e_kg: 1.6,
    items: [],
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    source_type: 'text',
  },
]

describe('ActivityFeed', () => {
  it('renders activity descriptions', () => {
    render(<ActivityFeed activities={MOCK_ACTIVITIES} />)
    expect(screen.getByText('Beef burger')).toBeInTheDocument()
    expect(screen.getByText('Taxi 8km')).toBeInTheDocument()
  })

  it('shows empty state when no activities', () => {
    render(<ActivityFeed activities={[]} />)
    expect(screen.getByText(/no activities yet/i)).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<ActivityFeed activities={[]} isLoading />)
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
  })

  it('shows swap suggestion when present', () => {
    render(<ActivityFeed activities={MOCK_ACTIVITIES} />)
    expect(screen.getByText('Try a lentil burger')).toBeInTheDocument()
  })

  it('has a live region for feed updates', () => {
    render(<ActivityFeed activities={MOCK_ACTIVITIES} />)
    const liveRegion = document.querySelector('[aria-live]')
    expect(liveRegion).toBeInTheDocument()
  })

  it('renders activity count', () => {
    render(<ActivityFeed activities={MOCK_ACTIVITIES} />)
    expect(screen.getByText('2 logged')).toBeInTheDocument()
  })

  it('activity cards have accessible article roles', () => {
    render(<ActivityFeed activities={MOCK_ACTIVITIES} />)
    const articles = screen.getAllByRole('article')
    expect(articles).toHaveLength(2)
  })
})
