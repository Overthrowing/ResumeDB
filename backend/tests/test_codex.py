import pytest

pytest.importorskip("openai_codex")  # optional provider - skip when SDK absent

from unittest.mock import AsyncMock, MagicMock, patch
from pathlib import Path
from resumedb.codex import _map_effort, _strict_json_schema, CodexProcess
from openai_codex.generated.v2_all import (
    ReasoningEffort,
    AgentMessageDeltaNotification,
    ReasoningTextDeltaNotification,
    TurnCompletedNotification,
    ItemCompletedNotification,
    Turn,
    TurnStatus,
    ThreadItem,
    AgentMessageThreadItem
)
from openai_codex.models import Notification

def test_map_effort():
    assert _map_effort("low") == ReasoningEffort.low
    assert _map_effort("medium") == ReasoningEffort.medium
    assert _map_effort("high") == ReasoningEffort.high
    assert _map_effort("xhigh") == ReasoningEffort.xhigh
    assert _map_effort("max") == ReasoningEffort.xhigh
    assert _map_effort(None) is None
    assert _map_effort("invalid") is None


def test_strict_json_schema_closes_and_requires_nested_objects():
    schema = {
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {"label": {"type": "string"}},
                },
            },
        },
    }

    strict = _strict_json_schema(schema)

    assert strict["additionalProperties"] is False
    assert strict["required"] == ["name", "items"]
    nested = strict["properties"]["items"]["items"]
    assert nested["additionalProperties"] is False
    assert nested["required"] == ["label"]
    assert "additionalProperties" not in schema

@pytest.mark.anyio
async def test_codex_process_events():
    mock_thread = AsyncMock()
    mock_thread.id = "thread_123"
    
    mock_turn_handle = MagicMock()
    mock_thread.turn.return_value = mock_turn_handle
    
    # Mock notifications
    notif_start = Notification(method="turn/started", payload=MagicMock())
    notif_text = Notification(
        method="agent_message/delta",
        payload=AgentMessageDeltaNotification(delta="hello", item_id="x", thread_id="y", turn_id="z")
    )
    notif_think = Notification(
        method="reasoning/delta",
        payload=ReasoningTextDeltaNotification(delta="thinking", content_index=0, item_id="x", thread_id="y", turn_id="z")
    )
    
    msg_item = AgentMessageThreadItem(
        id="msg_1",
        memory_citation=None,
        phase=None,
        text="hello",
        type="agentMessage"
    )
    mock_item = ThreadItem(root=msg_item)
    
    notif_item = Notification(
        method="item/completed",
        payload=ItemCompletedNotification(item=mock_item, item_id="x", thread_id="y", turn_id="z", completed_at_ms=12345)
    )
    
    mock_turn_completed = MagicMock(spec=Turn)
    mock_turn_completed.id = "turn_1"
    mock_turn_completed.status = TurnStatus.completed
    mock_turn_completed.error = None
    
    notif_completed = Notification(
        method="turn/completed",
        payload=TurnCompletedNotification(thread_id="thread_123", turn=mock_turn_completed)
    )
    
    # Define turn handle stream async generator
    async def mock_stream():
        yield notif_start
        yield notif_text
        yield notif_think
        yield notif_item
        yield notif_completed
        
    mock_turn_handle.stream.side_effect = mock_stream
    
    # Patch AsyncCodex
    with patch("resumedb.codex.AsyncCodex") as mock_async_codex_cls:
        mock_codex_instance = AsyncMock()
        mock_codex_instance.thread_start.return_value = mock_thread
        mock_async_codex_cls.return_value.__aenter__.return_value = mock_codex_instance
        
        proc = CodexProcess(
            codex_bin="/path/to/codex",
            cwd=Path("/tmp"),
            prompt="hi",
            model="gpt-5.3-codex-spark",
            effort="high"
        )
        
        events = []
        async for ev in proc.events():
            events.append(ev)
            
        assert len(events) == 4
        assert events[0] == {"type": "session", "session_id": "thread_123"}
        assert events[1] == {"type": "text_delta", "text": "hello"}
        assert events[2] == {"type": "thinking_delta", "text": "thinking"}
        assert events[3] == {
            "type": "result",
            "text": "hello",
            "is_error": False,
            "cost_usd": None
        }
