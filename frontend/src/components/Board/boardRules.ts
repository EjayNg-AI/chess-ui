import type { PromotionPiece } from '../../types/chess'

export function legalTargetsForSquare(square: string, legalMoves: string[]): string[] {
  return Array.from(
    new Set(
      legalMoves.filter((uci) => uci.slice(0, 2) === square).map((uci) => uci.slice(2, 4)),
    ),
  )
}

export function promotionOptionsForMove(
  from: string,
  to: string,
  legalMoves: string[],
): PromotionPiece[] {
  return legalMoves
    .filter((uci) => uci.slice(0, 2) === from && uci.slice(2, 4) === to && uci.length === 5)
    .map((uci) => uci[4] as PromotionPiece)
}
