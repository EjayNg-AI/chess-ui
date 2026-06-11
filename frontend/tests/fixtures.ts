import type {
  Color,
  GameResultDto,
  GameStateDto,
  LastMoveDto,
  MoveHistoryEntry,
  PieceDto,
  PieceType,
} from '../src/types/chess'

const backRank: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook']
const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

function piece(color: Color, type: PieceType, square: string): PieceDto {
  return {
    id: `${color}-${type}-${square}`,
    color,
    type,
    square,
  }
}

export function startingPieces(): PieceDto[] {
  const pieces: PieceDto[] = []
  files.forEach((file, index) => {
    pieces.push(piece('white', backRank[index], `${file}1`))
    pieces.push(piece('white', 'pawn', `${file}2`))
    pieces.push(piece('black', 'pawn', `${file}7`))
    pieces.push(piece('black', backRank[index], `${file}8`))
  })
  return pieces
}

export function lastMove(uci: string, san = uci): LastMoveDto {
  return {
    uci,
    san,
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length === 5 ? (uci[4] as LastMoveDto['promotion']) : null,
  }
}

export function history(uci: string, ply = 1, color: Color = 'white'): MoveHistoryEntry {
  return {
    ply,
    color,
    uci,
    san: uci,
    fen_after: 'fen',
  }
}

export function result(overrides: Partial<GameResultDto> = {}): GameResultDto {
  return {
    result: '1-0',
    reason: 'checkmate',
    winner: 'white',
    ...overrides,
  }
}

export function makeGameState(overrides: Partial<GameStateDto> = {}): GameStateDto {
  return {
    game_id: 'game-1',
    fen: 'startpos',
    turn: 'white',
    pieces: startingPieces(),
    legal_moves: ['e2e3', 'e2e4', 'g1f3', 'g1h3'],
    move_history: [],
    last_move: null,
    check: false,
    game_over: false,
    result: null,
    clock: {
      enabled: true,
      white_ms: 600_000,
      black_ms: 600_000,
      active_color: 'white',
      increment_ms: 0,
    },
    mode: 'human_vs_engine',
    human_color: 'white',
    orientation: 'white',
    ...overrides,
  }
}
