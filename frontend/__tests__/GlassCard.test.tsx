import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { GlassCard } from '../components/ui/GlassCard'

describe('GlassCard', () => {
  it('renders children', () => {
    render(<GlassCard>Hello World</GlassCard>)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('applies default glass styles', () => {
    const { container } = render(<GlassCard>Content</GlassCard>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toMatch(/glass/)
    expect(el.className).toMatch(/rounded-glass/)
  })

  it('applies glow-cyan variant class', () => {
    const { container } = render(<GlassCard variant="glow-cyan">Content</GlassCard>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toMatch(/neon-cyan/)
  })

  it('forwards html attributes', () => {
    render(<GlassCard data-testid="test-card">Content</GlassCard>)
    expect(screen.getByTestId('test-card')).toBeInTheDocument()
  })
})
