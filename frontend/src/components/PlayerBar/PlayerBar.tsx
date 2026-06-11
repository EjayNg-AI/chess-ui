import type { ClockStateDto, Color } from '../../types/chess'
import { Clock } from '../Clock/Clock'

type PlayerBarProps = {
  color: Color
  name: string
  clock: ClockStateDto | null
  active: boolean
}

export function PlayerBar({ color, name, clock, active }: PlayerBarProps) {
  const clockMs = color === 'white' ? clock?.white_ms : clock?.black_ms

  return (
    <div className={`player-bar ${active ? 'active' : ''}`}>
      <div className={`avatar ${color}`} aria-hidden="true">
        {color === 'white' ? 'W' : 'B'}
      </div>
      <div className="player-meta">
        <div className="player-name">{name}</div>
        <div className="player-subtitle">{active ? 'To move' : color}</div>
      </div>
      <Clock color={color} milliseconds={clockMs ?? null} active={active} />
    </div>
  )
}
