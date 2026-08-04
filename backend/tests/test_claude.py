"""Claude stream-json parsing, against real lines recorded from claude 2.1.197.

parse_line is the only place the CLI's wire format meets the app, so these
fixtures are the contract: if a line stops parsing, chat goes silent.
"""

import json

from resumedb.claude import ClaudeProcess, parse_line

INIT = '{"type":"system","subtype":"init","cwd":"/tmp","session_id":"d4b3b0a2-f7da-44b4-b11f-ad89d70befda","tools":[],"model":"claude-haiku-4-5-20251001","apiKeySource":"none","claude_code_version":"2.1.197","output_style":"default"}'
TEXT_DELTA = '{"type":"stream_event","event":{"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"ok"}},"session_id":"d4b3b0a2"}'
THINKING_DELTA = '{"type":"stream_event","event":{"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"The","estimated_tokens":null}},"session_id":"d4b3b0a2"}'
TOOL_USE_START = '{"type":"stream_event","event":{"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"toolu_x","name":"Read","input":{}}},"session_id":"d4b3b0a2"}'
RESULT = '{"type":"result","subtype":"success","is_error":false,"duration_ms":1840,"num_turns":1,"result":"ok","stop_reason":"end_turn","session_id":"d4b3b0a2","total_cost_usd":0.016898999999999997}'
RATE_LIMIT = '{"type":"rate_limit_event","rate_limit_info":{"status":"allowed"},"uuid":"x","session_id":"d4b3b0a2"}'
HOOK = '{"type":"system","subtype":"hook_started","hook_id":"x","hook_name":"SessionStart:startup","session_id":"d4b3b0a2"}'


def test_init_line_carries_the_session_id():
    """Losing it breaks resume, so every later turn starts a fresh session."""
    assert parse_line(INIT) == {
        "type": "session", "session_id": "d4b3b0a2-f7da-44b4-b11f-ad89d70befda"
    }


def test_text_and_thinking_deltas_are_separate_event_types():
    assert parse_line(TEXT_DELTA) == {"type": "text_delta", "text": "ok"}
    assert parse_line(THINKING_DELTA) == {"type": "thinking_delta", "text": "The"}


def test_tool_use_start_yields_the_tool_name():
    assert parse_line(TOOL_USE_START) == {"type": "tool_use", "name": "Read"}


def test_result_line_carries_text_error_flag_and_cost():
    assert parse_line(RESULT) == {
        "type": "result", "text": "ok", "is_error": False, "cost_usd": 0.016898999999999997
    }


def test_noise_lines_are_skipped_instead_of_crashing_the_stream():
    """The CLI interleaves rate-limit and hook events with content; an
    unrecognized line must be dropped, never raised."""
    assert parse_line(RATE_LIMIT) is None
    assert parse_line(HOOK) is None
    assert parse_line("") is None
    assert parse_line("not json at all") is None


def test_ansi_control_codes_are_stripped_before_parsing():
    """The CLI writes cursor codes onto otherwise valid json lines."""
    assert parse_line("\x1b[2K" + TEXT_DELTA) == {"type": "text_delta", "text": "ok"}


def test_null_result_text_becomes_an_empty_string():
    """A tool-only turn ends with result:null; `None` would break the fold into
    the conversation JSONL."""
    obj = json.loads(RESULT)
    obj["result"] = None
    assert parse_line(json.dumps(obj))["text"] == ""


async def test_a_huge_event_line_does_not_kill_the_turn(tmp_path):
    """A single tool result can run to megabytes - reading every db/ entry in
    one pass does it. asyncio's default 64 KiB line limit used to raise
    "Separator is not found, and chunk exceed the limit" out of readline() and
    lose the whole turn."""
    big = "x" * (200 * 1024)
    script = (
        "import json,sys\n"
        f"sys.stdout.write(json.dumps({{'type':'assistant','message':{{'content':"
        f"[{{'type':'text','text':{big!r}}}]}}}}) + '\\n')\n"
        "sys.stdout.write(json.dumps({'type':'result','subtype':'success',"
        "'result':'done','is_error':False}) + '\\n')\n"
        "sys.stdout.flush()\n"
    )
    proc = ClaudeProcess("python3", tmp_path, "prompt")
    proc.argv = ["python3", "-c", script]

    events = [e async for e in proc.events()]
    types = [e["type"] for e in events]
    assert "result" in types, events          # the turn reached its end
    assert "error" not in types, events       # and did not die on the way
    # no skip warning: the raised limit read the line outright, rather than
    # the drop-and-continue fallback quietly papering over it
    assert "warning" not in types, events
    assert events[-1]["text"] == "done"
