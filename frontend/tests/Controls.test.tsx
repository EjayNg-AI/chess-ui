import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Controls } from '../src/components/Controls/Controls'

function renderControls(overrides = {}) {
  const props = {
    pending: false,
    selfPlayRunning: false,
    onNewGame: vi.fn(),
    onFlip: vi.fn(),
    onUndo: vi.fn(),
    onResign: vi.fn(),
    onToggleSelfPlay: vi.fn(),
    onStep: vi.fn(),
    onSettings: vi.fn(),
    ...overrides,
  }
  render(<Controls {...props} />)
  return props
}

describe('Controls', () => {
  it('new_game_button_calls_onNewGame', () => {
    const props = renderControls()
    fireEvent.click(screen.getByRole('button', { name: /new game/i }))
    expect(props.onNewGame).toHaveBeenCalled()
  })

  it('flip_button_calls_onFlip', () => {
    const props = renderControls()
    fireEvent.click(screen.getByRole('button', { name: /flip board/i }))
    expect(props.onFlip).toHaveBeenCalled()
  })

  it('undo_button_calls_onUndo', () => {
    const props = renderControls()
    fireEvent.click(screen.getByRole('button', { name: /undo/i }))
    expect(props.onUndo).toHaveBeenCalled()
  })

  it('resign_button_calls_onResign', () => {
    const props = renderControls()
    fireEvent.click(screen.getByRole('button', { name: /resign/i }))
    expect(props.onResign).toHaveBeenCalled()
  })

  it('self_play_start_pause_toggles', () => {
    const props = renderControls()
    fireEvent.click(screen.getByRole('button', { name: /self-play start/i }))
    expect(props.onToggleSelfPlay).toHaveBeenCalled()
  })

  it('self_play_step_calls_onStep', () => {
    const props = renderControls()
    fireEvent.click(screen.getByRole('button', { name: /self-play step/i }))
    expect(props.onStep).toHaveBeenCalled()
  })

  it('settings_button_opens_settings', () => {
    const props = renderControls()
    fireEvent.click(screen.getByRole('button', { name: /settings/i }))
    expect(props.onSettings).toHaveBeenCalled()
  })

  it('controls_disabled_when_pending', () => {
    renderControls({ pending: true })
    screen.getAllByRole('button').forEach((button) => {
      expect(button).toBeDisabled()
    })
  })
})
