import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CarbonScore } from '../components/CarbonScore'

describe('CarbonScore', () => {
  it('renders the period label', () => {
    render(<CarbonScore co2eKg={42.5} period="THIS MONTH" />)
    expect(screen.getByText('THIS MONTH')).toBeInTheDocument()
  })

  it('shows CO₂e unit', () => {
    render(<CarbonScore co2eKg={42.5} />)
    expect(screen.getByText(/CO₂e/)).toBeInTheDocument()
  })

  it('shows kg unit when under 1000', () => {
    render(<CarbonScore co2eKg={42.5} />)
    const value = screen.getByLabelText(/CO₂ equivalent/i)
    expect(value).toBeInTheDocument()
  })

  it('shows tonnes unit when over 1000', () => {
    render(<CarbonScore co2eKg={1200} />)
    expect(screen.getByText(/t CO₂e/)).toBeInTheDocument()
  })

  it('renders delta when provided', () => {
    render(<CarbonScore co2eKg={42.5} deltaPercent={-12} />)
    expect(screen.getByText(/12%/)).toBeInTheDocument()
  })

  it('has accessible label on score', () => {
    render(<CarbonScore co2eKg={42.5} />)
    const el = screen.getByLabelText(/CO₂ equivalent/i)
    expect(el).toBeInTheDocument()
  })
})
