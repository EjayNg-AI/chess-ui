## Remaining issues to fix

### 1. Engine status is only a path check

`StockfishEngineService.status()` currently reports available when `STOCKFISH_PATH` exists. It does **not** verify that the file is executable, that it is a valid Stockfish binary, or that it responds to `uci`/`isready`. 

For a local MVP, this is fine. For a more reliable app, I would split status into:

```json
{
  "configured": true,
  "path_exists": true,
  "executable": true,
  "uci_ready": true,
  "error": null
}
```

or at least rename the current field from `available` to something less strong, such as `path_available`.

### 2. Self-play controls are still mode-blind

The `Controls` component always renders “Self-Play Start” and “Self-Play Step” enabled whenever `pending` is false. It receives no `mode` or `game_over` prop.   Meanwhile, `engineMoveOnce()` only checks that a game exists and is not over; it does not check that the game mode is `engine_vs_engine`. 

That means a user can likely press “Self-Play Step” during a human-vs-engine or human-vs-human game and make Stockfish move for the side to move. That is probably not intended.

I would change the controls API to include:

```ts
mode: GameMode | null
gameOver: boolean
engineAvailable: boolean
```

Then disable self-play buttons unless:

```ts
mode === "engine_vs_engine" && !gameOver && engineAvailable
```

### 3. Engine-unavailable warning is helpful but not yet a recovery workflow

The app now shows a warning when Stockfish is unavailable, based on the current settings mode and `engineStatus.available === false`.   That is a good step, but the UX is still passive. It does not offer “switch to Human vs Human,” “retry engine check,” or “open setup instructions.”

A good next pass would add a small engine-status card:

```text
Stockfish unavailable
STOCKFISH_PATH is not configured.

Actions:
[Retry] [Switch to Human vs Human] [Show setup command]
```

The hook already exposes `refreshEngineStatus`, so the retry action is straightforward. 

### 4. Frontend settings can still create invalid backend requests

Backend validation is solid now, but the frontend settings panel still lets users type arbitrary numeric values into several inputs. Some have HTML `min`/`max`, but those are not full validation, and browser enforcement varies depending on interaction.  

That is acceptable because the backend rejects bad input. But for a nicer product, the frontend should clamp or validate before sending. For example:

```ts
movetime_ms: clamp(Number(value), 50, 60_000)
skill_level: clamp(Number(value), 0, 20)
initial_ms: clamp(minutes * 60_000, 1_000, 86_400_000)
```

### 5. Backend lint/type checks are not yet part of CI

The root requirements include `ruff` and `mypy`, but the CI backend job only installs requirements and runs `pytest`.  

I would add:

```yaml
- name: Ruff
  run: ruff check backend

- name: Mypy
  run: mypy backend/app
```

You may need a small `pyproject.toml` first. Even if `mypy` is initially too strict, `ruff` should be easy to add immediately.

### 6. `index.html` still has the placeholder title

This is small but worth fixing before screenshots or sharing. The HTML title is still `frontend`. 

Change it to:

```html
<title>Local Chess UI</title>
```

### 7. `.env.example` appears to be intended but absent

The `.gitignore` explicitly un-ignores `.env.example`, which suggests you intended to commit one.  The README tells users to create a root `.env` with `STOCKFISH_PATH`, but I could not find an actual committed `.env.example`. 

Add:

```bash
STOCKFISH_PATH=/usr/local/bin/stockfish
```

to `.env.example`.

### 8. Result-reason schema is slightly broader than current behavior

The implementation state says current automatic result detection covers checkmate, stalemate, insufficient material, seventy-five-move rule, and fivefold repetition.  But the shared result-reason types still include `fifty_move_claim` and `threefold_claim`. 

That is fine if you plan to add explicit “claim draw” endpoints later. If not, remove those two reason variants to keep the schema honest.

---

## Best next follow-ups

I would prioritize the next tasks in this order:

1. **Real WSL browser smoke test with Stockfish**. Confirm `STOCKFISH_PATH`, play a human-vs-engine game, test human-as-black, self-play, undo, promotion from FEN, and timeout.

2. **Mode-aware controls**. Disable self-play controls outside `engine_vs_engine`, disable engine actions when Stockfish is unavailable, and avoid accidental engine moves for the human side.

3. **Add Playwright**. Cover at least: page loads, drag `e2` to `e4`, engine reply occurs with a test backend/fake mode, illegal move snaps back, FEN promotion modal appears, flip-board square mapping still works.

4. **Improve engine status**. Check executable permission and optionally run a lightweight `uci/isready` probe.

5. **Add backend linting to CI**. Start with `ruff check backend`; add `mypy` after a basic config exists.

6. **Polish metadata and setup files**. Add `.env.example`, change the page title, and optionally add `.python-version` / `.nvmrc`.

The revisions are directionally very good. I would not refactor heavily right now; I would harden the edge cases above and then start validating the app through actual browser-driven tests.
