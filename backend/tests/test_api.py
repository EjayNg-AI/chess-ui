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
    app.state.game_service = GameService(
        engine_service=FakeEngineService(["e2e4"]),
        clock_service=ClockService(lambda: 0.0),
    )


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


async def test_create_game_endpoint(client):
    data = await create_game(client)

    assert data["game_id"]
    assert len(data["pieces"]) == 32
    assert data["legal_moves"]


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


async def test_engine_move_endpoint(client):
    game = await create_game(client)

    response = await client.post(f"/api/games/{game['game_id']}/engine-move")

    assert response.status_code == 200
    assert response.json()["last_move"]["uci"] == "e2e4"


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
