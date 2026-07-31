"""Codex provider: SDK notifications normalized to the shared event shape.

Codex is an optional, experimental provider - the module skips entirely when
the openai_codex SDK is not installed, exactly as the app does at runtime.
"""

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

pytest.importorskip("openai_codex")  # optional provider - skip when SDK absent

from openai_codex.generated.v2_all import (  # noqa: E402
    AgentMessageDeltaNotification,
    AgentMessageThreadItem,
    ItemCompletedNotification,
    ReasoningEffort,
    ReasoningTextDeltaNotification,
    ThreadItem,
    Turn,
    TurnCompletedNotification,
    TurnStatus,
)
from openai_codex.models import Notification  # noqa: E402

from resumedb.codex import CodexProcess, _map_effort  # noqa: E402
from resumedb.providers import get_agent  # noqa: E402


def test_effort_names_map_to_codex_reasoning_levels():
    for name in ("low", "medium", "high", "xhigh"):
        assert _map_effort(name) == ReasoningEffort(name)
    assert _map_effort("max") == ReasoningEffort.xhigh  # our "max" is Codex's xhigh
    assert _map_effort(None) is None
    assert _map_effort("invalid") is None  # a stale config value must not raise


def test_get_agent_starts_codex_turns_with_the_codex_process():
    agent = get_agent({"agent_provider": "codex", "codex_bin": "/fake/codex"})
    proc = agent.start_turn(Path("/tmp"), "hi", effort="max")
    assert isinstance(proc, CodexProcess)
    assert proc.codex_bin == "/fake/codex"
    assert proc.effort == ReasoningEffort.xhigh


@pytest.mark.anyio
async def test_codex_notifications_normalize_to_the_shared_event_shape():
    """Every consumer (turns.py, the WebSocket, the UI) reads Claude-shaped
    events, so the Codex stream has to arrive already translated."""
    mock_thread = AsyncMock()
    mock_thread.id = "thread_123"
    mock_turn_handle = MagicMock()
    mock_thread.turn.return_value = mock_turn_handle

    notif_start = Notification(method="turn/started", payload=MagicMock())
    notif_text = Notification(
        method="agent_message/delta",
        payload=AgentMessageDeltaNotification(
            delta="hello", item_id="x", thread_id="y", turn_id="z"
        ),
    )
    notif_think = Notification(
        method="reasoning/delta",
        payload=ReasoningTextDeltaNotification(
            delta="thinking", content_index=0, item_id="x", thread_id="y", turn_id="z"
        ),
    )
    notif_item = Notification(
        method="item/completed",
        payload=ItemCompletedNotification(
            item=ThreadItem(
                root=AgentMessageThreadItem(
                    id="msg_1", memory_citation=None, phase=None, text="hello",
                    type="agentMessage",
                )
            ),
            item_id="x", thread_id="y", turn_id="z", completed_at_ms=12345,
        ),
    )
    completed = MagicMock(spec=Turn)
    completed.id = "turn_1"
    completed.status = TurnStatus.completed
    completed.error = None
    notif_completed = Notification(
        method="turn/completed",
        payload=TurnCompletedNotification(thread_id="thread_123", turn=completed),
    )

    async def mock_stream():
        yield notif_start
        yield notif_text
        yield notif_think
        yield notif_item
        yield notif_completed

    mock_turn_handle.stream.side_effect = mock_stream

    with patch("resumedb.codex.AsyncCodex") as mock_async_codex_cls:
        codex_instance = AsyncMock()
        codex_instance.thread_start.return_value = mock_thread
        mock_async_codex_cls.return_value.__aenter__.return_value = codex_instance
        proc = CodexProcess(
            codex_bin="/path/to/codex", cwd=Path("/tmp"), prompt="hi",
            model="gpt-5.3-codex-spark", effort="high",
        )
        events = [ev async for ev in proc.events()]

    assert events == [
        {"type": "session", "session_id": "thread_123"},  # thread id doubles as session
        {"type": "text_delta", "text": "hello"},
        {"type": "thinking_delta", "text": "thinking"},
        {"type": "result", "text": "hello", "is_error": False, "cost_usd": None},
    ]
