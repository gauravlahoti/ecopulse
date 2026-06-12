import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import HomePage from '../app/page'

describe('HomePage smoke test', () => {
  it('renders the EcoPulse brand name', () => {
    render(<HomePage />)
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/EcoPulse/i)).toBeInTheDocument()
  })

  it('has a skip-to-content link for accessibility', () => {
    render(<HomePage />)
    // The skip link is the first focusable element
    const skipLink = document.querySelector('a[href="#main-content"]')
    expect(skipLink).toBeInTheDocument()
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
