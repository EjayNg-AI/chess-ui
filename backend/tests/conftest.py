import pytest


def pytest_collection_modifyitems(config, items):
    if "stockfish" in config.option.markexpr:
        return

    skip_stockfish = pytest.mark.skip(reason="select with -m stockfish to run Stockfish tests")
    for item in items:
        if "stockfish" in item.keywords:
            item.add_marker(skip_stockfish)
