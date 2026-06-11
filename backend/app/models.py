from __future__ import annotations

from typing import Literal

import chess
from pydantic import BaseModel, ConfigDict, Field, field_validator


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
    movetime_ms: int = Field(default=1000, ge=50, le=60_000)
    depth: int | None = Field(default=None, ge=1, le=40)
    skill_level: int = Field(default=20, ge=0, le=20)
    threads: int = Field(default=1, ge=1, le=32)
    hash_mb: int = Field(default=64, ge=1, le=4096)


class ClockSettings(BaseModel):
    enabled: bool = True
    initial_ms: int = Field(default=600_000, ge=1_000, le=86_400_000)
    increment_ms: int = Field(default=0, ge=0, le=60_000)


class NewGameRequest(BaseModel):
    mode: GameMode = "human_vs_engine"
    human_color: Color | Literal["random"] = "white"
    clock: ClockSettings = Field(default_factory=ClockSettings)
    engine: EngineSettings = Field(default_factory=EngineSettings)
    fen: str | None = Field(default=None, max_length=200)

    @field_validator("fen")
    @classmethod
    def validate_fen(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        fen = value.strip()
        try:
            chess.Board(fen)
        except ValueError as exc:
            raise ValueError("Invalid FEN.") from exc
        return fen


class MoveRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_square: str = Field(alias="from", pattern=r"^[a-h][1-8]$")
    to_square: str = Field(alias="to", pattern=r"^[a-h][1-8]$")
    promotion: PromotionPiece | None = None


class UndoRequest(BaseModel):
    plies: int = Field(default=1, ge=1, le=500)


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


class EngineStatusDto(BaseModel):
    available: bool
    path: str | None
    error: str | None


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
