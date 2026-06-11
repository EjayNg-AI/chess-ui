import httpx
import pytest

from app.clock_service import ClockService
from app.game_service import GameService
from app.main import app
from app.stockfish_service import FakeEngineService

pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture(autouse=True)
def configure_service():
    engine_service = FakeEngineService(["e2e4"])

    async def run_engine_move_direct(game_service: GameService, game_id: str):
        return game_service.engine_move(game_id)

    app.state.engine_service = engine_service
    app.state.game_service = GameService(
        engine_service=engine_service,
        clock_service=ClockService(lambda: 0.0),
    )
    app.state.engine_move_runner = run_engine_move_direct


@pytest.fixture
async def client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as test_client:
        yield test_client


async def create_game(client: httpx.AsyncClient) -> dict:
    response = await client.post("/api/games", json={})
    assert response.status_code == 200
    return response.json()


async def test_health(client):
    response = await client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"ok": True}


async def test_engine_status_endpoint(client):
    response = await client.get("/api/engine/status")

    assert response.status_code == 200
    assert response.json() == {
        "available": True,
        "path": None,
        "configured": True,
        "path_exists": True,
        "executable": True,
        "uci_ready": True,
        "error": None,
    }


async def test_create_game_endpoint(client):
    data = await create_game(client)

    assert data["game_id"]
    assert len(data["pieces"]) == 32
    assert data["legal_moves"]


async def test_create_game_endpoint_accepts_fen(client):
    response = await client.post(
        "/api/games",
        json={"fen": "7k/4P3/8/8/8/8/8/4K3 w - - 0 1"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["fen"].startswith("7k/4P3")
    assert {piece["square"] for piece in data["pieces"]} == {"e1", "e7", "h8"}


async def test_create_game_endpoint_rejects_invalid_settings(client):
    response = await client.post(
        "/api/games",
        json={
            "engine": {"movetime_ms": -1, "skill_level": 99, "threads": 0, "hash_mb": 0},
            "clock": {"enabled": True, "initial_ms": -1, "increment_ms": -1},
        },
    )

    assert response.status_code == 422


async def test_get_game_endpoint(client):
    game = await create_game(client)

    response = await client.get(f"/api/games/{game['game_id']}")

    assert response.status_code == 200
    assert response.json()["game_id"] == game["game_id"]


async def test_move_endpoint_accepts_legal_move(client):
    game = await create_game(client)

    response = await client.post(
        f"/api/games/{game['game_id']}/move",
        json={"from": "e2", "to": "e4", "promotion": None},
    )

    assert response.status_code == 200
    assert response.json()["last_move"]["uci"] == "e2e4"
    assert response.json()["turn"] == "black"


async def test_move_endpoint_rejects_illegal_move(client):
    game = await create_game(client)

    response = await client.post(
        f"/api/games/{game['game_id']}/move",
        json={"from": "e2", "to": "e5", "promotion": None},
    )

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "illegal_move"


async def test_move_endpoint_rejects_invalid_square_shape(client):
    game = await create_game(client)

    response = await client.post(
        f"/api/games/{game['game_id']}/move",
        json={"from": "z9", "to": "e4", "promotion": None},
    )

    assert response.status_code == 422


async def test_engine_move_endpoint(client):
    response = await client.post("/api/games", json={"mode": "engine_vs_engine"})
    assert response.status_code == 200
    game = response.json()

    response = await client.post(f"/api/games/{game['game_id']}/engine-move")

    assert response.status_code == 200
    assert response.json()["last_move"]["uci"] == "e2e4"


async def test_engine_move_endpoint_rejects_human_turn(client):
    game = await create_game(client)

    response = await client.post(f"/api/games/{game['game_id']}/engine-move")

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "engine_move_not_allowed"


async def test_undo_endpoint(client):
    game = await create_game(client)
    await client.post(
        f"/api/games/{game['game_id']}/move",
        json={"from": "e2", "to": "e4", "promotion": None},
    )

    response = await client.post(f"/api/games/{game['game_id']}/undo", json={"plies": 1})

    assert response.status_code == 200
    assert response.json()["turn"] == "white"
    assert response.json()["move_history"] == []


async def test_undo_endpoint_rejects_invalid_plies(client):
    game = await create_game(client)

    response = await client.post(f"/api/games/{game['game_id']}/undo", json={"plies": 0})

    assert response.status_code == 422


async def test_resign_endpoint(client):
    game = await create_game(client)

    response = await client.post(f"/api/games/{game['game_id']}/resign", json={"color": "white"})

    assert response.status_code == 200
    data = response.json()
    assert data["game_over"] is True
    assert data["result"]["winner"] == "black"
    assert data["result"]["reason"] == "resignation"


async def test_missing_game_returns_404(client):
    response = await client.get("/api/games/missing")

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "game_not_found"
