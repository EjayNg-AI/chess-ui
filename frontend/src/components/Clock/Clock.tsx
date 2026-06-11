import type { Color } from '../../types/chess'

type ClockProps = {
  color: Color
  milliseconds: number | null
  active: boolean
}

export function formatClock(milliseconds: number | null): string {
  if (milliseconds === null) {
    return '--:--'
  }
  const safeMs = Math.max(0, milliseconds)
  const totalSeconds = Math.ceil(safeMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function Clock({ color, milliseconds, active }: ClockProps) {
  return (
    <div className={`clock ${active ? 'active' : ''}`} data-color={color}>
      {formatClock(milliseconds)}
    </div>
  )
}
