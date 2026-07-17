"""Headless claude CLI process manager.

Spawns `claude -p` with stream-json output and yields normalized events:
  {"type": "session", "session_id": str}
  {"type": "text_delta", "text": str}
  {"type": "thinking_delta", "text": str}
  {"type": "tool_use", "name": str}
  {"type": "result", "text": str, "is_error": bool, "cost_usd": float | None}
  {"type": "error", "message": str}

Flags follow context/CLAUDE_CLI_INTEGRATION.md. --setting-sources project keeps
the user's global plugins/hooks out of headless runs (verified necessary: a
SessionStart hook from a user plugin injected itself during the M0 spike) while
still loading the data repo's own CLAUDE.md and skills.
"""

import asyncio
import json
import os
import re
import signal
from pathlib import Path
from typing import AsyncIterator

CHAT_TIMEOUT = 600
ONESHOT_TIMEOUT = 180
ANSI_RE = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")


class ClaudeError(Exception):
    pass


def parse_line(line: str) -> dict | None:
    """Parse one stream-json line into a normalized event (or None to skip)."""
    line = ANSI_RE.sub("", line).strip()
    if not line:
        return None
    try:
        obj = json.loads(line)
    except json.JSONDecodeError:
        return None
    t = obj.get("type")
    if t == "system" and obj.get("subtype") == "init":
        return {"type": "session", "session_id": obj.get("session_id")}
    if t == "stream_event":
        event = obj.get("event", {})
        if event.get("type") == "content_block_delta":
            delta = event.get("delta", {})
            if delta.get("type") == "text_delta":
                return {"type": "text_delta", "text": delta.get("text", "")}
            if delta.get("type") == "thinking_delta":
                return {"type": "thinking_delta", "text": delta.get("thinking", "")}
        if event.get("type") == "content_block_start":
            block = event.get("content_block", {})
            if block.get("type") == "tool_use":
                return {"type": "tool_use", "name": block.get("name", "?")}
        return None
    if t == "result":
        return {
            "type": "result",
            "text": obj.get("result") or "",
            "is_error": bool(obj.get("is_error")),
            "cost_usd": obj.get("total_cost_usd"),
        }
    return None


def _base_argv(claude_bin: str, model: str | None, effort: str | None) -> list[str]:
    argv = [
        claude_bin, "-p",
        "--dangerously-skip-permissions",
        "--strict-mcp-config",
        "--setting-sources", "project",
    ]
    if model:
        argv += ["--model", model]
    if effort:
        argv += ["--effort", effort]
    return argv


class ClaudeProcess:
    """One chat turn. Iterate events(); call cancel() from another task to stop."""

    def __init__(
        self,
        claude_bin: str,
        cwd: Path,
        prompt: str,
        session_id: str | None = None,
        model: str | None = None,
        effort: str | None = None,
    ):
        self.argv = _base_argv(claude_bin, model, effort) + [
            "--output-format", "stream-json",
            "--verbose",
            "--include-partial-messages",
        ]
        if session_id:
            self.argv += ["--resume", session_id]
        self.cwd = cwd
        self.prompt = prompt
        self.proc: asyncio.subprocess.Process | None = None
        self._cancelled = False

    async def cancel(self) -> None:
        self._cancelled = True
        self._kill()

    def _kill(self) -> None:
        if self.proc and self.proc.returncode is None:
            try:
                os.killpg(os.getpgid(self.proc.pid), signal.SIGKILL)
            except ProcessLookupError:
                pass

    async def events(self) -> AsyncIterator[dict]:
        self.proc = await asyncio.create_subprocess_exec(
            *self.argv,
            cwd=self.cwd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            start_new_session=True,
        )
        assert self.proc.stdin and self.proc.stdout and self.proc.stderr
        self.proc.stdin.write(self.prompt.encode())
        self.proc.stdin.close()

        stderr_task = asyncio.create_task(self.proc.stderr.read())
        got_result = False
        try:
            async with asyncio.timeout(CHAT_TIMEOUT):
                while True:
                    raw = await self.proc.stdout.readline()
                    if not raw:
                        break
                    event = parse_line(raw.decode("utf-8", "replace"))
                    if event:
                        if event["type"] == "result":
                            got_result = True
                        yield event
        except TimeoutError:
            self._kill()
            yield {"type": "error", "message": f"Agent turn timed out after {CHAT_TIMEOUT}s and was stopped."}
            return
        finally:
            if self.proc.returncode is None and not self._cancelled:
                self._kill()

        await self.proc.wait()
        stderr = (await stderr_task).decode("utf-8", "replace").strip()
        if self._cancelled:
            yield {"type": "error", "message": "Cancelled."}
        elif not got_result:
            yield {"type": "error", "message": _friendly_error(self.proc.returncode or 0, stderr)}


def _friendly_error(code: int, stderr: str) -> str:
    if code == 127:
        return "claude CLI not found. Install Claude Code and run `claude auth login`."
    low = stderr.lower()
    if "auth" in low or "login" in low or "api key" in low:
        return "Not authenticated. Run `claude auth login` in a terminal.\n" + stderr[-400:]
    return f"claude exited with code {code}.\n{stderr[-600:]}"


async def run_oneshot(
    claude_bin: str,
    cwd: Path,
    prompt: str,
    model: str | None = None,
    effort: str | None = None,
    json_schema: dict | None = None,
) -> str:
    """One-shot call (no session persistence). Returns the result text."""
    argv = _base_argv(claude_bin, model, effort) + [
        "--output-format", "json",
        "--no-session-persistence",
    ]
    if json_schema:
        argv += ["--json-schema", json.dumps(json_schema)]
    proc = await asyncio.create_subprocess_exec(
        *argv,
        cwd=cwd,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        start_new_session=True,
    )
    try:
        async with asyncio.timeout(ONESHOT_TIMEOUT):
            stdout, stderr = await proc.communicate(prompt.encode())
    except TimeoutError:
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except ProcessLookupError:
            pass
        raise ClaudeError(f"claude call timed out after {ONESHOT_TIMEOUT}s")
    if proc.returncode != 0:
        raise ClaudeError(_friendly_error(proc.returncode or 0, stderr.decode("utf-8", "replace")))
    try:
        obj = json.loads(ANSI_RE.sub("", stdout.decode("utf-8", "replace")))
    except json.JSONDecodeError as e:
        raise ClaudeError(f"unparseable claude output: {e}")
    if obj.get("is_error"):
        raise ClaudeError(str(obj.get("result"))[:600])
    return obj.get("result") or ""
