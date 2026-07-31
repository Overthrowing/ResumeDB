"""TurnManager durability: replay, folding, crash reap, cancellation."""

import asyncio
import json

import pytest

from resumedb import turns
from resumedb.datarepo import DataRepo, init_datarepo
from resumedb.turns import BadScope, TurnBusy, TurnManager, check_scope


@pytest.fixture
def repo(tmp_path):
    root = tmp_path / "data"
    init_datarepo(root)
    return DataRepo(root)


class MockAgent:
    """Streams canned events; optionally blocks until released to simulate a
    long turn, or raises to simulate a dead provider."""

    def __init__(self, events=None, gate: asyncio.Event | None = None, fail=False):
        self._events = events or [
            {"type": "session", "session_id": "sess-1"},
            {"type": "text_delta", "text": "hel"},
            {"type": "text_delta", "text": "lo"},
            {"type": "result", "text": "hello", "is_error": False, "cost_usd": 0},
        ]
        self._gate = gate
        self._fail = fail
        self.cancelled = False

    def start_turn(self, cwd, prompt, session_id=None, model=None, effort=None):
        agent = self

        class Proc:
            async def events(self):
                if agent._fail:
                    raise RuntimeError("provider exploded")
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


async def collect(turn):
    return [e async for e in turn.subscribe()]


def test_scope_whitelist():
    assert check_scope("db") == "db"
    assert check_scope("app:my-app-1") == "app:my-app-1"
    for bad in ("", "APP:x", "app:", "app:../x", "a/b", "db/../.."):
        with pytest.raises(BadScope):
            check_scope(bad)


@pytest.mark.asyncio
async def test_full_turn_folds_and_cleans_up(repo):
    m = TurnManager()
    turn = m.start(repo, MockAgent(), "db", "20260101-000000", "hi", "hi", None, None)
    events = await collect(turn)
    assert events[0]["type"] == "turn_start"
    assert events[-1]["type"] == turns.TERMINAL
    msgs = turns.read_messages(turns.conv_path(repo, "db", "20260101-000000"))
    assert [m["role"] for m in msgs] == ["user", "assistant"]
    assert msgs[1]["text"] == "hello"
    # no stale turn log: reap must NOT fold a phantom interrupted message
    assert not turns.reap_stale(repo, "db", "20260101-000000", m)
    assert turns.read_messages(turns.conv_path(repo, "db", "20260101-000000")) == msgs
    assert m.active("db", "20260101-000000") is None
    assert turns.get_session(repo, "db", "20260101-000000") == "sess-1"


@pytest.mark.asyncio
async def test_late_subscriber_gets_full_replay(repo):
    gate = asyncio.Event()
    m = TurnManager()
    turn = m.start(repo, MockAgent(gate=gate), "db", "20260101-000001", "hi", "hi", None, None)
    await asyncio.sleep(0.05)  # deltas already streamed, turn still running
    assert m.active("db", "20260101-000001") is turn
    task = asyncio.create_task(collect(turn))
    await asyncio.sleep(0.01)
    gate.set()
    events = await task
    texts = [e["text"] for e in events if e["type"] == "text_delta"]
    assert texts == ["hel", "lo"]  # replayed events, no loss, no dupes
    assert events[-1]["type"] == turns.TERMINAL


@pytest.mark.asyncio
async def test_busy_conversation_rejects_second_turn(repo):
    gate = asyncio.Event()
    m = TurnManager()
    turn = m.start(repo, MockAgent(gate=gate), "db", "20260101-000002", "a", "a", None, None)
    with pytest.raises(TurnBusy):
        m.start(repo, MockAgent(), "db", "20260101-000002", "b", "b", None, None)
    gate.set()
    await collect(turn)
    assert m.active("db", "20260101-000002") is None


@pytest.mark.asyncio
async def test_provider_failure_still_terminates(repo):
    m = TurnManager()
    turn = m.start(repo, MockAgent(fail=True), "db", "20260101-000003", "hi", "hi", None, None)
    events = await collect(turn)
    assert any(e["type"] == "error" and "provider exploded" in e["message"] for e in events)
    assert events[-1]["type"] == turns.TERMINAL
    assert m.active("db", "20260101-000003") is None  # not wedged


@pytest.mark.asyncio
async def test_bad_scope_turn_terminates_without_wedging(repo):
    m = TurnManager()
    # app dir does not exist -> conv_path raises inside _run
    turn = m.start(repo, MockAgent(), "app:nope", "20260101-000004", "hi", "hi", None, None)
    events = await collect(turn)
    assert events[-1]["type"] == turns.TERMINAL
    assert m.active("app:nope", "20260101-000004") is None


def test_crash_reap_folds_partial(repo):
    m = TurnManager()
    log = turns._turn_log(repo, "db", "20260101-000005")
    for e in (
        {"type": "turn_start", "user_text": "make it"},
        {"type": "text_delta", "text": "half-finished "},
        {"type": "text_delta", "text": "answer"},
    ):
        with log.open("a") as f:
            f.write(json.dumps(e) + "\n")
    turns.append_message(
        turns.conv_path(repo, "db", "20260101-000005"), {"role": "user", "text": "make it"}
    )
    assert turns.reap_stale(repo, "db", "20260101-000005", m)
    msgs = turns.read_messages(turns.conv_path(repo, "db", "20260101-000005"))
    assert msgs[-1] == {"role": "assistant", "text": "half-finished answer", "interrupted": True}
    assert not log.exists()
    # second reap is a no-op
    assert not turns.reap_stale(repo, "db", "20260101-000005", m)
    assert turns.read_messages(turns.conv_path(repo, "db", "20260101-000005")) == msgs


@pytest.mark.asyncio
async def test_cancel_stops_turn(repo):
    gate = asyncio.Event()
    m = TurnManager()
    agent = MockAgent(gate=gate)
    turn = m.start(repo, agent, "db", "20260101-000006", "hi", "hi", None, None)
    await asyncio.sleep(0.05)
    await turn.cancel()
    events = await collect(turn)
    assert agent.cancelled
    assert events[-1]["type"] == turns.TERMINAL
    assert m.active("db", "20260101-000006") is None


@pytest.mark.asyncio
async def test_cancel_preserves_partial_answer(repo):
    """What the user watched stream must survive a Stop - dropping it silently
    was worse than the interruption."""
    gate = asyncio.Event()
    m = TurnManager()
    agent = MockAgent(gate=gate)
    turn = m.start(repo, agent, "db", "20260101-000007", "hi", "hi", None, None)
    await asyncio.sleep(0.05)  # "hel" + "lo" have streamed; result has not
    await turn.cancel()
    await collect(turn)
    msgs = turns.read_messages(turns.conv_path(repo, "db", "20260101-000007"))
    assert [m["role"] for m in msgs] == ["user", "assistant"]
    assert msgs[1]["text"] == "hello" and msgs[1]["interrupted"] is True


def test_new_conv_id_never_collides(repo):
    """Two chats started in the same second previously got the same id, and the
    second one's message was rejected or written into the first conversation."""
    first = turns.new_conv_id(repo, "db")
    turns.append_message(turns.conv_path(repo, "db", first), {"role": "user", "text": "a"})
    second = turns.new_conv_id(repo, "db")
    assert second != first
    assert turns.CONV_RE_OK(second)


def test_session_state_migrates_from_legacy(repo):
    (repo.root / ".state.json").write_text(json.dumps({"sessions": {"db/x": "old-sid"}}))
    assert turns.get_session(repo, "db", "x") == "old-sid"
    assert not (repo.root / ".state.json").exists()
    assert (repo.root / ".resumedb" / "state.json").exists()
