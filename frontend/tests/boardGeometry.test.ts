import { describe, expect, it } from 'vitest'
import {
  clientPointToSquare,
  indexToSquare,
  squareToRowCol,
} from '../src/components/Board/boardGeometry'

const rect = {
  left: 0,
  top: 0,
  width: 800,
  height: 800,
  right: 800,
  bottom: 800,
  x: 0,
  y: 0,
  toJSON: () => ({}),
} as DOMRect

describe('board geometry', () => {
  it('white_orientation_index_mapping', () => {
    expect(indexToSquare(0, 'white')).toBe('a8')
    expect(indexToSquare(7, 'white')).toBe('h8')
    expect(indexToSquare(56, 'white')).toBe('a1')
    expect(indexToSquare(63, 'white')).toBe('h1')
  })

  it('black_orientation_index_mapping', () => {
    expect(indexToSquare(0, 'black')).toBe('h1')
    expect(indexToSquare(7, 'black')).toBe('a1')
    expect(indexToSquare(56, 'black')).toBe('h8')
    expect(indexToSquare(63, 'black')).toBe('a8')
  })

  it('square_to_row_col_white', () => {
    expect(squareToRowCol('a8', 'white')).toEqual({ row: 0, col: 0 })
    expect(squareToRowCol('h1', 'white')).toEqual({ row: 7, col: 7 })
    expect(squareToRowCol('e4', 'white')).toEqual({ row: 4, col: 4 })
  })

  it('square_to_row_col_black', () => {
    expect(squareToRowCol('h1', 'black')).toEqual({ row: 0, col: 0 })
    expect(squareToRowCol('a8', 'black')).toEqual({ row: 7, col: 7 })
  })

  it('client_point_to_square_white', () => {
    expect(clientPointToSquare(50, 50, rect, 'white')).toBe('a8')
    expect(clientPointToSquare(750, 750, rect, 'white')).toBe('h1')
    expect(clientPointToSquare(799, 799, rect, 'white')).toBe('h1')
    expect(clientPointToSquare(-1, 10, rect, 'white')).toBeNull()
    expect(clientPointToSquare(800, 10, rect, 'white')).toBeNull()
    expect(clientPointToSquare(10, 800, rect, 'white')).toBeNull()
    expect(clientPointToSquare(801, 10, rect, 'white')).toBeNull()
  })

  it('client_point_to_square_black', () => {
    expect(clientPointToSquare(50, 50, rect, 'black')).toBe('h1')
    expect(clientPointToSquare(750, 750, rect, 'black')).toBe('a8')
  })
})
