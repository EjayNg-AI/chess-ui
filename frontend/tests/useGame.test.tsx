import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGame } from '../src/hooks/useGame'
import { defaultGameSettings, type GameSettings } from '../src/types/chess'
import { history, lastMove, makeGameState, result as makeResult } from './fixtures'

const mockApi = vi.hoisted(() => ({
  createGame: vi.fn(),
  engineStatus: vi.fn(),
  getGame: vi.fn(),
  move: vi.fn(),
  engineMove: vi.fn(),
  undo: vi.fn(),
  resign: vi.fn(),
}))

vi.mock('../src/api/client', () => ({
  gameApi: mockApi,
}))

function engineVsEngineSettings(): GameSettings {
  return {
    ...defaultGameSettings,
    mode: 'engine_vs_engine',
  }
}

describe('useGame', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    mockApi.engineStatus.mockResolvedValue({ available: true, path: null, error: null })
    mockApi.createGame.mockResolvedValue(makeGameState())
    mockApi.move.mockResolvedValue(makeGameState())
    mockApi.engineMove.mockResolvedValue(makeGameState({ turn: 'black' }))
    mockApi.undo.mockResolvedValue(makeGameState())
    mockApi.resign.mockResolvedValue(makeGameState({ game_over: true }))
  })

  it('creates_game_on_mount', async () => {
    const { result } = renderHook(() => useGame())

    await waitFor(() => expect(result.current.game?.game_id).toBe('game-1'))

    expect(mockApi.createGame).toHaveBeenCalledWith({
      mode: 'human_vs_engine',
      human_color: 'white',
      clock: defaultGameSettings.clock,
      engine: defaultGameSettings.engine,
    })
  })

  it('loads_engine_status_on_mount', async () => {
    renderHook(() => useGame({ autoStart: false }))

    await waitFor(() => expect(mockApi.engineStatus).toHaveBeenCalled())
  })

  it('new_game_sends_manual_fen_when_configured', async () => {
    const settings = {
      ...defaultGameSettings,
      fen: '  7k/4P3/8/8/8/8/8/4K3 w - - 0 1  ',
    }
    const { result } = renderHook(() => useGame({ autoStart: false, initialSettings: settings }))
    await waitFor(() => expect(mockApi.engineStatus).toHaveBeenCalled())

    await act(async () => {
      await result.current.newGame(settings)
    })

    expect(mockApi.createGame).toHaveBeenCalledWith({
      mode: 'human_vs_engine',
      human_color: 'white',
      clock: defaultGameSettings.clock,
      engine: defaultGameSettings.engine,
      fen: '7k/4P3/8/8/8/8/8/4K3 w - - 0 1',
    })
  })

  it('human_move_posts_move_and_updates_state', async () => {
    mockApi.createGame.mockResolvedValue(
      makeGameState({ mode: 'human_vs_human', human_color: 'white' }),
    )
    mockApi.move.mockResolvedValue(
      makeGameState({
        mode: 'human_vs_human',
        turn: 'black',
        last_move: lastMove('e2e4', 'e4'),
        move_history: [history('e2e4')],
      }),
    )
    const { result } = renderHook(() => useGame())
    await waitFor(() => expect(result.current.game).not.toBeNull())

    await act(async () => {
      await result.current.makeMove({ from: 'e2', to: 'e4', promotion: null })
    })

    expect(mockApi.move).toHaveBeenCalledWith('game-1', {
      from: 'e2',
      to: 'e4',
      promotion: null,
    })
    expect(result.current.game?.last_move?.uci).toBe('e2e4')
  })

  it('human_vs_engine_triggers_engine_after_human_move', async () => {
    vi.useFakeTimers()
    mockApi.move.mockResolvedValue(
      makeGameState({
        turn: 'black',
        last_move: lastMove('e2e4', 'e4'),
        move_history: [history('e2e4')],
      }),
    )
    mockApi.engineMove.mockResolvedValue(
      makeGameState({
        turn: 'white',
        move_history: [history('e2e4'), history('e7e5', 2, 'black')],
      }),
    )
    const { result } = renderHook(() => useGame())
    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      const promise = result.current.makeMove({ from: 'e2', to: 'e4', promotion: null })
      await Promise.resolve()
      await vi.advanceTimersByTimeAsync(250)
      await promise
    })

    expect(mockApi.engineMove).toHaveBeenCalledWith('game-1')
    expect(result.current.game?.turn).toBe('white')
  })

  it('does_not_trigger_engine_if_game_over', async () => {
    mockApi.move.mockResolvedValue(
      makeGameState({
        turn: 'black',
        game_over: true,
        result: makeResult({ winner: 'white' }),
      }),
    )
    const { result } = renderHook(() => useGame())
    await waitFor(() => expect(result.current.game).not.toBeNull())

    await act(async () => {
      await result.current.makeMove({ from: 'e2', to: 'e4', promotion: null })
    })

    expect(mockApi.engineMove).not.toHaveBeenCalled()
  })

  it('new_game_as_black_requests_engine_first_move', async () => {
    vi.useFakeTimers()
    const settings = {
      ...defaultGameSettings,
      human_color: 'black' as const,
    }
    mockApi.createGame.mockResolvedValue(
      makeGameState({
        human_color: 'black',
        turn: 'white',
      }),
    )
    mockApi.engineMove.mockResolvedValue(
      makeGameState({
        human_color: 'black',
        turn: 'black',
        move_history: [history('e2e4')],
      }),
    )

    const { result } = renderHook(() => useGame({ initialSettings: settings }))

    await act(async () => {
      await Promise.resolve()
      await vi.advanceTimersByTimeAsync(250)
    })

    expect(mockApi.createGame).toHaveBeenCalled()
    expect(mockApi.engineMove).toHaveBeenCalledWith('game-1')
    expect(result.current.game?.turn).toBe('black')
  })

  it('self_play_step_calls_engine_once', async () => {
    mockApi.createGame.mockResolvedValue(makeGameState({ mode: 'engine_vs_engine', human_color: null }))
    const { result } = renderHook(() =>
      useGame({ initialSettings: engineVsEngineSettings() }),
    )
    await waitFor(() => expect(result.current.game).not.toBeNull())

    await act(async () => {
      await result.current.selfPlayStep()
    })

    expect(mockApi.engineMove).toHaveBeenCalledTimes(1)
  })

  it('self_play_loop_stops_on_game_over', async () => {
    vi.useFakeTimers()
    mockApi.createGame.mockResolvedValue(makeGameState({ mode: 'engine_vs_engine', human_color: null }))
    mockApi.engineMove.mockResolvedValueOnce(
      makeGameState({
        mode: 'engine_vs_engine',
        human_color: null,
        game_over: true,
        result: makeResult({ winner: 'black' }),
      }),
    )
    const { result } = renderHook(() =>
      useGame({ initialSettings: engineVsEngineSettings() }),
    )
    await act(async () => {
      await Promise.resolve()
    })

    act(() => {
      result.current.startSelfPlay()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(550)
      await Promise.resolve()
    })

    expect(result.current.selfPlayRunning).toBe(false)
    expect(mockApi.engineMove).toHaveBeenCalledTimes(1)
  })
})
