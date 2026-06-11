# AGENTS.md

## Scope

These instructions apply to the whole repository.

## Project Shape

- Backend: `backend/app` using FastAPI, Pydantic, `python-chess`, and pytest.
- Frontend: `frontend/src` using React, TypeScript, Vite, Vitest, and React Testing Library.
- Original implementation contract: `engineering_spec.md`.
- Current status and roadmap: `IMPLEMENTATION_STATE.md`.

## Engineering Rules

- The backend is authoritative for chess state, legal move validation, clocks, move history, game results, undo/resign, and Stockfish access.
- The frontend handles display, input, animation, settings, and API calls only.
- Do not call Stockfish from the frontend.
- Do not require real Stockfish for normal tests.
- Use fake engine services for deterministic backend unit tests.
- Keep board geometry pure and covered by unit tests.
- Do not use chess.com assets, branding, or proprietary artwork.

## Commands

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

Local run:

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

```bash
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```
