import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Clock } from '../src/components/Clock/Clock'

describe('Clock', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('ticks_active_clock_between_server_updates', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)

    render(<Clock color="white" milliseconds={10_000} active={true} />)

    expect(screen.getByText('0:10')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1_250)
    })

    expect(screen.getByText('0:09')).toBeInTheDocument()
  })

  it('does_not_tick_inactive_clock', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)

    render(<Clock color="black" milliseconds={10_000} active={false} />)

    act(() => {
      vi.advanceTimersByTime(2_000)
    })

    expect(screen.getByText('0:10')).toBeInTheDocument()
  })
})
