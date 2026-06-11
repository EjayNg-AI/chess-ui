import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PromotionModal } from '../src/components/PromotionModal/PromotionModal'

describe('PromotionModal', () => {
  it('renders_available_promotion_options', () => {
    render(<PromotionModal options={['q', 'r', 'b', 'n']} onCancel={vi.fn()} onSelect={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Queen' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rook' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bishop' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Knight' })).toBeInTheDocument()
  })

  it('selecting_queen_calls_onSelect_q', () => {
    const onSelect = vi.fn()
    render(<PromotionModal options={['q', 'r']} onCancel={vi.fn()} onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: 'Queen' }))

    expect(onSelect).toHaveBeenCalledWith('q')
  })

  it('cancel_closes_modal_without_move', () => {
    const onCancel = vi.fn()
    const onSelect = vi.fn()
    render(<PromotionModal options={['q']} onCancel={onCancel} onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalled()
    expect(onSelect).not.toHaveBeenCalled()
  })
})
