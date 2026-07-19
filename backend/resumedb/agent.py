"""Provider-neutral entry point for structured ResumeDB agent tasks."""

import json
from pathlib import Path

from . import config
from .claude import ClaudeError, run_oneshot
from .codex import run_oneshot_codex


class AgentError(Exception):
    pass


def public_agent_error(exc: Exception) -> str:
    """Return a concise provider error safe to show in the product UI."""
    message = str(exc).strip() or "The configured agent failed without an error message."
    lowered = message.lower()
    if "closed stdout" in lowered or "stderr_tail=" in lowered:
        return "The configured agent process stopped unexpectedly. Retry this action."
    if "timed out" in lowered:
        return "The configured agent timed out. Retry this action."
    first_line = message.splitlines()[0]
    return first_line[:240] + ("..." if len(first_line) > 240 else "")


async def run_structured(
    *,
    cwd: Path,
    prompt: str,
    schema: dict,
    task: str,
    allow_web: bool = False,
) -> dict:
    """Run one model task and return validated structured data.

    ResumeDB persists model output itself. Reasoning tasks have no model tools,
    while discovery may browse but still cannot mutate the career repository.
    """
    cfg = config.load()
    provider = cfg.get("agent_provider", "claude")
    models = cfg.get("models", {})
    model = models.get(task) or models.get("chat")
    effort = models.get(f"{task}_effort") or models.get("chat_effort")

    try:
        if provider == "codex":
            codex_bin = config.codex_bin(cfg)
            if not codex_bin:
                raise AgentError("Codex CLI not found. Install Codex and sign in.")
            raw = await run_oneshot_codex(
                codex_bin,
                cwd=cwd,
                prompt=prompt,
                model=model,
                effort=effort,
                json_schema=schema,
                allow_web=allow_web,
            )
        else:
            claude_bin = config.claude_bin(cfg)
            if not claude_bin:
                raise AgentError("Claude CLI not found. Install Claude Code and sign in.")
            raw = await run_oneshot(
                claude_bin,
                cwd=cwd,
                prompt=prompt,
                model=model,
                effort=effort,
                json_schema=schema,
                allow_web=allow_web,
            )
        result = json.loads(raw)
        if not isinstance(result, dict):
            raise AgentError("Agent returned a non-object response")
        return result
    except (AgentError, ClaudeError):
        raise
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        raise AgentError(f"Agent returned invalid structured data: {exc}") from exc
    except Exception as exc:
        raise AgentError(str(exc)) from exc
