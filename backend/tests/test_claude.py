"""Parser tests against real stream-json lines recorded from claude 2.1.197."""

import json

from resumedb.claude import parse_line

INIT = '{"type":"system","subtype":"init","cwd":"/tmp","session_id":"d4b3b0a2-f7da-44b4-b11f-ad89d70befda","tools":[],"model":"claude-haiku-4-5-20251001","apiKeySource":"none","claude_code_version":"2.1.197","output_style":"default"}'
TEXT_DELTA = '{"type":"stream_event","event":{"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"ok"}},"session_id":"d4b3b0a2"}'
THINKING_DELTA = '{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"The","estimated_tokens":null}},"session_id":"d4b3b0a2"}'
TOOL_USE_START = '{"type":"stream_event","event":{"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"toolu_x","name":"Read","input":{}}},"session_id":"d4b3b0a2"}'
RESULT = '{"type":"result","subtype":"success","is_error":false,"duration_ms":1840,"num_turns":1,"result":"ok","stop_reason":"end_turn","session_id":"d4b3b0a2","total_cost_usd":0.016898999999999997}'
RATE_LIMIT = '{"type":"rate_limit_event","rate_limit_info":{"status":"allowed"},"uuid":"x","session_id":"d4b3b0a2"}'
HOOK = '{"type":"system","subtype":"hook_started","hook_id":"x","hook_name":"SessionStart:startup","session_id":"d4b3b0a2"}'


def test_init_yields_session():
    assert parse_line(INIT) == {"type": "session", "session_id": "d4b3b0a2-f7da-44b4-b11f-ad89d70befda"}


def test_text_and_thinking_deltas():
    assert parse_line(TEXT_DELTA) == {"type": "text_delta", "text": "ok"}
    assert parse_line(THINKING_DELTA) == {"type": "thinking_delta", "text": "The"}


def test_tool_use_start():
    assert parse_line(TOOL_USE_START) == {"type": "tool_use", "name": "Read"}


def test_result():
    ev = parse_line(RESULT)
    assert ev == {"type": "result", "text": "ok", "is_error": False, "cost_usd": 0.016898999999999997}


def test_unknown_types_skipped():
    assert parse_line(RATE_LIMIT) is None
    assert parse_line(HOOK) is None
    assert parse_line("") is None
    assert parse_line("not json at all") is None


def test_ansi_stripped():
    assert parse_line("\x1b[2K" + TEXT_DELTA) == {"type": "text_delta", "text": "ok"}


def test_null_result_text():
    obj = json.loads(RESULT)
    obj["result"] = None
    ev = parse_line(json.dumps(obj))
    assert ev is not None and ev["text"] == ""
