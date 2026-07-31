"""TurnManager durability: replay, folding, crash reap, cancellation.

A turn must survive the WebSocket that started it; every test here exists
because losing a turn (or its partial output) was a real user-visible failure.
"""

import asyncio
import json

import pytest

from resumedb import turns
from resumedb.turns import BadScope, TurnBusy, TurnManager, check_scope


async def collect(turn):
    return [e async for e in turn.subscribe()]


def test_scope_whitelist_rejects_traversal():
    """Scopes are client-controlled and become path components."""
    assert check_scope("db") == "db"
    assert check_scope("app:my-app-1") == "app:my-app-1"
    for bad in ("", "APP:x", "app:", "app:../x", "a/b", "db/../.."):
        with pytest.raises(BadScope):
            check_scope(bad)


@pytest.mark.asyncio
async def test_completed_turn_folds_into_the_conversation_and_clears(repo, mock_agent):
    m = TurnManager()
    turn = m.start(repo, mock_agent(), "db", "20260101-000000", "hi", "hi", None, None)
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
async def test_late_subscriber_gets_full_replay(repo, mock_agent):
    """Reloading the page mid-turn must show everything already streamed."""
    gate = asyncio.Event()
    m = TurnManager()
    turn = m.start(repo, mock_agent(gate=gate), "db", "20260101-000001", "hi", "hi", None, None)
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
async def test_busy_conversation_rejects_a_second_turn(repo, mock_agent):
    gate = asyncio.Event()
    m = TurnManager()
    turn = m.start(repo, mock_agent(gate=gate), "db", "20260101-000002", "a", "a", None, None)
    with pytest.raises(TurnBusy):
        m.start(repo, mock_agent(), "db", "20260101-000002", "b", "b", None, None)
    gate.set()
    await collect(turn)
    assert m.active("db", "20260101-000002") is None


@pytest.mark.asyncio
async def test_provider_failure_terminates_without_wedging_the_conversation(repo, mock_agent):
    m = TurnManager()
    turn = m.start(repo, mock_agent(fail=True), "db", "20260101-000003", "hi", "hi", None, None)
    events = await collect(turn)
    assert any(e["type"] == "error" and "provider exploded" in e["message"] for e in events)
    assert events[-1]["type"] == turns.TERMINAL
    assert m.active("db", "20260101-000003") is None  # not wedged


@pytest.mark.asyncio
async def test_turn_on_a_missing_application_terminates_cleanly(repo, mock_agent):
    m = TurnManager()
    # app dir does not exist -> conv_path raises inside _run
    turn = m.start(repo, mock_agent(), "app:nope", "20260101-000004", "hi", "hi", None, None)
    events = await collect(turn)
    assert events[-1]["type"] == turns.TERMINAL
    assert m.active("app:nope", "20260101-000004") is None


def test_crash_reap_folds_partial_output_as_interrupted(repo):
    """A turn log with no live turn means the backend died mid-turn; the partial
    answer is folded in flagged interrupted rather than silently dropped."""
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
async def test_cancel_stops_the_agent_and_releases_the_conversation(repo, mock_agent):
    gate = asyncio.Event()
    m = TurnManager()
    agent = mock_agent(gate=gate)
    turn = m.start(repo, agent, "db", "20260101-000006", "hi", "hi", None, None)
    await asyncio.sleep(0.05)
    await turn.cancel()
    events = await collect(turn)
    assert agent.cancelled
    assert events[-1]["type"] == turns.TERMINAL
    assert m.active("db", "20260101-000006") is None


@pytest.mark.asyncio
async def test_cancel_preserves_the_partial_answer(repo, mock_agent):
    """What the user watched stream must survive a Stop - dropping it silently
    was worse than the interruption."""
    gate = asyncio.Event()
    m = TurnManager()
    turn = m.start(repo, mock_agent(gate=gate), "db", "20260101-000007", "hi", "hi", None, None)
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


def test_session_state_migrates_out_of_the_legacy_versioned_file(repo):
    """Session ids used to live in a versioned .state.json; they are
    machine-local, so they move into .resumedb/ on first read."""
    (repo.root / ".state.json").write_text(json.dumps({"sessions": {"db/x": "old-sid"}}))
    assert turns.get_session(repo, "db", "x") == "old-sid"
    assert not (repo.root / ".state.json").exists()
    assert (repo.root / ".resumedb" / "state.json").exists()
