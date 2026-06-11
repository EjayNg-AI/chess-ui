export type Orientation = 'white' | 'black'

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

export function indexToSquare(index: number, orientation: Orientation): string {
  if (index < 0 || index > 63) {
    throw new RangeError(`Board index must be between 0 and 63: ${index}`)
  }
  const row = Math.floor(index / 8)
  const col = index % 8
  return rowColToSquare(row, col, orientation)
}

export function squareToIndex(square: string, orientation: Orientation): number {
  const { row, col } = squareToRowCol(square, orientation)
  return row * 8 + col
}

export function squareToRowCol(
  square: string,
  orientation: Orientation,
): { row: number; col: number } {
  const file = square[0]
  const rank = Number(square[1])
  const fileIndex = files.indexOf(file)

  if (fileIndex === -1 || rank < 1 || rank > 8) {
    throw new RangeError(`Invalid square: ${square}`)
  }

  if (orientation === 'white') {
    return {
      row: 8 - rank,
      col: fileIndex,
    }
  }

  return {
    row: rank - 1,
    col: 7 - fileIndex,
  }
}

export function rowColToSquare(row: number, col: number, orientation: Orientation): string {
  if (row < 0 || row > 7 || col < 0 || col > 7) {
    throw new RangeError(`Invalid board coordinates: ${row}, ${col}`)
  }

  if (orientation === 'white') {
    return `${files[col]}${8 - row}`
  }

  return `${files[7 - col]}${row + 1}`
}

export function clientPointToSquare(
  clientX: number,
  clientY: number,
  boardRect: DOMRect,
  orientation: Orientation,
): string | null {
  const x = clientX - boardRect.left
  const y = clientY - boardRect.top

  if (x < 0 || y < 0 || x >= boardRect.width || y >= boardRect.height) {
    return null
  }

  const col = Math.min(7, Math.floor((x / boardRect.width) * 8))
  const row = Math.min(7, Math.floor((y / boardRect.height) * 8))
  return rowColToSquare(row, col, orientation)
}
