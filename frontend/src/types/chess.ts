export type Color = 'white' | 'black'
export type PieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king'
export type PromotionPiece = 'q' | 'r' | 'b' | 'n'
export type GameMode = 'human_vs_engine' | 'engine_vs_engine' | 'human_vs_human'
export type EngineLimitType = 'movetime' | 'depth'
export type Orientation = Color
export type OrientationSetting = Color | 'auto'

export type EngineSettings = {
  limit_type: EngineLimitType
  movetime_ms: number
  depth: number | null
  skill_level: number
  threads: number
  hash_mb: number
}

export type ClockSettings = {
  enabled: boolean
  initial_ms: number
  increment_ms: number
}

export type NewGameRequest = {
  mode: GameMode
  human_color: Color | 'random'
  clock: ClockSettings
  engine: EngineSettings
}

export type MoveRequest = {
  from: string
  to: string
  promotion?: PromotionPiece | null
}

export type PieceDto = {
  id: string
  square: string
  color: Color
  type: PieceType
}

export type LastMoveDto = {
  uci: string
  san: string
  from: string
  to: string
  promotion: PromotionPiece | null
}

export type MoveHistoryEntry = {
  ply: number
  color: Color
  uci: string
  san: string
  fen_after: string
}

export type ClockStateDto = {
  enabled: boolean
  white_ms: number | null
  black_ms: number | null
  active_color: Color | null
  increment_ms: number
}

export type GameResultDto = {
  result: string
  reason:
    | 'checkmate'
    | 'stalemate'
    | 'insufficient_material'
    | 'seventyfive_move_rule'
    | 'fivefold_repetition'
    | 'fifty_move_claim'
    | 'threefold_claim'
    | 'timeout'
    | 'resignation'
    | 'draw_agreed'
  winner: Color | null
}

export type GameStateDto = {
  game_id: string
  fen: string
  turn: Color
  pieces: PieceDto[]
  legal_moves: string[]
  move_history: MoveHistoryEntry[]
  last_move: LastMoveDto | null
  check: boolean
  game_over: boolean
  result: GameResultDto | null
  clock: ClockStateDto
  mode: GameMode
  human_color: Color | null
  orientation: Color
}

export type GameSettings = NewGameRequest & {
  orientation: OrientationSetting
}

export const defaultGameSettings: GameSettings = {
  mode: 'human_vs_engine',
  human_color: 'white',
  clock: {
    enabled: true,
    initial_ms: 600_000,
    increment_ms: 0,
  },
  engine: {
    limit_type: 'movetime',
    movetime_ms: 1000,
    depth: null,
    skill_level: 20,
    threads: 1,
    hash_mb: 64,
  },
  orientation: 'auto',
}
