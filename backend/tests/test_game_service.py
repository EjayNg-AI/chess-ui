import chess
import pytest

from app.clock_service import ClockService
from app.errors import EngineMoveNotAllowedError, EngineReturnedIllegalMoveError, IllegalMoveError
from app.game_service import GameService
from app.models import ClockSettings, NewGameRequest
from app.stockfish_service import FakeEngineService


def service_with_fake_engine(moves: list[str] | None = None) -> GameService:
    return GameService(
        engine_service=FakeEngineService(moves or []),
        clock_service=ClockService(lambda: 0.0),
    )


def piece_at(state, square: str):
    return next(piece for piece in state.pieces if piece.square == square)


def test_create_game_has_initial_position():
    service = service_with_fake_engine()
    state = service.create_game()

    assert len(state.pieces) == 32
    assert state.turn == "white"
    assert state.game_over is False
    assert "e2e4" in state.legal_moves
    assert state.clock.white_ms == 600_000
    assert state.clock.black_ms == 600_000


def test_apply_legal_move_updates_board():
    service = service_with_fake_engine()
    state = service.create_game()

    state = service.apply_move_uci(state.game_id, "e2e4")

    board = chess.Board(state.fen)
    assert state.turn == "black"
    assert board.piece_at(chess.E4) == chess.Piece(chess.PAWN, chess.WHITE)
    assert state.last_move is not None
    assert state.last_move.uci == "e2e4"
    assert len(state.move_history) == 1
    assert all(
        chess.Board(state.fen).piece_at(chess.parse_square(move[:2])).color == chess.BLACK
        for move in state.legal_moves
    )


def test_apply_illegal_move_rejected():
    service = service_with_fake_engine()
    state = service.create_game()
    starting_fen = state.fen

    with pytest.raises(IllegalMoveError):
        service.apply_move_uci(state.game_id, "e2e5")

    current = service.get_game(state.game_id)
    assert current.fen == starting_fen
    assert current.move_history == []


def test_capture_updates_piece_identity_map():
    service = service_with_fake_engine()
    state = service.create_game()

    for uci in ["e2e4", "d7d5", "e4d5"]:
        state = service.apply_move_uci(state.game_id, uci)

    pawn = piece_at(state, "d5")
    assert pawn.id == "white-pawn-e2"
    assert "black-pawn-d7" not in {piece.id for piece in state.pieces}
    assert len(state.pieces) == 31


def test_en_passant_updates_piece_identity_map():
    service = service_with_fake_engine()
    state = service.create_game()

    for uci in ["e2e4", "a7a6", "e4e5", "d7d5", "e5d6"]:
        state = service.apply_move_uci(state.game_id, uci)

    pawn = piece_at(state, "d6")
    assert pawn.id == "white-pawn-e2"
    assert "black-pawn-d7" not in {piece.id for piece in state.pieces}
    assert len(state.pieces) == 31


def test_castling_updates_king_and_rook_piece_ids():
    service = service_with_fake_engine()
    state = service.create_game(fen="r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1")

    state = service.apply_move_uci(state.game_id, "e1g1")

    assert piece_at(state, "g1").id == "white-king-e1"
    assert piece_at(state, "f1").id == "white-rook-h1"


def test_promotion_preserves_piece_id_and_changes_type():
    service = service_with_fake_engine()
    state = service.create_game(fen="7k/4P3/8/8/8/8/8/4K3 w - - 0 1")
    original_id = piece_at(state, "e7").id

    state = service.apply_move_uci(state.game_id, "e7e8q")
    promoted = piece_at(state, "e8")

    assert promoted.id == original_id
    assert promoted.type == "queen"
    assert state.last_move is not None
    assert state.last_move.uci == "e7e8q"


def test_reset_preserves_manual_starting_fen():
    service = service_with_fake_engine()
    state = service.create_game(
        NewGameRequest(fen="7k/4P3/8/8/8/8/8/4K3 w - - 0 1")
    )

    state = service.apply_move_uci(state.game_id, "e7e8q")
    reset = service.reset(state.game_id)

    assert reset.fen.startswith("7k/4P3")
    assert {piece.square for piece in reset.pieces} == {"e1", "e7", "h8"}


def test_fools_mate_detects_checkmate():
    service = service_with_fake_engine()
    state = service.create_game()

    for uci in ["f2f3", "e7e5", "g2g4", "d8h4"]:
        state = service.apply_move_uci(state.game_id, uci)

    assert state.game_over is True
    assert state.result is not None
    assert state.result.reason == "checkmate"
    assert state.result.winner == "black"
    assert state.result.result == "0-1"


def test_claimable_fifty_move_draw_is_not_automatic():
    service = service_with_fake_engine()
    state = service.create_game(fen="7k/8/8/8/8/8/R7/K7 w - - 100 51")

    assert state.game_over is False
    assert state.result is None


def test_undo_restores_board_piece_ids_and_history():
    service = service_with_fake_engine()
    state = service.create_game()
    starting_fen = state.fen
    starting_ids = {piece.square: piece.id for piece in state.pieces}

    service.apply_move_uci(state.game_id, "e2e4")
    service.apply_move_uci(state.game_id, "e7e5")
    state = service.undo(state.game_id, 2)

    assert state.fen == starting_fen
    assert state.move_history == []
    assert {piece.square: piece.id for piece in state.pieces} == starting_ids
    assert state.turn == "white"


def test_engine_move_uses_fake_engine_and_updates_state():
    fake_engine = FakeEngineService(["e2e4"])
    service = GameService(engine_service=fake_engine, clock_service=ClockService(lambda: 0.0))
    state = service.create_game(NewGameRequest(mode="engine_vs_engine"))

    state = service.engine_move(state.game_id)

    assert state.last_move is not None
    assert state.last_move.uci == "e2e4"
    assert len(fake_engine.calls) == 1
    assert state.turn == "black"


def test_engine_move_rejected_when_human_turn():
    service = service_with_fake_engine(["e2e4"])
    state = service.create_game()

    with pytest.raises(EngineMoveNotAllowedError):
        service.engine_move(state.game_id)


def test_engine_move_allowed_for_human_vs_engine_engine_turn():
    service = service_with_fake_engine(["e7e5"])
    state = service.create_game()
    state = service.apply_move_uci(state.game_id, "e2e4")

    state = service.engine_move(state.game_id)

    assert state.last_move is not None
    assert state.last_move.uci == "e7e5"


def test_fake_engine_illegal_move_does_not_mutate_state():
    service = service_with_fake_engine(["e2e5"])
    state = service.create_game(NewGameRequest(mode="engine_vs_engine"))
    starting_fen = state.fen

    with pytest.raises(EngineReturnedIllegalMoveError):
        service.engine_move(state.game_id)

    current = service.get_game(state.game_id)
    assert current.fen == starting_fen
    assert current.move_history == []


def test_clock_timeout_on_state_refresh_sets_game_result():
    current_time = {"value": 0.0}
    service = GameService(clock_service=ClockService(lambda: current_time["value"]))
    state = service.create_game(
        NewGameRequest(clock=ClockSettings(enabled=True, initial_ms=1_000, increment_ms=0))
    )

    current_time["value"] = 2.0
    state = service.get_game(state.game_id)

    assert state.game_over is True
    assert state.result is not None
    assert state.result.reason == "timeout"
    assert state.result.winner == "black"
