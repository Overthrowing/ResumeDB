from __future__ import annotations  # keep annotations lazy so the SDK stays optional

import asyncio
from pathlib import Path
from typing import AsyncIterator

# Codex is an optional provider. Importing this module must never fail when the
# openai_codex SDK is absent - the default claude pipeline does not need it.
try:
    from openai_codex import AsyncCodex, CodexConfig, ApprovalMode, Sandbox, CodexError
    from openai_codex.generated.v2_all import (
        ItemCompletedNotification,
        TurnCompletedNotification,
        AgentMessageDeltaNotification,
        ReasoningTextDeltaNotification,
        ReasoningEffort,
    )
    from openai_codex._run import _final_assistant_response_from_items

    _CODEX_IMPORT_ERROR: Exception | None = None
except ImportError as e:  # SDK not installed; only fails if codex is actually selected
    _CODEX_IMPORT_ERROR = e
    CodexError = Exception  # placeholder so `except CodexError` clauses resolve
    ReasoningEffort = None

CHAT_TIMEOUT = 600
ONESHOT_TIMEOUT = 180


def _require_codex() -> None:
    if _CODEX_IMPORT_ERROR is not None:
        raise RuntimeError(
            "The Codex provider needs the openai_codex SDK, which is not installed. "
            "Install it, or set agent_provider back to 'claude' in settings."
        ) from _CODEX_IMPORT_ERROR

def _map_effort(effort: str | None) -> ReasoningEffort | None:
    if not effort:
        return None
    val = effort.lower()
    if val == "max":
        val = "xhigh"
    try:
        return ReasoningEffort(val)
    except ValueError:
        return None

class CodexProcess:
    """One chat turn using the OpenAI Codex SDK.
    Iterate events(); call cancel() from another task to stop.
    Yields normalized events matching ClaudeProcess structure.
    """

    def __init__(
        self,
        codex_bin: str | None,
        cwd: Path,
        prompt: str,
        session_id: str | None = None,
        model: str | None = None,
        effort: str | None = None,
    ):
        _require_codex()
        self.codex_bin = codex_bin
        self.cwd = cwd
        self.prompt = prompt
        self.session_id = session_id  # thread_id in Codex
        self.model = model
        self.effort = _map_effort(effort)
        self.turn_handle = None
        self._cancelled = False

    async def cancel(self) -> None:
        self._cancelled = True
        if self.turn_handle:
            try:
                await self.turn_handle.interrupt()
            except Exception:
                pass

    async def events(self) -> AsyncIterator[dict]:
        config = CodexConfig(
            codex_bin=self.codex_bin,
            cwd=str(self.cwd)
        )

        try:
            async with AsyncCodex(config) as codex:
                if self.session_id:
                    try:
                        thread = await codex.thread_resume(self.session_id)
                    except Exception:
                        thread = await codex.thread_start()
                else:
                    thread = await codex.thread_start()

                yield {"type": "session", "session_id": thread.id}

                if self._cancelled:
                    yield {"type": "error", "message": "Cancelled."}
                    return

                self.turn_handle = await thread.turn(
                    self.prompt,
                    model=self.model,
                    effort=self.effort,
                    approval_mode=ApprovalMode.deny_all,
                    sandbox=Sandbox.full_access
                )

                items = []
                got_result = False
                try:
                    async with asyncio.timeout(CHAT_TIMEOUT):
                        async for notification in self.turn_handle.stream():
                            if self._cancelled:
                                break
                            
                            method = notification.method
                            payload = notification.payload

                            if isinstance(payload, AgentMessageDeltaNotification):
                                yield {"type": "text_delta", "text": payload.delta}
                            elif isinstance(payload, ReasoningTextDeltaNotification):
                                yield {"type": "thinking_delta", "text": payload.delta}
                            elif isinstance(payload, ItemCompletedNotification):
                                items.append(payload.item)
                            elif isinstance(payload, TurnCompletedNotification):
                                got_result = True
                                response = _final_assistant_response_from_items(items)
                                yield {
                                    "type": "result",
                                    "text": response or "",
                                    "is_error": payload.turn.status.value == "failed",
                                    "cost_usd": None
                                }
                except TimeoutError:
                    await self.cancel()
                    yield {"type": "error", "message": f"Agent turn timed out after {CHAT_TIMEOUT}s and was stopped."}
                    return
                
                if self._cancelled:
                    yield {"type": "error", "message": "Cancelled."}
                elif not got_result:
                    yield {"type": "error", "message": "Turn did not complete successfully."}

        except Exception as e:
            yield {"type": "error", "message": f"Codex error: {str(e)}"}


async def run_oneshot_codex(
    codex_bin: str | None,
    cwd: Path,
    prompt: str,
    model: str | None = None,
    effort: str | None = None,
    json_schema: dict | None = None,
) -> str:
    """One-shot call using Codex (no session persistence). Returns the result text."""
    _require_codex()
    config = CodexConfig(
        codex_bin=codex_bin,
        cwd=str(cwd)
    )
    mapped_effort = _map_effort(effort)

    async with AsyncCodex(config) as codex:
        thread = await codex.thread_start(ephemeral=True)
        try:
            async with asyncio.timeout(ONESHOT_TIMEOUT):
                turn_handle = await thread.turn(
                    prompt,
                    model=model,
                    effort=mapped_effort,
                    output_schema=json_schema,
                    approval_mode=ApprovalMode.deny_all,
                    sandbox=Sandbox.full_access
                )
                
                items = []
                async for notification in turn_handle.stream():
                    payload = notification.payload
                    if isinstance(payload, ItemCompletedNotification):
                        items.append(payload.item)
                    elif isinstance(payload, TurnCompletedNotification):
                        if payload.turn.status.value == "failed":
                            msg = payload.turn.error.message if payload.turn.error else "Unknown error"
                            raise CodexError(f"Turn failed: {msg}")

                response = _final_assistant_response_from_items(items)
                if response is None:
                    raise CodexError("No response received from Codex.")
                return response
        except TimeoutError:
            raise CodexError(f"Codex call timed out after {ONESHOT_TIMEOUT}s")
