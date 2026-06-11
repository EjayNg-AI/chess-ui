import { useEffect, useState } from 'react'

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

export function useDisplayClock(milliseconds: number | null, active: boolean): number | null {
  const [displayMs, setDisplayMs] = useState(milliseconds)

  useEffect(() => {
    let canceled = false
    let interval: number | null = null

    const timeout = window.setTimeout(() => {
      if (canceled) {
        return
      }

      setDisplayMs(milliseconds)
      if (!active || milliseconds === null) {
        return
      }

      const startedAt = Date.now()
      const startingMs = milliseconds
      interval = window.setInterval(() => {
        setDisplayMs(Math.max(0, startingMs - (Date.now() - startedAt)))
      }, 250)
    }, 0)

    return () => {
      canceled = true
      window.clearTimeout(timeout)
      if (interval !== null) {
        window.clearInterval(interval)
      }
    }
  }, [active, milliseconds])

  return displayMs
}
