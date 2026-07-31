"""The provider seam: every agent call in the app goes through get_agent().

An agent exposes two operations:
  start_turn(cwd, prompt, ...) -> process with .events() AsyncIterator and .cancel()
  oneshot(cwd, prompt, ...) -> str result text

Events are the normalized dicts documented in claude.py. Claude is the tested
provider; Codex is wired and selectable but experimental (ported, not verified
against a live Codex install).
"""

from pathlib import Path
from typing import Awaitable, Callable

from . import config
from .claude import ClaudeProcess, run_oneshot
from .codex import CodexProcess, run_oneshot_codex


class AgentError(Exception):
    pass


class Agent:
    """A CLI-backed agent. Providers differ only in the process class used to
    stream a turn and the function used for one-shot calls, so both share this
    wrapper and get_agent() is the only place that knows which is which."""

    def __init__(
        self,
        bin: str,
        process_cls: type[ClaudeProcess] | type[CodexProcess],
        oneshot_fn: Callable[..., Awaitable[str]],
    ):
        self.bin = bin
        self._process_cls = process_cls
        self._oneshot_fn = oneshot_fn

    def start_turn(self, cwd: Path, prompt: str, session_id: str | None = None,
                   model: str | None = None, effort: str | None = None) -> ClaudeProcess | CodexProcess:
        return self._process_cls(self.bin, cwd=cwd, prompt=prompt,
                                 session_id=session_id, model=model, effort=effort)

    async def oneshot(self, cwd: Path, prompt: str, model: str | None = None,
                      effort: str | None = None, json_schema: dict | None = None) -> str:
        return await self._oneshot_fn(self.bin, cwd=cwd, prompt=prompt,
                                      model=model, effort=effort, json_schema=json_schema)


def get_agent(cfg: dict) -> Agent:
    """Resolve provider + binary in one place. Raises AgentError with an
    actionable message if the selected provider is unavailable."""
    if cfg["agent_provider"] == "codex":
        bin = config.codex_bin(cfg)
        if not bin:
            raise AgentError(
                "codex CLI not found. Install Codex, or switch the provider "
                "back to Claude in Settings."
            )
        return Agent(bin, CodexProcess, run_oneshot_codex)
    bin = config.claude_bin(cfg)
    if not bin:
        raise AgentError("claude CLI not found. Install Claude Code and run `claude auth login`.")
    return Agent(bin, ClaudeProcess, run_oneshot)


def model_for(cfg: dict, kind: str) -> tuple[str | None, str | None]:
    """(model, effort) for a call kind: chat, tailor, audit, or jd.

    Each kind has a configured default, but a config written before those
    defaults existed can still hold null, so tailor falls back to the chat
    settings and a remaining None means "let the CLI decide"."""
    m = cfg["models"]
    if kind == "tailor":
        return m["tailor"] or m["chat"], m["tailor_effort"] or m["chat_effort"]
    return m[kind], m[f"{kind}_effort"]
