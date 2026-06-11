import type { GameStateDto, MoveRequest, NewGameRequest } from '../types/chess'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

type ApiErrorBody = {
  detail?: {
    code?: string
    message?: string
  }
}

export class ApiError extends Error {
  code: string
  status: number

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    let body: ApiErrorBody = {}
    try {
      body = (await response.json()) as ApiErrorBody
    } catch {
      body = {}
    }
    throw new ApiError(
      response.status,
      body.detail?.code ?? 'api_error',
      body.detail?.message ?? `Request failed with status ${response.status}`,
    )
  }

  return (await response.json()) as T
}

export const gameApi = {
  createGame(request: NewGameRequest): Promise<GameStateDto> {
    return requestJson<GameStateDto>('/api/games', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  },

  getGame(gameId: string): Promise<GameStateDto> {
    return requestJson<GameStateDto>(`/api/games/${gameId}`)
  },

  move(gameId: string, move: MoveRequest): Promise<GameStateDto> {
    return requestJson<GameStateDto>(`/api/games/${gameId}/move`, {
      method: 'POST',
      body: JSON.stringify(move),
    })
  },

  engineMove(gameId: string): Promise<GameStateDto> {
    return requestJson<GameStateDto>(`/api/games/${gameId}/engine-move`, {
      method: 'POST',
    })
  },

  undo(gameId: string, plies: number): Promise<GameStateDto> {
    return requestJson<GameStateDto>(`/api/games/${gameId}/undo`, {
      method: 'POST',
      body: JSON.stringify({ plies }),
    })
  },

  resign(gameId: string, color: 'white' | 'black'): Promise<GameStateDto> {
    return requestJson<GameStateDto>(`/api/games/${gameId}/resign`, {
      method: 'POST',
      body: JSON.stringify({ color }),
    })
  },
}
