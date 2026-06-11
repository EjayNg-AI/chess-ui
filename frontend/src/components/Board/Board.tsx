import { type CSSProperties, type PointerEvent, useMemo, useRef, useState } from 'react'
import type { LastMoveDto, MoveRequest, PieceDto, PromotionPiece } from '../../types/chess'
import { PromotionModal } from '../PromotionModal/PromotionModal'
import {
  clientPointToSquare,
  indexToSquare,
  squareToRowCol,
  type Orientation,
} from './boardGeometry'
import { legalTargetsForSquare, promotionOptionsForMove } from './boardRules'
import './Board.css'
import { pieceGlyph } from './pieceRendering'

export type BoardProps = {
  pieces: PieceDto[]
  legalMoves: string[]
  lastMove: LastMoveDto | null
  orientation: Orientation
  check: boolean
  turn: 'white' | 'black'
  disabled: boolean
  onMove: (move: MoveRequest) => void
}

type DragState = {
  pieceId: string
  from: string
  x: number
  y: number
}

type PendingPromotion = {
  from: string
  to: string
  options: PromotionPiece[]
}

export function Board({
  pieces,
  legalMoves,
  lastMove,
  orientation,
  check,
  turn,
  disabled,
  onMove,
}: BoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null)
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [dragging, setDragging] = useState<DragState | null>(null)
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null)

  const piecesBySquare = useMemo(() => {
    return new Map(pieces.map((piece) => [piece.square, piece]))
  }, [pieces])

  const activeSource = disabled ? null : (dragging?.from ?? selectedSquare)
  const legalTargets = activeSource ? legalTargetsForSquare(activeSource, legalMoves) : []
  const checkedKingSquare = check
    ? pieces.find((piece) => piece.type === 'king' && piece.color === turn)?.square
    : null

  function startDrag(piece: PieceDto, event: PointerEvent<HTMLButtonElement>) {
    if (disabled || legalTargetsForSquare(piece.square, legalMoves).length === 0) {
      return
    }

    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const squareSize = rect.width / 8
    setSelectedSquare(piece.square)
    setDragging({
      pieceId: piece.id,
      from: piece.square,
      x: event.clientX - rect.left - squareSize / 2,
      y: event.clientY - rect.top - squareSize / 2,
    })
  }

  function selectPiece(piece: PieceDto) {
    if (disabled || legalTargetsForSquare(piece.square, legalMoves).length === 0) {
      return
    }
    setSelectedSquare(piece.square)
  }

  function updateDrag(event: PointerEvent<HTMLDivElement>) {
    if (!dragging) {
      return
    }
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect) {
      return
    }
    const squareSize = rect.width / 8
    setDragging({
      ...dragging,
      x: event.clientX - rect.left - squareSize / 2,
      y: event.clientY - rect.top - squareSize / 2,
    })
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    if (!dragging) {
      return
    }
    const rect = boardRef.current?.getBoundingClientRect()
    const target = rect ? clientPointToSquare(event.clientX, event.clientY, rect, orientation) : null
    const from = dragging.from
    setDragging(null)

    if (!target) {
      return
    }

    const promotionOptions = promotionOptionsForMove(from, target, legalMoves)
    if (promotionOptions.length > 0) {
      setPendingPromotion({ from, to: target, options: promotionOptions })
      return
    }

    const uci = `${from}${target}`
    if (legalMoves.includes(uci)) {
      onMove({ from, to: target, promotion: null })
    }
  }

  function squareClasses(square: string, index: number): string {
    const isLight = (Math.floor(index / 8) + (index % 8)) % 2 === 0
    const classes = ['board-square', isLight ? 'light' : 'dark']
    if (lastMove && (lastMove.from === square || lastMove.to === square)) {
      classes.push('last-move')
    }
    if (!disabled && selectedSquare === square) {
      classes.push('selected')
    }
    if (checkedKingSquare === square) {
      classes.push('in-check')
    }
    return classes.join(' ')
  }

  return (
    <div
      className={`board ${disabled ? 'disabled' : ''}`}
      data-testid="chess-board"
      onPointerMove={updateDrag}
      onPointerUp={finishDrag}
      ref={boardRef}
    >
      <div className="squares-grid" aria-hidden="true">
        {Array.from({ length: 64 }, (_, index) => {
          const square = indexToSquare(index, orientation)
          return (
            <div
              className={squareClasses(square, index)}
              data-square={square}
              data-testid={`square-${square}`}
              key={square}
            />
          )
        })}
      </div>

      <div className="highlights-layer" aria-hidden="true">
        {legalTargets.map((target) => {
          const { row, col } = squareToRowCol(target, orientation)
          const capture = piecesBySquare.has(target)
          return (
            <div
              className={`legal-hint ${capture ? 'capture' : 'quiet'}`}
              data-testid={`hint-${target}`}
              key={`${activeSource}-${target}`}
              style={{
                '--x': `${col * 100}%`,
                '--y': `${row * 100}%`,
              } as CSSProperties}
            />
          )
        })}
      </div>

      <div className="pieces-layer">
        {pieces.map((piece) => {
          const { row, col } = squareToRowCol(piece.square, orientation)
          const isDragging = dragging?.pieceId === piece.id
          const style = isDragging
            ? ({ transform: `translate(${dragging.x}px, ${dragging.y}px)` } as CSSProperties)
            : ({
                '--x': `${col * 100}%`,
                '--y': `${row * 100}%`,
              } as CSSProperties)

          return (
            <button
              aria-label={`${piece.color} ${piece.type} on ${piece.square}`}
              className={`piece ${piece.color} ${isDragging ? 'dragging' : ''}`}
              data-testid={`piece-${piece.id}`}
              key={piece.id}
              onClick={() => selectPiece(piece)}
              onPointerDown={(event) => startDrag(piece, event)}
              style={style}
              type="button"
            >
              {pieceGlyph(piece)}
            </button>
          )
        })}
      </div>

      <div className="coordinates-layer" aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => {
          const fileSquare = indexToSquare(56 + index, orientation)
          return (
            <span
              className="file-coordinate"
              key={`file-${index}`}
              style={{ left: `${index * 12.5}%` }}
            >
              {fileSquare[0]}
            </span>
          )
        })}
        {Array.from({ length: 8 }, (_, index) => {
          const rankSquare = indexToSquare(index * 8, orientation)
          return (
            <span
              className="rank-coordinate"
              key={`rank-${index}`}
              style={{ top: `${index * 12.5}%` }}
            >
              {rankSquare[1]}
            </span>
          )
        })}
      </div>

      {pendingPromotion ? (
        <PromotionModal
          options={pendingPromotion.options}
          onCancel={() => setPendingPromotion(null)}
          onSelect={(promotion) => {
            onMove({
              from: pendingPromotion.from,
              to: pendingPromotion.to,
              promotion,
            })
            setPendingPromotion(null)
          }}
        />
      ) : null}
    </div>
  )
}
