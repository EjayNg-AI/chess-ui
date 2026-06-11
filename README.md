# Local Chess UI

A localhost chess web application with a FastAPI backend and a React/Vite frontend. The backend is authoritative for game state, legal move validation, clocks, move history, game results, undo/resign behavior, and Stockfish access. The frontend renders the board, handles pointer-based input, animations, settings, move list, and self-play controls.

This project implements the contract in [engineering_spec.md](engineering_spec.md).

## Features

- Human vs Stockfish, human vs human, and engine vs engine modes
- Backend-side move legality with `python-chess`
- Stable backend piece IDs for frontend animation
- Clock support with increments and timeout results
- Move history, SAN/UCIs, check/checkmate/stalemate/draw result detection
- Undo and resign endpoints
- Optional Stockfish integration through `STOCKFISH_PATH`
- Chess.com-inspired local UI without chess.com assets
- Pointer dragging, legal hints, snapback for illegal moves, and promotion modal
- Controls for new game, flip board, undo, resign, self-play step/start/pause, and settings
- Backend and frontend unit tests

## Project Layout

```text
backend/
  app/                 FastAPI app, models, services, Stockfish adapter
  tests/               Pytest suite
frontend/
  src/                 React app, components, hooks, API client, types
  tests/               Vitest and React Testing Library suite
engineering_spec.md    Original implementation contract
IMPLEMENTATION_STATE.md Current status, follow-ups, and roadmap
```

## Requirements

- Python 3.11+
- Node.js compatible with the checked-in Vite/React toolchain
- Optional: a Linux Stockfish binary for engine play

Install Python dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

## Stockfish Configuration

For real engine play, create a root `.env` file:

```bash
STOCKFISH_PATH=/usr/games/stockfish
```

Normal unit tests do not require Stockfish. The optional Stockfish integration test is opt-in.

## Run Locally

Start the backend:

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Start the frontend:

```bash
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

Open:

```text
http://localhost:5173
```

## Tests

Backend:

```bash
cd backend
pytest
```

Optional Stockfish integration:

```bash
cd backend
STOCKFISH_PATH=/usr/games/stockfish pytest -m stockfish
```

Frontend:

```bash
cd frontend
npm test
npm run build
```

## API Overview

- `GET /api/health`
- `POST /api/games`
- `GET /api/games/{game_id}`
- `POST /api/games/{game_id}/move`
- `POST /api/games/{game_id}/engine-move`
- `POST /api/games/{game_id}/undo`
- `POST /api/games/{game_id}/resign`
- `POST /api/games/{game_id}/reset`

See [engineering_spec.md](engineering_spec.md) and [IMPLEMENTATION_STATE.md](IMPLEMENTATION_STATE.md) for details.
