import { useEffect, useRef, useState } from 'react'
import { gameApi } from '../api/client'
import {
  defaultGameSettings,
  type Color,
  type GameSettings,
  type GameStateDto,
  type MoveRequest,
  type NewGameRequest,
} from '../types/chess'

type UseGameOptions = {
  autoStart?: boolean
  initialSettings?: GameSettings
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds)
  })
}

function requestFromSettings(settings: GameSettings): NewGameRequest {
  return {
    mode: settings.mode,
    human_color: settings.human_color,
    clock: settings.clock,
    engine: settings.engine,
  }
}

function shouldEngineReply(game: GameStateDto): boolean {
  return (
    game.mode === 'human_vs_engine' &&
    game.human_color !== null &&
    game.turn !== game.human_color &&
    !game.game_over
  )
}

function resolveOrientation(settings: GameSettings, game: GameStateDto | null): Color {
  if (settings.orientation === 'auto') {
    return game?.orientation ?? 'white'
  }
  return settings.orientation
}

export function useGame(options: UseGameOptions = {}) {
  const [settings, setSettingsState] = useState<GameSettings>(
    options.initialSettings ?? defaultGameSettings,
  )
  const [game, setGame] = useState<GameStateDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orientation, setOrientation] = useState<Color>(
    resolveOrientation(options.initialSettings ?? defaultGameSettings, null),
  )
  const [selfPlayRunning, setSelfPlayRunning] = useState(false)
  const startedRef = useRef(false)
  const gameRef = useRef<GameStateDto | null>(null)
  const pendingRef = useRef(false)

  useEffect(() => {
    gameRef.current = game
  }, [game])

  useEffect(() => {
    pendingRef.current = pending
  }, [pending])

  async function newGame(nextSettings = settings): Promise<GameStateDto | null> {
    setLoading(true)
    setPending(true)
    setError(null)
    setSelfPlayRunning(false)
    try {
      const created = await gameApi.createGame(requestFromSettings(nextSettings))
      setGame(created)
      setOrientation(resolveOrientation(nextSettings, created))

      if (shouldEngineReply(created)) {
        await delay(200)
        const engineState = await gameApi.engineMove(created.game_id)
        setGame(engineState)
        return engineState
      }

      return created
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create game.')
      return null
    } finally {
      setLoading(false)
      setPending(false)
    }
  }

  useEffect(() => {
    if (options.autoStart === false || startedRef.current) {
      return
    }
    startedRef.current = true
    void newGame(options.initialSettings ?? settings)
    // This effect intentionally runs once for initial game creation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateSettings(nextSettings: GameSettings) {
    setSettingsState(nextSettings)
    setOrientation(resolveOrientation(nextSettings, gameRef.current))
  }

  async function makeMove(move: MoveRequest): Promise<void> {
    if (!gameRef.current) {
      return
    }

    setPending(true)
    setError(null)
    try {
      const moved = await gameApi.move(gameRef.current.game_id, move)
      setGame(moved)

      if (shouldEngineReply(moved)) {
        await delay(200)
        const engineState = await gameApi.engineMove(moved.game_id)
        setGame(engineState)
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Move failed.')
    } finally {
      setPending(false)
    }
  }

  async function engineMoveOnce(): Promise<GameStateDto | null> {
    if (!gameRef.current || gameRef.current.game_over) {
      return gameRef.current
    }

    setPending(true)
    setError(null)
    try {
      const updated = await gameApi.engineMove(gameRef.current.game_id)
      setGame(updated)
      if (updated.game_over) {
        setSelfPlayRunning(false)
      }
      return updated
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Engine move failed.')
      setSelfPlayRunning(false)
      return null
    } finally {
      setPending(false)
    }
  }

  async function undo(): Promise<void> {
    if (!gameRef.current) {
      return
    }
    const plies =
      gameRef.current.mode === 'human_vs_engine' && gameRef.current.move_history.length >= 2 ? 2 : 1
    setPending(true)
    setError(null)
    try {
      const updated = await gameApi.undo(gameRef.current.game_id, plies)
      setGame(updated)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Undo failed.')
    } finally {
      setPending(false)
    }
  }

  async function resign(): Promise<void> {
    if (!gameRef.current) {
      return
    }
    setPending(true)
    setError(null)
    try {
      const color = gameRef.current.human_color ?? gameRef.current.turn
      const updated = await gameApi.resign(gameRef.current.game_id, color)
      setGame(updated)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Resign failed.')
    } finally {
      setPending(false)
    }
  }

  function flipBoard() {
    setOrientation((current) => (current === 'white' ? 'black' : 'white'))
  }

  function startSelfPlay() {
    setSelfPlayRunning(true)
  }

  function pauseSelfPlay() {
    setSelfPlayRunning(false)
  }

  function toggleSelfPlay() {
    setSelfPlayRunning((running) => !running)
  }

  useEffect(() => {
    if (!selfPlayRunning) {
      return
    }

    const timer = window.setInterval(() => {
      const currentGame = gameRef.current
      if (!currentGame || currentGame.game_over) {
        setSelfPlayRunning(false)
        return
      }
      if (pendingRef.current) {
        return
      }
      void engineMoveOnce()
    }, 500)

    return () => window.clearInterval(timer)
  }, [selfPlayRunning])

  return {
    game,
    loading,
    pending,
    error,
    settings,
    orientation,
    selfPlayRunning,
    setSettings: updateSettings,
    newGame,
    makeMove,
    engineMove: engineMoveOnce,
    selfPlayStep: engineMoveOnce,
    undo,
    resign,
    flipBoard,
    startSelfPlay,
    pauseSelfPlay,
    toggleSelfPlay,
  }
}
