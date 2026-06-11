from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from .models import ClockSettings, ClockStateDto, Color, GameResultDto


@dataclass
class ClockState:
    enabled: bool
    white_ms: int | None
    black_ms: int | None
    active_color: Color | None
    increment_ms: int
    last_started_at_monotonic: float | None

    def copy(self) -> "ClockState":
        return ClockState(
            enabled=self.enabled,
            white_ms=self.white_ms,
            black_ms=self.black_ms,
            active_color=self.active_color,
            increment_ms=self.increment_ms,
            last_started_at_monotonic=self.last_started_at_monotonic,
        )


def opposite_color(color: Color) -> Color:
    return "black" if color == "white" else "white"


class ClockService:
    def __init__(self, time_source: Callable[[], float]):
        self._time_source = time_source

    def create_state(self, settings: ClockSettings, active_color: Color = "white") -> ClockState:
        if not settings.enabled:
            return ClockState(
                enabled=False,
                white_ms=None,
                black_ms=None,
                active_color=None,
                increment_ms=settings.increment_ms,
                last_started_at_monotonic=None,
            )

        return ClockState(
            enabled=True,
            white_ms=settings.initial_ms,
            black_ms=settings.initial_ms,
            active_color=active_color,
            increment_ms=settings.increment_ms,
            last_started_at_monotonic=self._time_source(),
        )

    def apply_move(self, state: ClockState, moving_color: Color) -> GameResultDto | None:
        if not state.enabled or state.active_color is None:
            return None

        now = self._time_source()
        elapsed_ms = 0
        if state.last_started_at_monotonic is not None:
            elapsed_ms = max(0, int(round((now - state.last_started_at_monotonic) * 1000)))

        current_ms = state.white_ms if moving_color == "white" else state.black_ms
        remaining_ms = max(0, (current_ms or 0) - elapsed_ms)
        if moving_color == "white":
            state.white_ms = remaining_ms
        else:
            state.black_ms = remaining_ms

        if remaining_ms <= 0:
            state.active_color = None
            state.last_started_at_monotonic = None
            winner = opposite_color(moving_color)
            return GameResultDto(
                result="1-0" if winner == "white" else "0-1",
                reason="timeout",
                winner=winner,
            )

        remaining_ms += state.increment_ms
        if moving_color == "white":
            state.white_ms = remaining_ms
        else:
            state.black_ms = remaining_ms

        state.active_color = opposite_color(moving_color)
        state.last_started_at_monotonic = now
        return None

    def stop(self, state: ClockState) -> None:
        state.active_color = None
        state.last_started_at_monotonic = None

    def snapshot(self, state: ClockState) -> ClockStateDto:
        if not state.enabled:
            return ClockStateDto(
                enabled=False,
                white_ms=None,
                black_ms=None,
                active_color=None,
                increment_ms=state.increment_ms,
            )

        white_ms = state.white_ms
        black_ms = state.black_ms
        if state.active_color and state.last_started_at_monotonic is not None:
            elapsed_ms = max(
                0,
                int(round((self._time_source() - state.last_started_at_monotonic) * 1000)),
            )
            if state.active_color == "white" and white_ms is not None:
                white_ms = max(0, white_ms - elapsed_ms)
            elif state.active_color == "black" and black_ms is not None:
                black_ms = max(0, black_ms - elapsed_ms)

        return ClockStateDto(
            enabled=True,
            white_ms=white_ms,
            black_ms=black_ms,
            active_color=state.active_color,
            increment_ms=state.increment_ms,
        )
