# Local Chess UI

A localhost chess web application with a FastAPI backend and a React/Vite frontend. The backend is authoritative for game state, legal move validation, clocks, move history, game results, undo/resign behavior, and Stockfish access. The frontend renders the board, handles pointer-based input, animations, settings, move list, and self-play controls.

This project implements the contract in [docs/engineering_spec.md](docs/engineering_spec.md).

## Features

- Human vs Stockfish, human vs human, and engine vs engine modes
- Backend-side move legality with `python-chess`
- Stable backend piece IDs for frontend animation
- Clock support with increments and timeout results
- Live frontend clock display between backend responses
- Move history, SAN/UCIs, check/checkmate/stalemate/draw result detection
- Undo and resign endpoints
- Optional Stockfish integration through `STOCKFISH_PATH`
- Stockfish availability endpoint for clearer engine setup feedback
- Optional FEN input for manual test positions
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
docs/
  engineering_spec.md     Original implementation contract
  IMPLEMENTATION_STATE.md Current status, follow-ups, and roadmap
  assessment-01.md        Implementation assessment and follow-up backlog
```

## Requirements

- WSL 2 with a recent Ubuntu distribution
- Python 3.11+
- Node.js 22 LTS or newer with npm
- Optional, for real engine play: a Linux Stockfish binary

## WSL System Setup

Use these steps to prepare a WSL environment with the non-Python project dependencies. After this section is complete, the repository has the OS tools, Node/npm tooling, and Stockfish binary it needs; then install the Python packages from `requirements.txt`.

1. Install WSL 2 and Ubuntu from a Windows PowerShell terminal:

```powershell
wsl --install -d Ubuntu
wsl --update
wsl --shutdown
```

Restart the terminal, open Ubuntu, and create the Linux username/password when prompted. If WSL is already installed, confirm the distro is using WSL 2:

```powershell
wsl -l -v
```

2. Update Ubuntu and install the system packages this repository expects:

```bash
sudo apt update
sudo apt install -y \
  build-essential \
  ca-certificates \
  curl \
  git \
  gnupg \
  tar \
  unzip \
  xz-utils \
  python3 \
  python3-pip \
  python3-venv
```

3. Install Node.js and npm. The frontend toolchain works with Node.js 22 LTS or newer; this uses the NodeSource Node.js 22 package:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version
```

4. Clone the repository inside the WSL Linux filesystem for better file watching and install performance:

```bash
mkdir -p ~/src
cd ~/src
git clone <repository-url> chess-ui
cd chess-ui
```

If you already have the repository, just `cd` to its WSL path.

5. Install the latest stable Stockfish release.

As of 2026-06-11, [Stockfish 18](https://github.com/official-stockfish/Stockfish/releases/tag/sf_18) is the [official latest stable release](https://stockfishchess.org/download/). The official download page recommends the Linux x64 AVX2 build for most Intel 2013+ and AMD 2015+ CPUs. The commands below install AVX2 when available and fall back to the generic Linux x64 build otherwise:

```bash
if grep -qm1 avx2 /proc/cpuinfo; then
  STOCKFISH_ASSET=stockfish-ubuntu-x86-64-avx2.tar
else
  STOCKFISH_ASSET=stockfish-ubuntu-x86-64.tar
fi

curl -L \
  -o "/tmp/${STOCKFISH_ASSET}" \
  "https://github.com/official-stockfish/Stockfish/releases/latest/download/${STOCKFISH_ASSET}"
mkdir -p /tmp/stockfish-install
tar -xf "/tmp/${STOCKFISH_ASSET}" -C /tmp/stockfish-install
sudo install -m 0755 \
  "/tmp/stockfish-install/stockfish/${STOCKFISH_ASSET%.tar}" \
  /usr/local/bin/stockfish
```

Verify Stockfish is installed and executable:

```bash
stockfish bench 1 1 1
```

The first output line should start with `Stockfish 18`. Ubuntu's `apt install stockfish` package can be easier, but it may lag behind the latest official Stockfish release.

6. Configure the backend to use the installed Stockfish binary:

```bash
cp .env.example .env
```

If you already have a root `.env` file, make sure it contains `STOCKFISH_PATH=/usr/local/bin/stockfish`.

7. Install frontend dependencies:

```bash
cd frontend
npm install
cd ..
```

8. Verify the non-Python setup:

```bash
node --version
npm --version
stockfish bench 1 1 1
cd frontend
npm test
cd ..
```

Install Python dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

If you did not install frontend dependencies during the WSL setup above, install them now:

```bash
cd frontend
npm install
```

## Stockfish Configuration

For real engine play, create a root `.env` file pointing at the Linux Stockfish binary:

```bash
STOCKFISH_PATH=/usr/local/bin/stockfish
```

Normal unit tests do not require Stockfish. The optional Stockfish integration test is opt-in with `RUN_STOCKFISH_TESTS=1`.

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
RUN_STOCKFISH_TESTS=1 STOCKFISH_PATH=/usr/local/bin/stockfish pytest -m stockfish
```

Frontend:

```bash
cd frontend
npm test
npm run build
npm run lint
```

## API Overview

- `GET /api/health`
- `GET /api/engine/status`
- `POST /api/games`
- `GET /api/games/{game_id}`
- `POST /api/games/{game_id}/move`
- `POST /api/games/{game_id}/engine-move`
- `POST /api/games/{game_id}/undo`
- `POST /api/games/{game_id}/resign`
- `POST /api/games/{game_id}/reset`

See [docs/engineering_spec.md](docs/engineering_spec.md), [docs/IMPLEMENTATION_STATE.md](docs/IMPLEMENTATION_STATE.md), and [docs/assessment-01.md](docs/assessment-01.md) for details.
