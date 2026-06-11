type ControlsProps = {
  pending: boolean
  selfPlayRunning: boolean
  onNewGame: () => void
  onFlip: () => void
  onUndo: () => void
  onResign: () => void
  onToggleSelfPlay: () => void
  onStep: () => void
  onSettings: () => void
}

export function Controls({
  pending,
  selfPlayRunning,
  onNewGame,
  onFlip,
  onUndo,
  onResign,
  onToggleSelfPlay,
  onStep,
  onSettings,
}: ControlsProps) {
  return (
    <section className="panel-section controls" aria-label="Game controls">
      <button type="button" onClick={onNewGame} disabled={pending}>
        <span aria-hidden="true">+</span>
        New Game
      </button>
      <button type="button" onClick={onFlip} disabled={pending}>
        <span aria-hidden="true">F</span>
        Flip Board
      </button>
      <button type="button" onClick={onUndo} disabled={pending}>
        <span aria-hidden="true">U</span>
        Undo
      </button>
      <button type="button" onClick={onResign} disabled={pending}>
        <span aria-hidden="true">R</span>
        Resign
      </button>
      <button type="button" onClick={onToggleSelfPlay} disabled={pending}>
        <span aria-hidden="true">{selfPlayRunning ? 'P' : 'S'}</span>
        {selfPlayRunning ? 'Pause' : 'Self-Play Start'}
      </button>
      <button type="button" onClick={onStep} disabled={pending}>
        <span aria-hidden="true">1</span>
        Self-Play Step
      </button>
      <button type="button" onClick={onSettings} disabled={pending}>
        <span aria-hidden="true">?</span>
        Settings
      </button>
    </section>
  )
}
