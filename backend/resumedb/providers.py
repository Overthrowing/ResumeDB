"""The provider seam: every agent call in the app goes through get_agent().

An agent exposes two operations:
  start_turn(cwd, prompt, ...) -> process with .events() AsyncIterator and .cancel()
  oneshot(cwd, prompt, ...) -> str result text

Events are the normalized dicts documented in claude.py. ClaudeAgent is the
tested provider; CodexAgent is wired and selectable but experimental (ported,
not verified against a live Codex install).
"""

from pathlib import Path

from . import config
from .claude import ClaudeProcess, run_oneshot
from .codex import CodexProcess, run_oneshot_codex


class AgentError(Exception):
    pass


class ClaudeAgent:
    provider = "claude"

    def __init__(self, bin: str):
        self.bin = bin

    def start_turn(self, cwd: Path, prompt: str, session_id: str | None = None,
                   model: str | None = None, effort: str | None = None) -> ClaudeProcess:
        return ClaudeProcess(self.bin, cwd=cwd, prompt=prompt,
                             session_id=session_id, model=model, effort=effort)

    async def oneshot(self, cwd: Path, prompt: str, model: str | None = None,
                      effort: str | None = None, json_schema: dict | None = None) -> str:
        return await run_oneshot(self.bin, cwd=cwd, prompt=prompt,
                                 model=model, effort=effort, json_schema=json_schema)


class CodexAgent:
    provider = "codex"

    def __init__(self, bin: str):
        self.bin = bin

    def start_turn(self, cwd: Path, prompt: str, session_id: str | None = None,
                   model: str | None = None, effort: str | None = None) -> CodexProcess:
        return CodexProcess(self.bin, cwd=cwd, prompt=prompt,
                            session_id=session_id, model=model, effort=effort)

    async def oneshot(self, cwd: Path, prompt: str, model: str | None = None,
                      effort: str | None = None, json_schema: dict | None = None) -> str:
        return await run_oneshot_codex(self.bin, cwd=cwd, prompt=prompt,
                                       model=model, effort=effort, json_schema=json_schema)


Agent = ClaudeAgent | CodexAgent


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
        return CodexAgent(bin)
    bin = config.claude_bin(cfg)
    if not bin:
        raise AgentError("claude CLI not found. Install Claude Code and run `claude auth login`.")
    return ClaudeAgent(bin)


def model_for(cfg: dict, kind: str) -> tuple[str | None, str | None]:
    """(model, effort) for a call kind: chat, tailor, audit, or jd.
    Tailor falls back to the chat model."""
    m = cfg["models"]
    if kind == "tailor":
        return m["tailor"] or m["chat"], m["tailor_effort"] or m["chat_effort"]
    return m[kind], m[f"{kind}_effort"]
