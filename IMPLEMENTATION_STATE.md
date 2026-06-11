# Implementation State and Roadmap

## Current State

The repository contains a working first implementation of the local chess web UI described in `engineering_spec.md`.

### Backend

The backend is implemented with FastAPI, Pydantic, `python-chess`, and pytest.

Implemented:

- In-memory game registry keyed by game ID
- Backend-authoritative chess board state using `python-chess`
- Pydantic request/response models matching the specified API shape
- Legal move validation for normal moves, castling, en passant, and promotion
- Stable piece identity mapping for frontend animation
- Piece ID updates for captures, en passant, castling, promotion, and undo
- Move history with ply, color, UCI, SAN, and FEN-after fields
- Last move, legal moves, check state, game-over state, and result reporting
- Clock initialization, elapsed-time subtraction, increment handling, active side tracking, timeout result detection, and disabled-clock handling
- Result detection for checkmate, stalemate, insufficient material, seventy-five move rule, fivefold repetition, fifty-move claim, and threefold claim
- Undo by half-move count with validation and state restoration
- Resignation
- Optional reset endpoint
- Stable JSON error responses
- CORS for `localhost:5173` and `127.0.0.1:5173`
- Stockfish service abstraction
- Fake engine service for deterministic tests
- Production Stockfish service using `chess.engine.SimpleEngine.popen_uci`
- Root `.env` loading for `STOCKFISH_PATH`
- Optional Stockfish integration test gated behind `pytest -m stockfish`

Normal backend tests do not require a real Stockfish binary.

### Frontend

The frontend is implemented with React, TypeScript, Vite, Vitest, and React Testing Library.

Implemented:

- Chess.com-inspired local app shell without chess.com branding or assets
- Board column with top and bottom player bars
- Side panel with game status, controls, move list, and settings
- Pure board geometry helpers for orientation-aware square mapping
- Absolute-positioned piece rendering keyed by backend piece IDs
- Unicode piece fallback rendering
- Pointer-based dragging, not native HTML drag-and-drop
- Legal move hints for selected or dragged pieces
- Last-move highlighting
- Selected-square highlighting
- Check highlighting on the side-to-move king
- Illegal drag snapback by not mutating frontend board state
- Promotion modal with queen, rook, bishop, and knight options
- API client for backend endpoints
- `useGame` controller hook for game creation, human moves, engine moves, undo, resign, orientation, settings, and self-play
- Human-vs-engine flow with delayed engine response
- Human-as-black flow with engine first move
- Engine-vs-engine step and interval-based self-play
- Local settings panel for mode, human side, engine limit, engine skill, clock, and orientation

The frontend never calls Stockfish directly and does not decide chess legality authoritatively.

## Test Coverage

Current verification commands:

```bash
cd backend
pytest
```

Expected current result:

```text
25 passed, 1 skipped
```

The skipped test is the optional Stockfish integration test unless explicitly selected.

```bash
cd frontend
npm test
npm run build
```

Expected current frontend results:

```text
32 tests passed
build passed
```

Covered backend areas:

- Initial game creation
- Legal and illegal moves
- Captures and piece identity
- En passant identity updates
- Castling identity updates
- Promotion identity preservation
- Fool's mate checkmate detection
- Undo restoration
- Fake engine move application
- Illegal fake engine move rollback
- Clock initialization, increment, timeout, and disabled clocks
- API health, create, get, move, engine move, undo, resign, and missing game errors

Covered frontend areas:

- Board index/square/client-point geometry
- Board square and piece rendering
- Last-move highlights
- Legal move hints
- Legal drag submission
- Illegal and out-of-board drag rejection
- Promotion drag modal
- Promotion modal actions
- Controls actions and disabled state
- `useGame` game creation, human move flow, engine reply flow, game-over handling, human-as-black opening flow, self-play step, and self-play loop stop

## Known Limitations

- Game state is in memory only; refreshing or restarting the backend loses games.
- There is no authentication, persistence, online multiplayer, or cloud save.
- Stockfish process health is basic; the current service lazily starts one process and closes it on app shutdown.
- The frontend uses Unicode pieces by default. SVG piece asset fallback paths exist, but no custom piece asset theme is included.
- Clocks are returned by the backend and displayed by the frontend, but the frontend does not run a live ticking display between backend responses.
- The UI has responsive layout support, but deeper mobile gesture testing has not been done with real devices.
- Settings do not persist across browser reloads.
- The move list is functional but minimal; it does not yet support move navigation.
- Undo is simple half-move rollback. In human-vs-engine mode the frontend defaults to two plies when possible.
- The optional Stockfish test is opt-in with `pytest -m stockfish` to keep normal tests deterministic.

## Recommended Follow-Up Actions

1. Smoke test real Stockfish play in the browser.
   Confirm that `STOCKFISH_PATH` points to a valid Linux binary and that `/api/games/{game_id}/engine-move` returns promptly.

2. Add a live frontend clock ticker.
   The backend should remain authoritative, but the UI can locally count down from the latest server clock state for a smoother experience.

3. Add a small backend endpoint or response field for engine availability.
   This would let the frontend show a precise "Stockfish unavailable" state before a user starts human-vs-engine play.

4. Improve frontend error presentation.
   Current errors appear in the side panel. Add clearer recovery actions for missing Stockfish, illegal server responses, and network failures.

5. Add browser-level smoke tests.
   Playwright coverage would catch real pointer behavior, responsive layout issues, and backend/frontend integration regressions.

6. Add a few hand-authored positions for UI testing.
   Test positions for promotion, checkmate, stalemate, and clock timeout would make manual acceptance faster.

7. Decide whether to keep generated build output out of git.
   `frontend/dist/` is ignored. Keep it that way unless deployment needs static artifacts committed.

8. Normalize the app title and metadata.
   `frontend/index.html` still has the default title text. Update it before sharing screenshots or packaging.

## Future Enhancement Ideas

- SVG piece themes and board themes
- Captured-piece display and material balance
- Move navigation with board rewind/forward
- PGN export and import
- FEN input for custom positions
- Engine strength presets
- Engine analysis panel with evaluation and principal variation
- Adjustable self-play delay
- Sound effects and optional move confirmation
- Keyboard shortcuts for common controls
- Accessibility pass for board navigation and screen reader support
- Local storage for settings
- Persistent game save files
- Opening book support
- Tablebase support for endgames
- Puzzle/training mode
- Premoves and arrows
- Multi-board engine-vs-engine tournament mode
- Docker or one-command dev environment

## Development Notes

- Keep the backend authoritative for state and legality.
- Keep Stockfish access backend-only.
- Prefer fake engine tests for deterministic behavior.
- Use `pytest -m stockfish` only when intentionally validating a real engine binary.
- Keep frontend board geometry pure and tested; drag/drop should call those helpers instead of duplicating square math.
- Do not use chess.com assets, branding, sprites, or proprietary artwork.
