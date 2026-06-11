import type { Color } from '../../types/chess'
import { formatClock, useDisplayClock } from './clockUtils'

type ClockProps = {
  color: Color
  milliseconds: number | null
  active: boolean
}

export function Clock({ color, milliseconds, active }: ClockProps) {
  const displayMs = useDisplayClock(milliseconds, active)

  return (
    <div className={`clock ${active ? 'active' : ''}`} data-color={color}>
      {formatClock(displayMs)}
    </div>
  )
}
