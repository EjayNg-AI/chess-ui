from __future__ import annotations

import random
import time
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime

import chess

from .clock_service import ClockService, ClockState, opposite_color
from .errors import (
    EngineReturnedIllegalMoveError,
    EngineUnavailableError,
    GameAlreadyOverError,
    GameNotFoundError,
    IllegalMoveError,
    InvalidFenError,
    InvalidUndoError,
)
from .models import (
    ClockStateDto,
    Color,
    EngineSettings,
    ClockSettings,
    GameResultDto,
    GameStateDto,
    LastMoveDto,
    MoveHistoryEntry,
    MoveRequest,
    NewGameRequest,
    PieceDto,
    PieceType,
)
from .stockfish_service import EngineProtocol


PIECE_NAMES: dict[int, PieceType] = {
    chess.PAWN: "pawn",
    chess.KNIGHT: "knight",
    chess.BISHOP: "bishop",
    chess.ROOK: "rook",
    chess.QUEEN: "queen",
    chess.KING: "king",
}


@dataclass
class GameSnapshot:
    fen: str
    piece_ids_by_square: dict[int, str]
    move_history: list[MoveHistoryEntry]
    clock: ClockState
    result: GameResultDto | None
    last_move: LastMoveDto | None


@dataclass
class GameRecord:
    game_id: str
    board: chess.Board
    piece_ids_by_square: dict[int, str]
    move_history: list[MoveHistoryEntry]
    undo_stack: list[GameSnapshot]
    clock: ClockState
    mode: str
    human_color: Color | None
    orientation: Color
    engine_settings: EngineSettings
    clock_settings: ClockSettings
    starting_fen: str | None
    clock_service: ClockService
    result: GameResultDto | None = None
    last_move: LastMoveDto | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = field(default_factory=lambda: datetime.now(UTC))


class GameService:
    def __init__(
        self,
        engine_service: EngineProtocol | None = None,
        clock_service: ClockService | None = None,
    ):
        self.engine_service = engine_service
        self.clock_service = clock_service or ClockService(time.monotonic)
        self.games: dict[str, GameRecord] = {}

    def create_game(
        self,
        request: NewGameRequest | None = None,
        *,
        fen: str | None = None,
        game_id: str | None = None,
    ) -> GameStateDto:
        request = request or NewGameRequest()
        starting_fen = request.fen or fen
        board = self._create_board(starting_fen)
        human_color = self._resolve_human_color(request)
        orientation: Color = human_color or "white"
        record = GameRecord(
            game_id=game_id or str(uuid.uuid4()),
            board=board,
            piece_ids_by_square=self._create_piece_ids(board),
            move_history=[],
            undo_stack=[],
            clock=self.clock_service.create_state(request.clock, self._color_name(board.turn)),
            mode=request.mode,
            human_color=human_color,
            orientation=orientation,
            engine_settings=request.engine,
            clock_settings=request.clock,
            starting_fen=starting_fen,
            clock_service=self.clock_service,
        )
        self._detect_result(record)
        self.games[record.game_id] = record
        return self._build_state(record)

    def get_game(self, game_id: str) -> GameStateDto:
        return self._build_state(self._require_game(game_id))

    def apply_move(self, game_id: str, move_request: MoveRequest) -> GameStateDto:
        record = self._require_game(game_id)
        self._ensure_playable(record)
        move = self._move_from_request(move_request)
        if move not in record.board.legal_moves:
            raise IllegalMoveError(f"Move {move.uci()} is illegal in the current position.")
        self._apply_valid_move(record, move)
        return self._build_state(record)

    def apply_move_uci(self, game_id: str, uci: str) -> GameStateDto:
        return self.apply_move(
            game_id,
            MoveRequest(from_square=uci[:2], to_square=uci[2:4], promotion=uci[4:] or None),
        )

    def engine_move(self, game_id: str) -> GameStateDto:
        record = self._require_game(game_id)
        self._ensure_playable(record)
        if self.engine_service is None:
            raise EngineUnavailableError("No chess engine is configured.")

        try:
            move = self.engine_service.choose_move(record.board.copy(stack=False), record.engine_settings)
        except EngineUnavailableError:
            raise
        except Exception as exc:
            raise EngineUnavailableError(str(exc)) from exc

        if move not in record.board.legal_moves:
            raise EngineReturnedIllegalMoveError(
                f"Engine returned illegal move {move.uci()} for the current position."
            )

        self._apply_valid_move(record, move)
        return self._build_state(record)

    def undo(self, game_id: str, plies: int) -> GameStateDto:
        record = self._require_game(game_id)
        if plies < 1 or plies > len(record.undo_stack):
            raise InvalidUndoError("Cannot undo the requested number of plies.")

        snapshot = record.undo_stack[-plies]
        record.board = chess.Board(snapshot.fen)
        record.piece_ids_by_square = dict(snapshot.piece_ids_by_square)
        record.move_history = list(snapshot.move_history)
        record.clock = snapshot.clock.copy()
        record.result = snapshot.result
        record.last_move = snapshot.last_move
        record.undo_stack = record.undo_stack[:-plies]
        record.updated_at = datetime.now(UTC)
        return self._build_state(record)

    def resign(self, game_id: str, color: Color) -> GameStateDto:
        record = self._require_game(game_id)
        if record.result is None:
            winner = opposite_color(color)
            record.result = GameResultDto(
                result="1-0" if winner == "white" else "0-1",
                reason="resignation",
                winner=winner,
            )
            self.clock_service.stop(record.clock)
            record.updated_at = datetime.now(UTC)
        return self._build_state(record)

    def reset(self, game_id: str) -> GameStateDto:
        record = self._require_game(game_id)
        request = NewGameRequest(
            mode=record.mode,  # type: ignore[arg-type]
            human_color=record.human_color or "white",
            clock=record.clock_settings,
            engine=record.engine_settings,
            fen=record.starting_fen,
        )
        return self.create_game(request, game_id=game_id)

    def _create_board(self, fen: str | None) -> chess.Board:
        if not fen:
            return chess.Board()
        try:
            return chess.Board(fen)
        except ValueError as exc:
            raise InvalidFenError(f"Invalid FEN: {fen}") from exc

    def _resolve_human_color(self, request: NewGameRequest) -> Color | None:
        if request.mode == "engine_vs_engine":
            return None
        if request.human_color == "random":
            return random.choice(["white", "black"])
        return request.human_color

    def _require_game(self, game_id: str) -> GameRecord:
        try:
            return self.games[game_id]
        except KeyError as exc:
            raise GameNotFoundError(f"Game {game_id} was not found.") from exc

    def _ensure_playable(self, record: GameRecord) -> None:
        self._refresh_clock_timeout(record)
        if record.result is not None:
            raise GameAlreadyOverError("The game is already over.")

    def _make_snapshot(self, record: GameRecord) -> GameSnapshot:
        return GameSnapshot(
            fen=record.board.fen(),
            piece_ids_by_square=dict(record.piece_ids_by_square),
            move_history=list(record.move_history),
            clock=record.clock.copy(),
            result=record.result,
            last_move=record.last_move,
        )

    def _move_from_request(self, request: MoveRequest) -> chess.Move:
        uci = f"{request.from_square}{request.to_square}{request.promotion or ''}"
        try:
            return chess.Move.from_uci(uci)
        except ValueError as exc:
            raise IllegalMoveError(f"Move {uci} is not valid UCI notation.") from exc

    def _apply_valid_move(self, record: GameRecord, move: chess.Move) -> None:
        moving_color = self._color_name(record.board.turn)
        san = record.board.san(move)
        snapshot = self._make_snapshot(record)
        record.undo_stack.append(snapshot)
        self._apply_piece_id_move(record.board, record.piece_ids_by_square, move)
        record.board.push(move)
        history_entry = MoveHistoryEntry(
            ply=len(record.move_history) + 1,
            color=moving_color,
            uci=move.uci(),
            san=san,
            fen_after=record.board.fen(),
        )
        record.move_history.append(history_entry)
        record.last_move = LastMoveDto(
            uci=move.uci(),
            san=san,
            from_square=chess.square_name(move.from_square),
            to_square=chess.square_name(move.to_square),
            promotion=move.uci()[4:] or None,
        )

        clock_result = self.clock_service.apply_move(record.clock, moving_color)
        if clock_result is not None:
            record.result = clock_result
        else:
            self._detect_result(record)

        if record.result is not None:
            self.clock_service.stop(record.clock)
        record.updated_at = datetime.now(UTC)

    def _apply_piece_id_move(
        self,
        board: chess.Board,
        piece_ids_by_square: dict[int, str],
        move: chess.Move,
    ) -> None:
        moving_piece_id = piece_ids_by_square.pop(move.from_square, None)
        if moving_piece_id is None:
            moving_piece_id = self._fallback_piece_id(board, move.from_square)

        if board.is_en_passant(move):
            captured_square = move.to_square + (-8 if board.turn == chess.WHITE else 8)
            piece_ids_by_square.pop(captured_square, None)
        elif board.is_capture(move):
            piece_ids_by_square.pop(move.to_square, None)

        piece_ids_by_square[move.to_square] = moving_piece_id

        if board.is_castling(move):
            rank = chess.square_rank(move.from_square)
            if chess.square_file(move.to_square) > chess.square_file(move.from_square):
                rook_from = chess.square(7, rank)
                rook_to = chess.square(5, rank)
            else:
                rook_from = chess.square(0, rank)
                rook_to = chess.square(3, rank)
            rook_id = piece_ids_by_square.pop(rook_from, None)
            if rook_id is not None:
                piece_ids_by_square[rook_to] = rook_id

    def _detect_result(self, record: GameRecord) -> None:
        board = record.board
        result: GameResultDto | None = None
        if board.is_checkmate():
            winner = opposite_color(self._color_name(board.turn))
            result = GameResultDto(
                result="1-0" if winner == "white" else "0-1",
                reason="checkmate",
                winner=winner,
            )
        elif board.is_stalemate():
            result = GameResultDto(result="1/2-1/2", reason="stalemate", winner=None)
        elif board.is_insufficient_material():
            result = GameResultDto(result="1/2-1/2", reason="insufficient_material", winner=None)
        elif board.is_seventyfive_moves():
            result = GameResultDto(result="1/2-1/2", reason="seventyfive_move_rule", winner=None)
        elif board.is_fivefold_repetition():
            result = GameResultDto(result="1/2-1/2", reason="fivefold_repetition", winner=None)
        record.result = result

    def _refresh_clock_timeout(self, record: GameRecord) -> None:
        if record.result is not None or not record.clock.enabled or record.clock.active_color is None:
            return
        snapshot = self.clock_service.snapshot(record.clock)
        active = record.clock.active_color
        remaining = snapshot.white_ms if active == "white" else snapshot.black_ms
        if remaining is not None and remaining <= 0:
            if active == "white":
                record.clock.white_ms = 0
            else:
                record.clock.black_ms = 0
            winner = opposite_color(active)
            record.result = GameResultDto(
                result="1-0" if winner == "white" else "0-1",
                reason="timeout",
                winner=winner,
            )
            self.clock_service.stop(record.clock)

    def _build_state(self, record: GameRecord) -> GameStateDto:
        self._refresh_clock_timeout(record)
        pieces = self._pieces(record.board, record.piece_ids_by_square)
        legal_moves = [] if record.result is not None else [move.uci() for move in record.board.legal_moves]
        return GameStateDto(
            game_id=record.game_id,
            fen=record.board.fen(),
            turn=self._color_name(record.board.turn),
            pieces=pieces,
            legal_moves=legal_moves,
            move_history=record.move_history,
            last_move=record.last_move,
            check=record.board.is_check(),
            game_over=record.result is not None,
            result=record.result,
            clock=self.clock_service.snapshot(record.clock),
            mode=record.mode,  # type: ignore[arg-type]
            human_color=record.human_color,
            orientation=record.orientation,
        )

    def _pieces(self, board: chess.Board, piece_ids_by_square: dict[int, str]) -> list[PieceDto]:
        pieces: list[PieceDto] = []
        for square, piece in sorted(board.piece_map().items()):
            if square not in piece_ids_by_square:
                piece_ids_by_square[square] = self._fallback_piece_id(board, square)
            pieces.append(
                PieceDto(
                    id=piece_ids_by_square[square],
                    square=chess.square_name(square),
                    color=self._color_name(piece.color),
                    type=PIECE_NAMES[piece.piece_type],
                )
            )
        return pieces

    def _create_piece_ids(self, board: chess.Board) -> dict[int, str]:
        return {
            square: self._piece_id(piece, square)
            for square, piece in sorted(board.piece_map().items())
        }

    def _fallback_piece_id(self, board: chess.Board, square: int) -> str:
        piece = board.piece_at(square)
        if piece is None:
            return f"unknown-{chess.square_name(square)}"
        return self._piece_id(piece, square)

    def _piece_id(self, piece: chess.Piece, square: int) -> str:
        color = self._color_name(piece.color)
        piece_name = PIECE_NAMES[piece.piece_type]
        return f"{color}-{piece_name}-{chess.square_name(square)}"

    def _color_name(self, color: bool) -> Color:
        return "white" if color == chess.WHITE else "black"
