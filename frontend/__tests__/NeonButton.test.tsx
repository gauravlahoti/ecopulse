import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { NeonButton } from '../components/ui/NeonButton'

describe('NeonButton', () => {
  it('renders children', () => {
    render(<NeonButton>Click me</NeonButton>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('fires onClick handler', async () => {
    const handler = vi.fn()
    render(<NeonButton onClick={handler}>Click</NeonButton>)
    await userEvent.click(screen.getByRole('button'))
    expect(handler).toHaveBeenCalledOnce()
  })

  it('is disabled when disabled prop is set', () => {
    render(<NeonButton disabled>Disabled</NeonButton>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('does not fire onClick when disabled', async () => {
    const handler = vi.fn()
    render(<NeonButton disabled onClick={handler}>Disabled</NeonButton>)
    await userEvent.click(screen.getByRole('button'))
    expect(handler).not.toHaveBeenCalled()
  })

  it('applies solid variant styles', () => {
    const { container } = render(<NeonButton variant="solid">Solid</NeonButton>)
    const btn = container.firstChild as HTMLElement
    expect(btn.className).toMatch(/from-neon-cyan/)
  })

  it('renders as a submit button when type="submit"', () => {
    render(<NeonButton type="submit">Submit</NeonButton>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })
})
