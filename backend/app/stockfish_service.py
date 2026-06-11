from __future__ import annotations

import os
import threading
from pathlib import Path
from typing import Protocol

import chess
import chess.engine
from dotenv import load_dotenv

from .errors import EngineUnavailableError
from .models import EngineSettings, EngineStatusDto


class EngineProtocol(Protocol):
    def choose_move(self, board: chess.Board, settings: EngineSettings) -> chess.Move:
        ...


class FakeEngineService:
    def __init__(self, moves: list[str | chess.Move] | None = None):
        self.moves = list(moves or [])
        self.calls: list[str] = []

    def choose_move(self, board: chess.Board, settings: EngineSettings) -> chess.Move:
        self.calls.append(board.fen())
        if not self.moves:
            raise EngineUnavailableError("Fake engine has no configured moves.")
        move = self.moves.pop(0)
        if isinstance(move, chess.Move):
            return move
        return chess.Move.from_uci(move)

    def status(self) -> EngineStatusDto:
        return EngineStatusDto(
            available=True,
            path=None,
            configured=True,
            path_exists=True,
            executable=True,
            uci_ready=True,
            error=None,
        )


class StockfishEngineService:
    def __init__(self, stockfish_path: str | None = None):
        load_dotenv(Path(__file__).resolve().parents[2] / ".env")
        self.stockfish_path = stockfish_path or os.getenv("STOCKFISH_PATH")
        self._engine: chess.engine.SimpleEngine | None = None
        self._lock = threading.Lock()

    def _ensure_engine(self) -> chess.engine.SimpleEngine:
        if not self.stockfish_path:
            raise EngineUnavailableError("STOCKFISH_PATH is not configured.")
        path = Path(self.stockfish_path)
        if not path.exists():
            raise EngineUnavailableError(f"Stockfish binary does not exist: {self.stockfish_path}")
        if not path.is_file() or not os.access(path, os.X_OK):
            raise EngineUnavailableError(
                f"Stockfish binary is not executable: {self.stockfish_path}"
            )
        if self._engine is None:
            self._engine = chess.engine.SimpleEngine.popen_uci(self.stockfish_path, timeout=5.0)
        return self._engine

    def choose_move(self, board: chess.Board, settings: EngineSettings) -> chess.Move:
        with self._lock:
            engine = self._ensure_engine()
            options = {
                "Skill Level": settings.skill_level,
                "Threads": settings.threads,
                "Hash": settings.hash_mb,
            }
            try:
                engine.configure(options)
            except chess.engine.EngineError:
                pass

            if settings.limit_type == "depth":
                limit = chess.engine.Limit(depth=settings.depth or 10)
            else:
                limit = chess.engine.Limit(time=settings.movetime_ms / 1000)

            result = engine.play(board, limit)
            if result.move is None:
                raise EngineUnavailableError("Stockfish did not return a move.")
            return result.move

    def status(self) -> EngineStatusDto:
        if not self.stockfish_path:
            return EngineStatusDto(
                available=False,
                path=None,
                configured=False,
                path_exists=False,
                executable=False,
                uci_ready=False,
                error="STOCKFISH_PATH is not configured.",
            )

        path = Path(self.stockfish_path)
        path_exists = path.exists()
        executable = path.is_file() and os.access(path, os.X_OK)
        if not path_exists:
            return EngineStatusDto(
                available=False,
                path=self.stockfish_path,
                configured=True,
                path_exists=False,
                executable=False,
                uci_ready=False,
                error=f"Stockfish binary does not exist: {self.stockfish_path}",
            )
        if not executable:
            return EngineStatusDto(
                available=False,
                path=self.stockfish_path,
                configured=True,
                path_exists=True,
                executable=False,
                uci_ready=False,
                error=f"Stockfish binary is not executable: {self.stockfish_path}",
            )

        with self._lock:
            try:
                engine = self._ensure_engine()
                engine.ping()
            except Exception as exc:
                if self._engine is not None:
                    try:
                        self._engine.quit()
                    except Exception:
                        pass
                    self._engine = None
                return EngineStatusDto(
                    available=False,
                    path=self.stockfish_path,
                    configured=True,
                    path_exists=True,
                    executable=True,
                    uci_ready=False,
                    error=f"Stockfish UCI readiness check failed: {exc}",
                )

        return EngineStatusDto(
            available=True,
            path=self.stockfish_path,
            configured=True,
            path_exists=True,
            executable=True,
            uci_ready=True,
            error=None,
        )

    def close(self) -> None:
        with self._lock:
            if self._engine is not None:
                self._engine.quit()
                self._engine = None
