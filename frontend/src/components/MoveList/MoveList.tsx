import type { MoveHistoryEntry } from '../../types/chess'

type MoveListProps = {
  moves: MoveHistoryEntry[]
}

export function MoveList({ moves }: MoveListProps) {
  const rows: { number: number; white?: MoveHistoryEntry; black?: MoveHistoryEntry }[] = []

  moves.forEach((move) => {
    const index = Math.floor((move.ply - 1) / 2)
    if (!rows[index]) {
      rows[index] = { number: index + 1 }
    }
    if (move.color === 'white') {
      rows[index].white = move
    } else {
      rows[index].black = move
    }
  })

  return (
    <section className="panel-section move-list" aria-label="Move list">
      <div className="section-title">Moves</div>
      <div className="move-table">
        {rows.length === 0 ? (
          <div className="empty-row">No moves yet</div>
        ) : (
          rows.map((row) => (
            <div className="move-row" key={row.number}>
              <span className="move-number">{row.number}.</span>
              <span>{row.white?.san ?? ''}</span>
              <span>{row.black?.san ?? ''}</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
