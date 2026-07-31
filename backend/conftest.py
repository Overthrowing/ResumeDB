"""Shared test fixtures.

`backend/` goes on sys.path so tests import `resumedb.*` exactly the way the app
does (the package is run via --app-dir, never installed).

Fixtures live here rather than per test file: every suite needs the same
scaffolded temp data repo, and a second copy of that setup drifts silently.
"""

import asyncio
import shutil
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent))

from resumedb import config  # noqa: E402
from resumedb.datarepo import DataRepo, init_datarepo  # noqa: E402


@pytest.fixture
def repo(tmp_path) -> DataRepo:
    """A freshly scaffolded, git-initialized data repo at tmp_path/data."""
    if shutil.which("git") is None:
        pytest.skip("git required")
    root = tmp_path / "data"
    init_datarepo(root)
    return DataRepo(root)


@pytest.fixture
def cfg_path(tmp_path, monkeypatch) -> Path:
    """Redirect app config at a temp file so no test can touch the developer's
    real ~/.resumedb.json."""
    path = tmp_path / "cfg.json"
    monkeypatch.setattr(config, "CONFIG_PATH", path)
    return path


@pytest.fixture
def client(repo, cfg_path):
    """A TestClient whose config points at the temp `repo`."""
    from fastapi.testclient import TestClient

    from resumedb.main import app

    config.save({"data_repo": str(repo.root)})
    return TestClient(app)


class MockAgent:
    """Stand-in for a provider agent (the ClaudeAgent/CodexAgent shape).

    events   - the normalized event dicts to stream (a canned text turn by default)
    gate     - an asyncio.Event held before the last event, to keep a turn running
    fail     - raise instead of streaming, to simulate a dead provider
    on_start - callback(cwd) run as the turn begins, to simulate an agent that
               writes files into the repo
    """

    def __init__(self, events=None, gate: asyncio.Event | None = None, fail=False,
                 on_start=None):
        self._events = events or [
            {"type": "session", "session_id": "sess-1"},
            {"type": "text_delta", "text": "hel"},
            {"type": "text_delta", "text": "lo"},
            {"type": "result", "text": "hello", "is_error": False, "cost_usd": 0},
        ]
        self._gate = gate
        self._fail = fail
        self._on_start = on_start
        self.cancelled = False

    def start_turn(self, cwd, prompt, session_id=None, model=None, effort=None):
        agent = self

        class Proc:
            async def events(self):
                if agent._fail:
                    raise RuntimeError("provider exploded")
                if agent._on_start:
                    agent._on_start(cwd)
                for i, e in enumerate(agent._events):
                    if agent._gate and i == len(agent._events) - 1:
                        await agent._gate.wait()
                    if agent.cancelled:
                        yield {"type": "error", "message": "Cancelled."}
                        return
                    yield e

            async def cancel(self):
                agent.cancelled = True
                if agent._gate:
                    agent._gate.set()

        return Proc()


@pytest.fixture
def mock_agent():
    """The MockAgent class; call it with the kwargs documented on the class."""
    return MockAgent
