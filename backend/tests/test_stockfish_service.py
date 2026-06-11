import os
from pathlib import Path

import chess
import pytest

from app.models import EngineSettings
from app.stockfish_service import StockfishEngineService

pytestmark = [
    pytest.mark.stockfish,
    pytest.mark.skipif(
        os.getenv("RUN_STOCKFISH_TESTS") != "1",
        reason="Set RUN_STOCKFISH_TESTS=1 to run Stockfish integration tests.",
    ),
]


@pytest.mark.skipif(
    not os.getenv("STOCKFISH_PATH") or not Path(os.getenv("STOCKFISH_PATH", "")).exists(),
    reason="STOCKFISH_PATH is not configured",
)
def test_real_stockfish_returns_legal_starting_move():
    service = StockfishEngineService(os.environ["STOCKFISH_PATH"])
    board = chess.Board()

    try:
        move = service.choose_move(board, EngineSettings(limit_type="depth", depth=1))
    finally:
        service.close()

    assert move in board.legal_moves
