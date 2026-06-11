from __future__ import annotations

from contextlib import asynccontextmanager

from anyio import to_thread
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .errors import ChessAppError
from .game_service import GameService
from .models import (
    EngineStatusDto,
    GameStateDto,
    MoveRequest,
    NewGameRequest,
    ResignRequest,
    UndoRequest,
)
from .stockfish_service import StockfishEngineService


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    yield
    close = getattr(app_instance.state.engine_service, "close", None)
    if close is not None:
        close()


app = FastAPI(title="Local Chess UI", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine_service = StockfishEngineService()
app.state.engine_service = engine_service
app.state.game_service = GameService(engine_service=engine_service)


async def run_engine_move_in_thread(game_service: GameService, game_id: str) -> GameStateDto:
    return await to_thread.run_sync(game_service.engine_move, game_id)


async def get_game_service(request: Request) -> GameService:
    return request.app.state.game_service


@app.exception_handler(ChessAppError)
async def chess_error_handler(_: Request, exc: ChessAppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": {"code": exc.code, "message": exc.message}},
    )


@app.get("/api/health")
async def health() -> dict[str, bool]:
    return {"ok": True}


@app.get("/api/engine/status", response_model=EngineStatusDto)
async def engine_status(request: Request) -> EngineStatusDto:
    service = getattr(request.app.state, "engine_service", None)
    status = getattr(service, "status", None)
    if status is None:
        return EngineStatusDto(
            available=False,
            path=None,
            error="No chess engine service is configured.",
        )
    return status()


@app.post("/api/games", response_model=GameStateDto)
async def create_game(
    request: NewGameRequest,
    game_service: GameService = Depends(get_game_service),
) -> GameStateDto:
    return game_service.create_game(request)


@app.get("/api/games/{game_id}", response_model=GameStateDto)
async def get_game(
    game_id: str,
    game_service: GameService = Depends(get_game_service),
) -> GameStateDto:
    return game_service.get_game(game_id)


@app.post("/api/games/{game_id}/move", response_model=GameStateDto)
async def move(
    game_id: str,
    request: MoveRequest,
    game_service: GameService = Depends(get_game_service),
) -> GameStateDto:
    return game_service.apply_move(game_id, request)


@app.post("/api/games/{game_id}/engine-move", response_model=GameStateDto)
async def engine_move(
    request: Request,
    game_id: str,
    game_service: GameService = Depends(get_game_service),
) -> GameStateDto:
    runner = getattr(request.app.state, "engine_move_runner", run_engine_move_in_thread)
    return await runner(game_service, game_id)


@app.post("/api/games/{game_id}/undo", response_model=GameStateDto)
async def undo(
    game_id: str,
    request: UndoRequest,
    game_service: GameService = Depends(get_game_service),
) -> GameStateDto:
    return game_service.undo(game_id, request.plies)


@app.post("/api/games/{game_id}/resign", response_model=GameStateDto)
async def resign(
    game_id: str,
    request: ResignRequest,
    game_service: GameService = Depends(get_game_service),
) -> GameStateDto:
    return game_service.resign(game_id, request.color)


@app.post("/api/games/{game_id}/reset", response_model=GameStateDto)
async def reset(
    game_id: str,
    game_service: GameService = Depends(get_game_service),
) -> GameStateDto:
    return game_service.reset(game_id)
