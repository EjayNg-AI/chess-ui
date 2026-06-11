import { fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { Board } from '../src/components/Board/Board'
import { legalTargetsForSquare } from '../src/components/Board/boardRules'
import type { GameStateDto, PieceDto } from '../src/types/chess'
import { lastMove, makeGameState } from './fixtures'

const boardRect = {
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

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: vi.fn(),
  })
})

function renderBoard(state: GameStateDto, onMove = vi.fn(), disabled = false) {
  render(
    <Board
      check={state.check}
      disabled={disabled}
      lastMove={state.last_move}
      legalMoves={state.legal_moves}
      onMove={onMove}
      orientation="white"
      pieces={state.pieces}
      turn={state.turn}
    />,
  )
  vi.spyOn(screen.getByTestId('chess-board'), 'getBoundingClientRect').mockReturnValue(boardRect)
  return onMove
}

function dragPiece(testId: string, targetX: number, targetY: number) {
  const piece = screen.getByTestId(testId)
  const board = screen.getByTestId('chess-board')
  fireEvent.pointerDown(piece, { pointerId: 1, clientX: 450, clientY: 650 })
  fireEvent.pointerMove(board, { pointerId: 1, clientX: targetX, clientY: targetY })
  fireEvent.pointerUp(board, { pointerId: 1, clientX: targetX, clientY: targetY })
}

describe('Board', () => {
  it('renders_64_squares', () => {
    renderBoard(makeGameState())

    expect(screen.getAllByTestId(/^square-/)).toHaveLength(64)
  })

  it('renders_all_starting_pieces', () => {
    renderBoard(makeGameState())

    expect(screen.getAllByTestId(/^piece-/)).toHaveLength(32)
    expect(screen.getByLabelText('white king on e1')).toBeInTheDocument()
    expect(screen.getByLabelText('black king on e8')).toBeInTheDocument()
  })

  it('shows_last_move_highlights', () => {
    renderBoard(makeGameState({ last_move: lastMove('e2e4') }))

    expect(screen.getByTestId('square-e2')).toHaveClass('last-move')
    expect(screen.getByTestId('square-e4')).toHaveClass('last-move')
  })

  it('shows_legal_move_hints_for_selected_piece', () => {
    renderBoard(makeGameState())

    fireEvent.pointerDown(screen.getByTestId('piece-white-pawn-e2'), {
      pointerId: 1,
      clientX: 450,
      clientY: 650,
    })

    expect(screen.getByTestId('hint-e3')).toBeInTheDocument()
    expect(screen.getByTestId('hint-e4')).toBeInTheDocument()
  })

  it('deduplicates_promotion_target_hints', () => {
    expect(legalTargetsForSquare('e7', ['e7e8q', 'e7e8r', 'e7e8b', 'e7e8n'])).toEqual(['e8'])
  })

  it('disabled_board_ignores_click_selection', () => {
    renderBoard(makeGameState(), vi.fn(), true)

    fireEvent.click(screen.getByTestId('piece-white-pawn-e2'))

    expect(screen.getByTestId('square-e2')).not.toHaveClass('selected')
    expect(screen.queryByTestId('hint-e3')).not.toBeInTheDocument()
  })

  it('drag_legal_move_calls_onMove', () => {
    const onMove = renderBoard(makeGameState())

    dragPiece('piece-white-pawn-e2', 450, 450)

    expect(onMove).toHaveBeenCalledWith({ from: 'e2', to: 'e4', promotion: null })
  })

  it('drag_illegal_move_does_not_call_onMove', () => {
    const onMove = renderBoard(makeGameState())

    dragPiece('piece-white-pawn-e2', 450, 350)

    expect(onMove).not.toHaveBeenCalled()
    expect(screen.getByLabelText('white pawn on e2')).toBeInTheDocument()
  })

  it('drag_outside_board_does_not_call_onMove', () => {
    const onMove = renderBoard(makeGameState())

    dragPiece('piece-white-pawn-e2', 850, 450)

    expect(onMove).not.toHaveBeenCalled()
  })

  it('promotion_drag_opens_modal_instead_of_calling_onMove', () => {
    const promotionPawn: PieceDto = {
      id: 'white-pawn-e7',
      color: 'white',
      type: 'pawn',
      square: 'e7',
    }
    const state = makeGameState({
      pieces: [
        promotionPawn,
        { id: 'white-king-e1', color: 'white', type: 'king', square: 'e1' },
        { id: 'black-king-h8', color: 'black', type: 'king', square: 'h8' },
      ],
      legal_moves: ['e7e8q', 'e7e8r', 'e7e8b', 'e7e8n'],
    })
    const onMove = renderBoard(state)

    fireEvent.pointerDown(screen.getByTestId('piece-white-pawn-e7'), {
      pointerId: 1,
      clientX: 450,
      clientY: 150,
    })
    fireEvent.pointerUp(screen.getByTestId('chess-board'), {
      pointerId: 1,
      clientX: 450,
      clientY: 50,
    })

    expect(screen.getByRole('dialog', { name: 'Choose promotion' })).toBeInTheDocument()
    expect(onMove).not.toHaveBeenCalled()
  })
})
