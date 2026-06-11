from app.clock_service import ClockService
from app.models import ClockSettings


class FakeTime:
    def __init__(self) -> None:
        self.current = 0.0

    def __call__(self) -> float:
        return self.current

    def advance(self, seconds: float) -> None:
        self.current += seconds


def test_clock_initializes_enabled():
    clock = ClockService(FakeTime())
    state = clock.create_state(ClockSettings(enabled=True, initial_ms=600_000, increment_ms=0))

    assert state.white_ms == 600_000
    assert state.black_ms == 600_000
    assert state.active_color == "white"


def test_clock_applies_elapsed_time_and_increment():
    fake_time = FakeTime()
    clock = ClockService(fake_time)
    state = clock.create_state(ClockSettings(enabled=True, initial_ms=600_000, increment_ms=2_000))

    fake_time.advance(5)
    result = clock.apply_move(state, "white")

    assert result is None
    assert state.white_ms == 597_000
    assert state.black_ms == 600_000
    assert state.active_color == "black"


def test_clock_timeout_sets_result():
    fake_time = FakeTime()
    clock = ClockService(fake_time)
    state = clock.create_state(ClockSettings(enabled=True, initial_ms=1_000, increment_ms=0))

    fake_time.advance(2)
    result = clock.apply_move(state, "white")

    assert result is not None
    assert result.reason == "timeout"
    assert result.winner == "black"
    assert result.result == "0-1"
    assert state.white_ms == 0
    assert state.active_color is None


def test_clock_disabled_has_null_times():
    clock = ClockService(FakeTime())
    state = clock.create_state(ClockSettings(enabled=False))

    assert state.white_ms is None
    assert state.black_ms is None
    assert state.active_color is None
