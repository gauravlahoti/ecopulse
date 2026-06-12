import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import HomePage from '../app/page'

describe('HomePage smoke test', () => {
  it('renders the EcoPulse brand and a hero heading', () => {
    render(<HomePage />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    // Brand is split across spans (Eco + Pulse); assert the "Pulse" mark renders.
    expect(screen.getAllByText('Pulse').length).toBeGreaterThan(0)
  })

  it('exposes the main landmark as the skip-link target', () => {
    render(<HomePage />)
    // The skip link (in the root layout) points at #main-content; verify the target exists.
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
  })

  it('has a main landmark', () => {
    render(<HomePage />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('has a link to the dashboard', () => {
    render(<HomePage />)
    expect(screen.getByRole('link', { name: /open dashboard/i })).toBeInTheDocument()
  })
})
