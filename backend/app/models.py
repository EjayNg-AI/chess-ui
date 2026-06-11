from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


Color = Literal["white", "black"]
PieceType = Literal["pawn", "knight", "bishop", "rook", "queen", "king"]
PromotionPiece = Literal["q", "r", "b", "n"]
GameMode = Literal["human_vs_engine", "engine_vs_engine", "human_vs_human"]
EngineLimitType = Literal["movetime", "depth"]
GameResultReason = Literal[
    "checkmate",
    "stalemate",
    "insufficient_material",
    "seventyfive_move_rule",
    "fivefold_repetition",
    "fifty_move_claim",
    "threefold_claim",
    "timeout",
    "resignation",
    "draw_agreed",
]


class EngineSettings(BaseModel):
    limit_type: EngineLimitType = "movetime"
    movetime_ms: int = 1000
    depth: int | None = None
    skill_level: int = 20
    threads: int = 1
    hash_mb: int = 64


class ClockSettings(BaseModel):
    enabled: bool = True
    initial_ms: int = 600_000
    increment_ms: int = 0


class NewGameRequest(BaseModel):
    mode: GameMode = "human_vs_engine"
    human_color: Color | Literal["random"] = "white"
    clock: ClockSettings = Field(default_factory=ClockSettings)
    engine: EngineSettings = Field(default_factory=EngineSettings)


class MoveRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_square: str = Field(alias="from")
    to_square: str = Field(alias="to")
    promotion: PromotionPiece | None = None


class UndoRequest(BaseModel):
    plies: int = 1


class ResignRequest(BaseModel):
    color: Color


class PieceDto(BaseModel):
    id: str
    square: str
    color: Color
    type: PieceType


class LastMoveDto(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    uci: str
    san: str
    from_square: str = Field(alias="from")
    to_square: str = Field(alias="to")
    promotion: PromotionPiece | None = None


class MoveHistoryEntry(BaseModel):
    ply: int
    color: Color
    uci: str
    san: str
    fen_after: str


class ClockStateDto(BaseModel):
    enabled: bool
    white_ms: int | None
    black_ms: int | None
    active_color: Color | None
    increment_ms: int


class GameResultDto(BaseModel):
    result: str
    reason: GameResultReason
    winner: Color | None


class GameStateDto(BaseModel):
    game_id: str
    fen: str
    turn: Color
    pieces: list[PieceDto]
    legal_moves: list[str]
    move_history: list[MoveHistoryEntry]
    last_move: LastMoveDto | None
    check: bool
    game_over: bool
    result: GameResultDto | None
    clock: ClockStateDto
    mode: GameMode
    human_color: Color | None
    orientation: Color
