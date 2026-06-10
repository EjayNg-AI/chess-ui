# Engineering Spec: Localhost Chess Web UI with Stockfish

## 1. Product Goal

Build a local chess web application that runs on `localhost` in a WSL environment. The app should provide a chess.com-inspired playing interface with a centered board, opponent/player bars, clocks, piece dragging, move animations, standard game controls, and Stockfish integration.

The app must support:

```text
Human vs Stockfish
Stockfish vs Stockfish self-play
Drag-and-drop piece movement
Animated legal moves and snapback on illegal moves
Promotion selection
Clocks
Move list
New game / undo / resign / flip board / settings controls
Backend-side legal move validation
Backend-side Stockfish communication
Unit tests for backend and frontend logic
```

The UI may visually resemble chess.com’s layout, but it must not copy chess.com branding, names, images, sprites, or proprietary artwork.

---

# 2. Roles and Responsibilities

## 2.1 Project Owner Role

The project owner will:

```text
Create the initial repository scaffolding. [DONE]
Choose package manager conventions.
Provide optional piece SVGs or board textures if desired.
Install Stockfish in WSL or provide STOCKFISH_PATH. [DONE]
Review visual fidelity and UX behavior.
Run the app locally.
```

The project owner is responsible for WSL system setup, including making sure a Linux Stockfish binary exists.

Expected environment variable is stored in root-level `.env` file:

```bash
STOCKFISH_PATH=/usr/games/stockfish
```

## 2.2 Codex Implementation Role

Codex should:

```text
Implement the backend and frontend features described below.
Respect the existing scaffolding and package conventions.
Avoid re-scaffolding the app unless files are missing.
Add tests alongside implementation.
Use dependency injection or mocks so unit tests do not require real Stockfish.
Keep Stockfish-dependent tests optional.
Avoid adding unrelated features.
Avoid copying chess.com assets.
```

Codex should treat this spec as the implementation contract.

## 2.3 Backend Role

The backend is the source of truth for:

```text
Game state
Legal move validation
Move history
Forsyth–Edwards Notation, abbreviated FEN
Portable Game Notation, PGN-compatible move notation
Check/checkmate/stalemate/result detection
Clock state
Stockfish process communication
Engine move selection
Undo/resign/reset behavior
```

The frontend must never be trusted to decide whether a chess move is legal.

## 2.4 Frontend Role

The frontend is responsible for:

```text
Rendering the board and pieces
Handling pointer-based dragging
Animating piece movement
Showing legal move hints
Displaying clocks, player bars, controls, settings, move list, and game status
Calling backend APIs
Presenting promotion choices
Managing local UI state such as selected square, dragging state, orientation, and settings panel visibility
```

The frontend may parse UCI move strings for display and interaction, but it must not be the authoritative rules engine.

## 2.5 Stockfish Role

Stockfish is only the chess engine. It should:

```text
Receive board positions from the backend.
Return best moves.
Optionally return analysis information in later versions.
```

Stockfish must not own the game state. The backend owns the game state.

## 2.6 Test Suite Role

The test suite must verify:

```text
Backend chess rules and API behavior without real Stockfish.
Frontend board mapping, rendering, interaction, and API flow.
Optional integration with real Stockfish when STOCKFISH_PATH is available.
```

Unit tests must be deterministic.

---

# 3. Technology Assumptions

Assume this stack unless the existing scaffold clearly differs:

```text
Backend:
  Python
  FastAPI
  python-chess
  Pydantic
  pytest

Frontend:
  React
  TypeScript
  Vite
  Vitest
  React Testing Library

Runtime:
  WSL Linux environment
  Browser opens frontend through localhost
  Backend runs on port 8000
  Frontend runs on port 5173
```

The backend should allow CORS from:

```text
http://localhost:5173
http://127.0.0.1:5173
```

Development run assumptions:

```bash
# backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

---

# 4. Non-Goals for First Implementation

Do not implement these in the first pass:

```text
Online multiplayer
Authentication
Persistent user accounts
Cloud save
Puzzle mode
Full chess.com clone
Chat
Premoves
Arrows and annotations
Opening book
Tablebases
Long-running engine analysis stream
Mobile app packaging
```

A clean local web app is the goal.

---

# 5. Repository Layout

Assume a structure similar to this. Codex should adapt to the actual scaffold if names differ.

```text
local-chess-ui/
  backend/
    app/
      main.py
      models.py
      game_service.py
      stockfish_service.py
      clock_service.py
      errors.py
      settings.py
    tests/
      test_game_service.py
      test_clock_service.py
      test_api.py
      test_stockfish_service.py
    requirements.txt
    .env.example

  frontend/
    src/
      main.tsx
      App.tsx
      api/
        client.ts
      components/
        Board/
          Board.tsx
          Board.css
          boardGeometry.ts
          pieceRendering.ts
        PlayerBar/
          PlayerBar.tsx
        Clock/
          Clock.tsx
        Controls/
          Controls.tsx
        MoveList/
          MoveList.tsx
        PromotionModal/
          PromotionModal.tsx
        SettingsPanel/
          SettingsPanel.tsx
      hooks/
        useGame.ts
        usePieceDrag.ts
      types/
        chess.ts
    tests/
      boardGeometry.test.ts
      Board.test.tsx
      PromotionModal.test.tsx
      useGame.test.tsx
      Controls.test.tsx
    package.json
```

---

# 6. Backend Specification

## 6.1 Core Backend Design

Use an in-memory game registry for version 1.

```python
games: dict[str, GameRecord]
```

Each game record should contain:

```text
game_id
python-chess Board
piece identity mapping
move history
clock state
game settings
game result
created_at
updated_at
```

No database is required.

The backend must support multiple games in memory, but this is still a single-user localhost app. Do not over-engineer concurrency.

---

## 6.2 Backend Data Models

Implement Pydantic models similar to the following. Field names may be adjusted to match existing conventions, but the API shape should remain stable.

```python
from typing import Literal, Optional

Color = Literal["white", "black"]
PieceType = Literal["pawn", "knight", "bishop", "rook", "queen", "king"]
PromotionPiece = Literal["q", "r", "b", "n"]
GameMode = Literal["human_vs_engine", "engine_vs_engine", "human_vs_human"]
EngineLimitType = Literal["movetime", "depth"]
GameResultReason = Literal[
    "checkmate",
    "stalemate",
    "insufficient_material",
    "seventyfive_move_rule",
    "fivefold_repetition",
    "fifty_move_claim",
    "threefold_claim",
    "timeout",
    "resignation",
    "draw_agreed",
]
```

Required request models:

```python
class EngineSettings(BaseModel):
    limit_type: EngineLimitType = "movetime"
    movetime_ms: int = 1000
    depth: int | None = None
    skill_level: int = 20
    threads: int = 1
    hash_mb: int = 64

class ClockSettings(BaseModel):
    enabled: bool = True
    initial_ms: int = 600_000
    increment_ms: int = 0

class NewGameRequest(BaseModel):
    mode: GameMode = "human_vs_engine"
    human_color: Color | Literal["random"] = "white"
    clock: ClockSettings = ClockSettings()
    engine: EngineSettings = EngineSettings()

class MoveRequest(BaseModel):
    from_square: str = Field(alias="from")
    to_square: str = Field(alias="to")
    promotion: PromotionPiece | None = None

class UndoRequest(BaseModel):
    plies: int = 1
```

Required response models:

```python
class PieceDto(BaseModel):
    id: str
    square: str
    color: Color
    type: PieceType

class LastMoveDto(BaseModel):
    uci: str
    san: str
    from_square: str = Field(alias="from")
    to_square: str = Field(alias="to")
    promotion: PromotionPiece | None = None

class MoveHistoryEntry(BaseModel):
    ply: int
    color: Color
    uci: str
    san: str
    fen_after: str

class ClockStateDto(BaseModel):
    enabled: bool
    white_ms: int | None
    black_ms: int | None
    active_color: Color | None
    increment_ms: int

class GameResultDto(BaseModel):
    result: str
    reason: GameResultReason
    winner: Color | None

class GameStateDto(BaseModel):
    game_id: str
    fen: str
    turn: Color
    pieces: list[PieceDto]
    legal_moves: list[str]
    move_history: list[MoveHistoryEntry]
    last_move: LastMoveDto | None
    check: bool
    game_over: bool
    result: GameResultDto | None
    clock: ClockStateDto
    mode: GameMode
    human_color: Color | None
    orientation: Color
```

UCI move strings should use standard coordinate notation:

```text
e2e4
e7e8q
e1g1
```

---

## 6.3 Piece Identity Requirement

The backend should return stable piece IDs so the frontend can animate pieces cleanly.

At game creation, assign deterministic IDs such as:

```text
white-rook-a1
white-knight-b1
white-bishop-c1
white-queen-d1
white-king-e1
white-bishop-f1
white-knight-g1
white-rook-h1
white-pawn-a2
...
black-pawn-h7
black-rook-h8
```

Maintain a mapping:

```python
piece_ids_by_square: dict[chess.Square, str]
```

When a move is applied:

```text
Move the piece ID from source square to target square.
Remove captured piece ID.
Handle en passant captured pawn square.
Handle castling rook movement.
Preserve pawn ID on promotion.
Snapshot piece ID map before each move so undo can restore it.
```

This is not needed for chess legality, but it is needed for smooth UI animation.

---

## 6.4 Backend Endpoints

Implement the following endpoints.

### `GET /api/health`

Returns:

```json
{
  "ok": true
}
```

### `POST /api/games`

Creates a new game.

Request:

```json
{
  "mode": "human_vs_engine",
  "human_color": "white",
  "clock": {
    "enabled": true,
    "initial_ms": 600000,
    "increment_ms": 0
  },
  "engine": {
    "limit_type": "movetime",
    "movetime_ms": 1000,
    "depth": null,
    "skill_level": 20,
    "threads": 1,
    "hash_mb": 64
  }
}
```

Returns `GameStateDto`.

### `GET /api/games/{game_id}`

Returns current `GameStateDto`.

### `POST /api/games/{game_id}/move`

Applies a human/user move.

Request:

```json
{
  "from": "e2",
  "to": "e4",
  "promotion": null
}
```

Behavior:

```text
Validate game exists.
Validate game is not over.
Construct python-chess Move.
Validate move is legal.
Apply move.
Update piece IDs.
Update SAN/FEN/history.
Update clock.
Detect game result.
Return updated GameStateDto.
```

Illegal move response should be HTTP 400.

### `POST /api/games/{game_id}/engine-move`

Asks Stockfish to play the current side to move.

Behavior:

```text
Validate game exists.
Validate game is not over.
Ask engine service for a move.
Validate returned move is legal.
Apply move.
Update state.
Return updated GameStateDto.
```

If Stockfish is unavailable, return HTTP 503.

If Stockfish returns an illegal move, return HTTP 502 and do not mutate game state.

### `POST /api/games/{game_id}/undo`

Request:

```json
{
  "plies": 2
}
```

Behavior:

```text
Undo the requested number of half-moves.
Restore board state.
Restore piece identity map.
Restore move history.
Recompute game status.
Return updated GameStateDto.
```

If `plies` exceeds available moves, undo as many as possible or return 400. Pick one behavior and test it. Prefer returning 400 to avoid silent surprises.

### `POST /api/games/{game_id}/resign`

Request:

```json
{
  "color": "white"
}
```

Behavior:

```text
Mark game as over.
Winner is opposite color.
Reason is resignation.
Return updated GameStateDto.
```

### `POST /api/games/{game_id}/reset`

Optional if `POST /api/games` is already sufficient. If implemented, it should reset the same game ID with the existing settings.

---

## 6.5 Clock Behavior

Implement a small `ClockService` or equivalent helper.

Clock settings:

```text
enabled
initial_ms
increment_ms
```

Clock state:

```text
white_ms
black_ms
active_color
last_started_at_monotonic
```

Behavior:

```text
On new game with enabled clock:
  active_color = white
  white_ms = initial_ms
  black_ms = initial_ms

On legal move:
  subtract elapsed time from moving side
  add increment to moving side
  set active_color to opponent

On game over:
  active_color = null

If a clock reaches zero:
  game_over = true
  reason = timeout
  winner = opposite color
```

Use an injectable time source for tests. Do not directly call `time.monotonic()` inside logic that cannot be mocked.

---

## 6.6 Stockfish Service

Implement a service abstraction.

```python
class EngineProtocol(Protocol):
    def choose_move(self, board: chess.Board, settings: EngineSettings) -> chess.Move:
        ...
```

Production implementation:

```text
StockfishEngineService
```

Test implementation:

```text
FakeEngineService
```

Production behavior:

```text
Read STOCKFISH_PATH from environment.
Start Stockfish lazily or at app startup.
Use python-chess SimpleEngine.popen_uci.
Apply options:
  Skill Level
  Threads
  Hash
Use chess.engine.Limit:
  movetime_ms -> Limit(time=movetime_ms / 1000)
  depth -> Limit(depth=depth)
Return chess.Move.
Protect engine access with a lock.
Quit engine on FastAPI shutdown.
```

Unit tests must not require real Stockfish.

Add one optional integration test that is skipped unless `STOCKFISH_PATH` exists.

---

## 6.7 Backend Error Format

Use stable JSON errors.

Example:

```json
{
  "detail": {
    "code": "illegal_move",
    "message": "Move e2e5 is illegal in the current position."
  }
}
```

Recommended error codes:

```text
game_not_found
game_over
illegal_move
invalid_promotion
engine_unavailable
engine_returned_illegal_move
invalid_undo
```

---

# 7. Frontend Specification

## 7.1 Core Frontend Design

The frontend should have one main game controller hook:

```ts
useGame()
```

The hook should own:

```text
Current GameStateDto
Loading state
Pending move state
Selected square
Board orientation
Settings
API calls
Human move flow
Engine move flow
Self-play loop state
```

The board component should be mostly presentational. It receives:

```ts
type BoardProps = {
  pieces: PieceDto[];
  legalMoves: string[];
  lastMove: LastMoveDto | null;
  orientation: "white" | "black";
  check: boolean;
  turn: "white" | "black";
  disabled: boolean;
  onMove: (move: { from: string; to: string; promotion?: "q" | "r" | "b" | "n" | null }) => void;
};
```

---

## 7.2 Visual Layout

Implement a chess.com-inspired shell:

```text
App
  GameColumn
    Opponent PlayerBar
    BoardFrame
      Board
    Bottom PlayerBar
  SidePanel
    Controls
    MoveList
    SettingsPanel
```

For narrow screens, the side panel may collapse below the board.

Approximate visual style:

```css
--app-bg: #302e2b;
--panel-bg: #262421;
--panel-bg-light: #3a3835;
--text-main: #f5f5f5;
--text-muted: #b8b8b8;
--light-square: #d8b778;
--dark-square: #946233;
--last-move: rgba(255, 255, 0, 0.25);
--legal-dot: rgba(0, 0, 0, 0.24);
--capture-ring: rgba(0, 0, 0, 0.32);
```

The layout should include:

```text
Opponent avatar placeholder
Opponent name
Opponent clock
Settings icon button
Board coordinates
Player avatar placeholder
Player name
Player clock
Main controls
Move list
```

Use local or generated placeholder assets. Do not use chess.com assets.

---

## 7.3 Board Geometry

Implement board geometry in a pure TypeScript module.

Required functions:

```ts
export type Orientation = "white" | "black";

export function indexToSquare(index: number, orientation: Orientation): string;

export function squareToIndex(square: string, orientation: Orientation): number;

export function squareToRowCol(square: string, orientation: Orientation): { row: number; col: number };

export function rowColToSquare(row: number, col: number, orientation: Orientation): string;

export function clientPointToSquare(
  clientX: number,
  clientY: number,
  boardRect: DOMRect,
  orientation: Orientation
): string | null;
```

Expected behavior:

```text
White orientation:
  a8 is top-left
  h8 is top-right
  a1 is bottom-left
  h1 is bottom-right

Black orientation:
  h1 is top-left
  a1 is top-right
  h8 is bottom-left
  a8 is bottom-right
```

This module must be heavily unit tested.

---

## 7.4 Piece Rendering

Pieces should be absolutely positioned over the board, not nested inside squares.

Reason:

```text
Absolute positioning makes smooth movement animation much easier.
```

Board structure:

```html
<div className="board">
  <div className="squares-grid">...</div>
  <div className="pieces-layer">...</div>
  <div className="coordinates-layer">...</div>
  <div className="highlights-layer">...</div>
</div>
```

Each piece:

```css
.piece {
  position: absolute;
  width: 12.5%;
  height: 12.5%;
  transform: translate(var(--x), var(--y));
  transition: transform 160ms ease;
  will-change: transform;
  touch-action: none;
  user-select: none;
}

.piece.dragging {
  transition: none;
  z-index: 50;
  cursor: grabbing;
}
```

Piece rendering should support two modes:

```text
Preferred: image assets from /pieces/{theme}/{piece}.svg
Fallback: Unicode chess glyphs
```

Piece asset names, if present:

```text
white-pawn.svg
white-knight.svg
white-bishop.svg
white-rook.svg
white-queen.svg
white-king.svg
black-pawn.svg
black-knight.svg
black-bishop.svg
black-rook.svg
black-queen.svg
black-king.svg
```

---

## 7.5 Drag-and-Drop Behavior

Do not use native HTML drag-and-drop. Use pointer events.

Required behavior:

```text
pointerdown on own movable piece:
  capture pointer
  mark piece as dragging
  store source square
  show legal target hints

pointermove:
  move piece with cursor
  keep piece centered under pointer
  disable CSS transition during drag

pointerup:
  convert pointer coordinates to target square
  if outside board:
    snap piece back
  if target is legal normal move:
    call onMove
  if target requires promotion:
    open promotion modal
  if target is illegal:
    snap piece back
```

Legal target discovery:

```ts
function legalTargetsForSquare(square: string, legalMoves: string[]): string[] {
  return legalMoves
    .filter((uci) => uci.slice(0, 2) === square)
    .map((uci) => uci.slice(2, 4));
}
```

Promotion detection:

```ts
function promotionOptionsForMove(from: string, to: string, legalMoves: string[]) {
  return legalMoves
    .filter((uci) => uci.slice(0, 2) === from && uci.slice(2, 4) === to && uci.length === 5)
    .map((uci) => uci[4] as "q" | "r" | "b" | "n");
}
```

If promotion options exist, do not submit immediately. Show `PromotionModal`.

---

## 7.6 Move Animation

Required animation behavior:

```text
Legal move:
  piece animates from source square to target square.

Illegal move:
  dragged piece animates back to source square.

Capture:
  captured piece disappears when move is accepted.

Engine move:
  engine piece animates from source square to target square.

Undo:
  board updates cleanly; animation is optional for undo.
```

Implementation note:

```text
Because the backend returns stable piece IDs, React keys should use piece.id.
This allows CSS transform transitions to animate the same piece between squares.
```

---

## 7.7 Highlights

The board should visually display:

```text
Last move source square
Last move destination square
Selected piece square
Legal quiet move dots
Legal capture rings
King in check
```

Do not over-test visual CSS. Unit test only the state and class selection logic.

---

## 7.8 Controls

Implement a `Controls` component with:

```text
New Game
Flip Board
Undo
Resign
Self-Play Start/Pause
Self-Play Step
Settings
```

Behavior:

```text
New Game:
  POST /api/games with current settings.

Flip Board:
  local frontend orientation toggle.

Undo:
  POST /api/games/{game_id}/undo.
  In human_vs_engine mode, default to 2 plies if at least 2 plies exist.
  Otherwise default to 1 ply.

Resign:
  POST /api/games/{game_id}/resign.

Self-Play Start:
  Repeatedly call /engine-move while game is not over.
  Use a frontend interval or async loop.
  Do not implement backend background workers for v1.

Self-Play Pause:
  Stop the frontend loop.

Self-Play Step:
  Call /engine-move exactly once.
```

---

## 7.9 Settings Panel

Implement settings with:

```text
Game mode:
  Human vs Engine
  Engine vs Engine
  Human vs Human

Human side:
  White
  Black
  Random

Engine limit:
  Move time in milliseconds
  Fixed depth

Engine skill:
  0 to 20

Clock:
  Enabled
  Initial minutes
  Increment seconds

Board orientation:
  White
  Black
  Auto
```

Settings do not need to persist across browser reloads in v1.

---

## 7.10 Human vs Engine Flow

Required flow:

```text
On app load:
  create new game

When human moves:
  POST /move
  update state
  if game not over and next side is engine:
    wait approximately 150-250 ms so human move is visible
    POST /engine-move
    update state
```

If human chose black:

```text
After new game is created:
  immediately request /engine-move for White
```

The UI must disable board input while the engine move request is pending.

---

## 7.11 Engine vs Engine Self-Play Flow

Required flow:

```text
New game with mode engine_vs_engine.
Self-Play Step calls /engine-move once.
Self-Play Start repeatedly calls /engine-move until paused or game over.
Self-Play Pause stops the loop.
```

Use a visible delay between moves, for example:

```text
300 ms to 800 ms
```

This is for watchability.

---

# 8. Backend Unit Tests

Use `pytest`.

Real Stockfish must not be required for normal unit tests.

## 8.1 `test_game_service.py`

Required tests:

```text
test_create_game_has_initial_position
```

Assertions:

```text
32 pieces returned
turn is white
game_over is false
legal_moves contains e2e4
white and black clocks initialized to 600000 ms when enabled
```

```text
test_apply_legal_move_updates_board
```

Action:

```text
apply e2e4
```

Assertions:

```text
turn is black
fen contains white pawn on e4
last_move.uci == e2e4
move_history length is 1
legal_moves now belong to black
```

```text
test_apply_illegal_move_rejected
```

Action:

```text
apply e2e5 from start position
```

Assertions:

```text
raises IllegalMoveError or returns HTTP 400 through API-level test
board is unchanged
move_history remains empty
```

```text
test_capture_updates_piece_identity_map
```

Use a short move sequence:

```text
e2e4
d7d5
e4d5
```

Assertions:

```text
white pawn ID moved to d5
black pawn ID from d7 is removed
piece count is 31
```

```text
test_en_passant_updates_piece_identity_map
```

Use a valid en passant setup.

Example sequence:

```text
e2e4
a7a6
e4e5
d7d5
e5d6
```

Assertions:

```text
white pawn is on d6
black pawn from d5 is removed
piece count is 31
```

```text
test_castling_updates_king_and_rook_piece_ids
```

Use either a custom FEN or legal sequence enabling castling.

Assertions after white castles kingside:

```text
white king ID is on g1
white rook original h1 ID is on f1
```

```text
test_promotion_preserves_piece_id_and_changes_type
```

Use custom FEN with a white pawn on e7.

Action:

```text
e7e8q
```

Assertions:

```text
same piece ID now appears on e8
piece type is queen
last_move.uci == e7e8q
```

```text
test_fools_mate_detects_checkmate
```

Sequence:

```text
f2f3
e7e5
g2g4
d8h4
```

Assertions:

```text
game_over is true
reason is checkmate
winner is black
result is 0-1
```

```text
test_undo_restores_board_piece_ids_and_history
```

Sequence:

```text
e2e4
e7e5
undo 2 plies
```

Assertions:

```text
fen equals starting FEN
move_history is empty
piece IDs match starting piece IDs
turn is white
```

```text
test_engine_move_uses_fake_engine_and_updates_state
```

Use fake engine returning `e2e4`.

Assertions:

```text
move is applied
fake engine was called once
game state is updated
```

```text
test_fake_engine_illegal_move_does_not_mutate_state
```

Use fake engine returning illegal move `e2e5`.

Assertions:

```text
error is raised
fen unchanged
history unchanged
```

---

## 8.2 `test_clock_service.py`

Required tests:

```text
test_clock_initializes_enabled
```

Assertions:

```text
white_ms == initial_ms
black_ms == initial_ms
active_color == white
```

```text
test_clock_applies_elapsed_time_and_increment
```

Use fake monotonic time.

Example:

```text
initial = 600000
increment = 2000
white moves after 5000 ms
```

Assertions:

```text
white_ms == 597000
black_ms == 600000
active_color == black
```

Because:

```text
600000 - 5000 + 2000 = 597000
```

```text
test_clock_timeout_sets_result
```

Use small initial clock.

Assertions:

```text
moving side reaches zero
timeout result is generated
winner is opposite color
```

```text
test_clock_disabled_has_null_times
```

Assertions:

```text
white_ms is None
black_ms is None
active_color is None
```

---

## 8.3 `test_api.py`

Use FastAPI test client and a fake engine dependency.

Required tests:

```text
test_health
```

Expected:

```json
{"ok": true}
```

```text
test_create_game_endpoint
```

Assertions:

```text
status 200
response has game_id
response has 32 pieces
response has legal moves
```

```text
test_get_game_endpoint
```

Assertions:

```text
created game can be fetched
game_id matches
```

```text
test_move_endpoint_accepts_legal_move
```

Action:

```json
{"from": "e2", "to": "e4", "promotion": null}
```

Assertions:

```text
status 200
last_move.uci == e2e4
turn == black
```

```text
test_move_endpoint_rejects_illegal_move
```

Action:

```json
{"from": "e2", "to": "e5", "promotion": null}
```

Assertions:

```text
status 400
error code == illegal_move
```

```text
test_engine_move_endpoint
```

Fake engine returns `e2e4`.

Assertions:

```text
status 200
last_move.uci == e2e4
```

```text
test_undo_endpoint
```

Action:

```text
create game
move e2e4
undo 1
```

Assertions:

```text
turn == white
move_history empty
```

```text
test_resign_endpoint
```

Action:

```json
{"color": "white"}
```

Assertions:

```text
game_over is true
winner is black
reason is resignation
```

```text
test_missing_game_returns_404
```

Assertions:

```text
status 404
error code == game_not_found
```

---

## 8.4 Optional `test_stockfish_service.py`

Mark these tests with something like:

```python
pytestmark = pytest.mark.stockfish
```

Skip unless `STOCKFISH_PATH` exists.

Required optional integration test:

```text
test_real_stockfish_returns_legal_starting_move
```

Assertions:

```text
engine returns a move
move is legal in starting position
```

This test should not run in ordinary CI unless explicitly enabled.

---

# 9. Frontend Unit Tests

Use Vitest and React Testing Library.

## 9.1 `boardGeometry.test.ts`

Required tests:

```text
white_orientation_index_mapping
```

Assertions:

```text
indexToSquare(0, "white") == "a8"
indexToSquare(7, "white") == "h8"
indexToSquare(56, "white") == "a1"
indexToSquare(63, "white") == "h1"
```

```text
black_orientation_index_mapping
```

Assertions:

```text
indexToSquare(0, "black") == "h1"
indexToSquare(7, "black") == "a1"
indexToSquare(56, "black") == "h8"
indexToSquare(63, "black") == "a8"
```

```text
square_to_row_col_white
```

Assertions:

```text
squareToRowCol("a8", "white") == { row: 0, col: 0 }
squareToRowCol("h1", "white") == { row: 7, col: 7 }
squareToRowCol("e4", "white") == { row: 4, col: 4 }
```

```text
square_to_row_col_black
```

Assertions:

```text
squareToRowCol("h1", "black") == { row: 0, col: 0 }
squareToRowCol("a8", "black") == { row: 7, col: 7 }
```

```text
client_point_to_square_white
```

Mock board rect:

```text
left = 0
top = 0
width = 800
height = 800
```

Assertions:

```text
point (50, 50) -> a8
point (750, 750) -> h1
point (-1, 10) -> null
point (801, 10) -> null
```

```text
client_point_to_square_black
```

Assertions:

```text
point (50, 50) -> h1
point (750, 750) -> a8
```

---

## 9.2 `Board.test.tsx`

Use a sample `GameStateDto` from the starting position.

Required tests:

```text
renders_64_squares
```

Assertions:

```text
64 square elements exist
```

```text
renders_all_starting_pieces
```

Assertions:

```text
32 piece elements exist
white king is on e1
black king is on e8
```

```text
shows_last_move_highlights
```

Given last move `e2e4`, assertions:

```text
source square has last-move class
target square has last-move class
```

```text
shows_legal_move_hints_for_selected_piece
```

Given legal moves include `e2e3`, `e2e4`.

Action:

```text
pointerdown or click white pawn on e2
```

Assertions:

```text
e3 hint appears
e4 hint appears
```

```text
drag_legal_move_calls_onMove
```

Mock board rect as 800x800.

Action:

```text
pointerdown on e2 pawn
pointermove to e4 square
pointerup on e4 square
```

Assertions:

```text
onMove called with { from: "e2", to: "e4", promotion: null }
```

```text
drag_illegal_move_does_not_call_onMove
```

Action:

```text
drag e2 pawn to e5
```

Assertions:

```text
onMove not called
piece returns to source square
```

```text
drag_outside_board_does_not_call_onMove
```

Assertions:

```text
onMove not called
```

```text
promotion_drag_opens_modal_instead_of_calling_onMove
```

Given legal moves:

```text
e7e8q
e7e8r
e7e8b
e7e8n
```

Action:

```text
drag e7 pawn to e8
```

Assertions:

```text
promotion modal appears
onMove not called yet
```

---

## 9.3 `PromotionModal.test.tsx`

Required tests:

```text
renders_available_promotion_options
```

Given options:

```text
q r b n
```

Assertions:

```text
queen, rook, bishop, knight buttons render
```

```text
selecting_queen_calls_onSelect_q
```

Assertions:

```text
onSelect("q") called
```

```text
cancel_closes_modal_without_move
```

Assertions:

```text
onCancel called
onSelect not called
```

---

## 9.4 `Controls.test.tsx`

Required tests:

```text
new_game_button_calls_onNewGame
flip_button_calls_onFlip
undo_button_calls_onUndo
resign_button_calls_onResign
self_play_start_pause_toggles
self_play_step_calls_onStep
settings_button_opens_settings
```

Controls should be disabled while a move or engine request is pending.

Test:

```text
controls_disabled_when_pending
```

---

## 9.5 `useGame.test.tsx`

Mock the API client.

Required tests:

```text
creates_game_on_mount
```

Assertions:

```text
POST /api/games called
state is populated
```

```text
human_move_posts_move_and_updates_state
```

Assertions:

```text
move API called with e2e4
state updated with returned game state
```

```text
human_vs_engine_triggers_engine_after_human_move
```

Given:

```text
mode = human_vs_engine
human_color = white
after human move turn = black
```

Assertions:

```text
engine-move API called after human move
```

```text
does_not_trigger_engine_if_game_over
```

Assertions:

```text
engine-move API not called
```

```text
new_game_as_black_requests_engine_first_move
```

Assertions:

```text
after new game with human_color black and turn white, engine-move API called
```

```text
self_play_step_calls_engine_once
```

Assertions:

```text
engine-move API called exactly once
```

```text
self_play_loop_stops_on_game_over
```

Use fake timers.

Assertions:

```text
engine-move stops after returned state has game_over true
```

---

# 10. Implementation Milestones

Codex should implement in this order.

## Milestone 1: Backend Domain Layer

Implement:

```text
models.py
errors.py
clock_service.py
game_service.py
stockfish_service.py fake interface
```

Tests to pass:

```text
test_clock_service.py
test_game_service.py using FakeEngineService
```

No frontend work yet.

## Milestone 2: Backend API Layer

Implement:

```text
main.py
FastAPI routes
CORS
dependency injection for GameService and EngineProtocol
stable error responses
```

Tests to pass:

```text
test_api.py
```

## Milestone 3: Frontend API Client and Types

Implement:

```text
types/chess.ts
api/client.ts
useGame.ts basic create/load/move/engine move logic
```

Tests to pass:

```text
useGame.test.tsx
```

## Milestone 4: Board Geometry and Static Board

Implement:

```text
boardGeometry.ts
Board static rendering
square rendering
piece rendering
orientation support
coordinates
```

Tests to pass:

```text
boardGeometry.test.ts
Board renders 64 squares
Board renders pieces
```

## Milestone 5: Dragging and Promotion

Implement:

```text
usePieceDrag.ts
pointer event movement
legal move hints
snapback
promotion modal
```

Tests to pass:

```text
Board drag tests
PromotionModal tests
```

## Milestone 6: Game Shell UI

Implement:

```text
App layout
PlayerBar
Clock
Controls
MoveList
SettingsPanel
visual styling
```

Tests to pass:

```text
Controls tests
basic App render test if present
```

## Milestone 7: Full Local Play

Wire together:

```text
human vs engine
engine vs engine step
engine vs engine autoplay
new game
undo
resign
flip
settings
```

Manual acceptance tests should pass.

---

# 11. Manual Acceptance Tests

After implementation, these should work in the browser.

## 11.1 Initial Load

```text
Open http://localhost:5173.
A chess board appears.
White pieces are at the bottom.
Opponent bar is above board.
Player bar is below board.
Both clocks show 10:00 by default.
Controls are visible.
```

## 11.2 Human Move

```text
Drag white pawn from e2 to e4.
Piece follows cursor.
Legal target hints appear.
On release, pawn animates to e4.
Move appears in move list as e4.
Turn changes to black.
```

## 11.3 Engine Reply

```text
After human move, board input is disabled briefly.
Stockfish chooses a black move.
Black piece animates to destination.
Move list updates.
Turn returns to white.
```

## 11.4 Illegal Move

```text
Drag pawn from e2 to e5 in starting position.
Move is rejected.
Piece snaps back to e2.
No backend state mutation occurs.
```

## 11.5 Promotion

Use a test position or play to promotion.

```text
Drag pawn to final rank.
Promotion modal appears.
Select queen.
Move is submitted as e7e8q or equivalent.
Promoted piece appears as queen.
```

## 11.6 Flip Board

```text
Click Flip Board.
Board orientation reverses.
Coordinates update.
Pieces remain on correct logical squares.
Dragging still maps to correct squares.
```

## 11.7 Undo

```text
After human and engine have each moved, click Undo.
Both plies are undone in human-vs-engine mode.
Position returns to before the human move.
```

## 11.8 Resign

```text
Click Resign.
Game ends.
Result is displayed.
Board input is disabled.
```

## 11.9 Self-Play

```text
Create engine-vs-engine game.
Click Self-Play Step.
One engine move is made.
Click Self-Play Start.
Engines continue playing with visible delay.
Click Pause.
Self-play stops.
```

---

# 12. Test Commands

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
```

Full local run:

```bash
# terminal 1
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# terminal 2
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

Open:

```text
http://localhost:5173
```

---

# 13. Definition of Done

The implementation is complete when:

```text
Backend unit tests pass without requiring real Stockfish.
Frontend unit tests pass.
Optional Stockfish integration test passes when STOCKFISH_PATH is valid.
The browser UI loads on localhost.
Human vs Stockfish is playable.
Stockfish vs Stockfish self-play works.
Dragging, legal hints, snapback, promotion, undo, resign, new game, flip board, and clocks work.
The UI has a chess.com-like layout without copying chess.com assets.
The backend remains authoritative for chess legality.
The frontend does not directly communicate with Stockfish.
```

---

