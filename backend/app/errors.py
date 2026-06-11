from __future__ import annotations


class ChessAppError(Exception):
    status_code = 400
    code = "chess_error"

    def __init__(self, message: str | None = None):
        super().__init__(message or self.code)
        self.message = message or self.code


class GameNotFoundError(ChessAppError):
    status_code = 404
    code = "game_not_found"


class GameAlreadyOverError(ChessAppError):
    status_code = 400
    code = "game_over"


class IllegalMoveError(ChessAppError):
    status_code = 400
    code = "illegal_move"


class InvalidPromotionError(ChessAppError):
    status_code = 400
    code = "invalid_promotion"


class InvalidFenError(ChessAppError):
    status_code = 400
    code = "invalid_fen"


class EngineUnavailableError(ChessAppError):
    status_code = 503
    code = "engine_unavailable"


class EngineReturnedIllegalMoveError(ChessAppError):
    status_code = 502
    code = "engine_returned_illegal_move"


class EngineMoveNotAllowedError(ChessAppError):
    status_code = 400
    code = "engine_move_not_allowed"


class InvalidUndoError(ChessAppError):
    status_code = 400
    code = "invalid_undo"
