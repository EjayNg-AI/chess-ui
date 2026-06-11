import { useState } from 'react'
import './App.css'
import { Board } from './components/Board/Board'
import { Controls } from './components/Controls/Controls'
import { MoveList } from './components/MoveList/MoveList'
import { PlayerBar } from './components/PlayerBar/PlayerBar'
import { SettingsPanel } from './components/SettingsPanel/SettingsPanel'
import { useGame } from './hooks/useGame'
import type { Color } from './types/chess'

function opposite(color: Color): Color {
  return color === 'white' ? 'black' : 'white'
}

function playerName(color: Color, mode: string, humanColor: Color | null): string {
  if (mode === 'engine_vs_engine') {
    return color === 'white' ? 'Engine White' : 'Engine Black'
  }
  if (mode === 'human_vs_human') {
    return color === 'white' ? 'White' : 'Black'
  }
  return humanColor === color ? 'You' : 'Stockfish'
}

function resultText(game: ReturnType<typeof useGame>['game']): string {
  if (!game) {
    return 'Starting game'
  }
  if (game.result) {
    if (game.result.winner) {
      return `${game.result.winner} wins by ${game.result.reason.replaceAll('_', ' ')}`
    }
    return `Draw by ${game.result.reason.replaceAll('_', ' ')}`
  }
  return `${game.turn} to move`
}

function App() {
  const gameController = useGame()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const game = gameController.game
  const usesEngine = gameController.settings.mode !== 'human_vs_human'
  const engineUnavailable =
    usesEngine &&
    gameController.engineStatus !== null &&
    gameController.engineStatus.available === false
  const topColor = opposite(gameController.orientation)
  const bottomColor = gameController.orientation
  const boardDisabled =
    gameController.pending ||
    gameController.loading ||
    !game ||
    game.game_over ||
    (game.mode === 'human_vs_engine' && game.human_color !== game.turn) ||
    game.mode === 'engine_vs_engine'

  return (
    <main className="app-shell">
      <section className="game-column" aria-label="Chess board">
        <PlayerBar
          active={Boolean(game && game.turn === topColor && !game.game_over)}
          clock={game?.clock ?? null}
          color={topColor}
          name={playerName(topColor, game?.mode ?? 'human_vs_engine', game?.human_color ?? 'white')}
        />

        <div className="board-frame">
          {game ? (
            <Board
              check={game.check}
              disabled={boardDisabled}
              lastMove={game.last_move}
              legalMoves={game.legal_moves}
              onMove={(move) => void gameController.makeMove(move)}
              orientation={gameController.orientation}
              pieces={game.pieces}
              turn={game.turn}
            />
          ) : (
            <div className="board-placeholder">Loading</div>
          )}
        </div>

        <PlayerBar
          active={Boolean(game && game.turn === bottomColor && !game.game_over)}
          clock={game?.clock ?? null}
          color={bottomColor}
          name={playerName(bottomColor, game?.mode ?? 'human_vs_engine', game?.human_color ?? 'white')}
        />
      </section>

      <aside className="side-panel" aria-label="Game panel">
        <div className="status-strip">
          <span className="status-label">Local Chess</span>
          <strong>{resultText(game)}</strong>
          {engineUnavailable ? (
            <p className="warning-text">
              Stockfish unavailable
              {gameController.engineStatus?.error ? `: ${gameController.engineStatus.error}` : ''}
            </p>
          ) : null}
          {gameController.error ? <p className="error-text">{gameController.error}</p> : null}
        </div>

        <Controls
          onFlip={gameController.flipBoard}
          onNewGame={() => void gameController.newGame()}
          onResign={() => void gameController.resign()}
          onSettings={() => setSettingsOpen((open) => !open)}
          onStep={() => void gameController.selfPlayStep()}
          onToggleSelfPlay={gameController.toggleSelfPlay}
          onUndo={() => void gameController.undo()}
          pending={gameController.pending || gameController.loading}
          selfPlayRunning={gameController.selfPlayRunning}
        />

        <MoveList moves={game?.move_history ?? []} />

        {settingsOpen ? (
          <SettingsPanel settings={gameController.settings} onChange={gameController.setSettings} />
        ) : null}
      </aside>
    </main>
  )
}

export default App
