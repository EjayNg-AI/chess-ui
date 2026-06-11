import type { PieceDto } from '../../types/chess'

const glyphs: Record<PieceDto['color'], Record<PieceDto['type'], string>> = {
  white: {
    king: '♔',
    queen: '♕',
    rook: '♖',
    bishop: '♗',
    knight: '♘',
    pawn: '♙',
  },
  black: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟',
  },
}

export function pieceGlyph(piece: PieceDto): string {
  return glyphs[piece.color][piece.type]
}

export function pieceAssetPath(piece: PieceDto, theme = 'default'): string {
  return `/pieces/${theme}/${piece.color}-${piece.type}.svg`
}
