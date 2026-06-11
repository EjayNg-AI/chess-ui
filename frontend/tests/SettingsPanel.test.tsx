import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingsPanel } from '../src/components/SettingsPanel/SettingsPanel'
import { defaultGameSettings } from '../src/types/chess'

describe('SettingsPanel', () => {
  it('clamps_numeric_settings_before_reporting_changes', () => {
    const onChange = vi.fn()
    render(<SettingsPanel settings={defaultGameSettings} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText(/move time ms/i), { target: { value: '999999' } })
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        engine: expect.objectContaining({ movetime_ms: 60_000 }),
      }),
    )

    fireEvent.change(screen.getByLabelText(/fixed depth/i), { target: { value: '0' } })
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        engine: expect.objectContaining({ depth: 1 }),
      }),
    )

    fireEvent.change(screen.getByLabelText(/initial minutes/i), { target: { value: '2000' } })
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        clock: expect.objectContaining({ initial_ms: 86_400_000 }),
      }),
    )

    fireEvent.change(screen.getByLabelText(/increment seconds/i), { target: { value: '-5' } })
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        clock: expect.objectContaining({ increment_ms: 0 }),
      }),
    )
  })
})
