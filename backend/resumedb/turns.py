"""Durable turn execution, decoupled from WebSockets.

A turn (one user message -> one agent run + epilogue) executes as its own
asyncio task owned by the TurnManager. WebSockets are subscribers: closing or
refreshing the page never kills the agent subprocess; a new socket re-attaches,
replays every event so far, then streams live.

Durability layers:
- conversation JSONL (versioned in the data repo): the clean record. The user
  message is appended when the turn starts; the assistant message when it ends.
- per-turn event log (.resumedb/turns/<scope>/<conv>.jsonl, machine-local):
  appended as events stream. Deleted once the turn folds into the JSONL. A log
  that still exists when no turn is active means the backend died mid-turn; the
  partial output is folded in flagged "interrupted" so the UI can offer retry.
"""

import asyncio
import datetime
import json
from pathlib import Path
from typing import AsyncIterator

from . import gitops, render
from .datarepo import DataRepo, state_dir

TERMINAL = "turn_done"


class TurnBusy(Exception):
    pass


# -- conversation storage ------------------------------------------------------

def chats_dir(repo: DataRepo, scope: str) -> Path:
    if scope.startswith("app:"):
        return repo.app_dir(scope[4:]) / "chats"
    if scope == "apps":
        return repo.root / "applications" / "chats"
    return repo.root / "db" / "chats"


def conv_path(repo: DataRepo, scope: str, conv: str) -> Path:
    return chats_dir(repo, scope) / f"{conv}.jsonl"


def read_messages(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def append_message(path: Path, msg: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a") as f:
        f.write(json.dumps(msg) + "\n")


# -- machine-local session state ----------------------------------------------

def _state_path(repo: DataRepo) -> Path:
    d = state_dir(repo.root)
    new = d / "state.json"
    legacy = repo.root / ".state.json"
    if not new.exists() and legacy.exists():
        legacy.rename(new)
    return new


def _state(repo: DataRepo) -> dict:
    p = _state_path(repo)
    return json.loads(p.read_text()) if p.exists() else {}


def get_session(repo: DataRepo, scope: str, conv: str) -> str | None:
    return _state(repo).get("sessions", {}).get(f"{scope}/{conv}")


def set_session(repo: DataRepo, scope: str, conv: str, sid: str | None) -> None:
    data = _state(repo)
    key = f"{scope}/{conv}"
    if sid is None:
        data.get("sessions", {}).pop(key, None)
    else:
        data.setdefault("sessions", {})[key] = sid
    _state_path(repo).write_text(json.dumps(data))


# -- turn log ------------------------------------------------------------------

def _turn_log(repo: DataRepo, scope: str, conv: str) -> Path:
    d = state_dir(repo.root) / "turns" / scope.replace(":", "_")
    d.mkdir(parents=True, exist_ok=True)
    return d / f"{conv}.jsonl"


def reap_stale(repo: DataRepo, scope: str, conv: str, manager: "TurnManager") -> bool:
    """Fold a turn log orphaned by a backend crash/restart into the
    conversation as an interrupted assistant message. Returns True if reaped."""
    log = _turn_log(repo, scope, conv)
    if not log.exists() or manager.active(scope, conv):
        return False
    partial = "".join(
        e.get("text", "")
        for e in (json.loads(l) for l in log.read_text().splitlines() if l.strip())
        if e.get("type") == "text_delta"
    )
    append_message(conv_path(repo, scope, conv), {
        "role": "assistant",
        "text": partial,
        "interrupted": True,
    })
    log.unlink()
    return True


# -- turn ----------------------------------------------------------------------

class Turn:
    def __init__(self, scope: str, conv: str, user_text: str, log: Path):
        self.scope = scope
        self.conv = conv
        self.user_text = user_text
        self.log = log
        self.events: list[dict] = []
        self.finished = False
        self._queues: set[asyncio.Queue] = set()
        self._proc = None
        self.task: asyncio.Task | None = None

    def emit(self, event: dict) -> None:
        self.events.append(event)
        with self.log.open("a") as f:
            f.write(json.dumps(event) + "\n")
        for q in self._queues:
            q.put_nowait(event)

    async def subscribe(self) -> AsyncIterator[dict]:
        """Replay everything so far, then stream live until turn_done."""
        q: asyncio.Queue = asyncio.Queue()
        self._queues.add(q)
        try:
            n = len(self.events)
            for event in self.events[:n]:
                yield event
                if event["type"] == TERMINAL:
                    return
            while True:
                event = await q.get()
                yield event
                if event["type"] == TERMINAL:
                    return
        finally:
            self._queues.discard(q)

    async def cancel(self) -> None:
        if self._proc:
            await self._proc.cancel()


class TurnManager:
    def __init__(self):
        self._active: dict[tuple[str, str], Turn] = {}

    def active(self, scope: str, conv: str) -> Turn | None:
        t = self._active.get((scope, conv))
        return t if t and not t.finished else None

    def active_convs(self, scope: str) -> set[str]:
        return {c for (s, c), t in self._active.items() if s == scope and not t.finished}

    def start(self, repo: DataRepo, agent, scope: str, conv: str, user_text: str,
              prompt: str, model: str | None, effort: str | None) -> Turn:
        if self.active(scope, conv):
            raise TurnBusy("a turn is already running in this conversation")
        reap_stale(repo, scope, conv, self)
        log = _turn_log(repo, scope, conv)
        log.unlink(missing_ok=True)
        turn = Turn(scope, conv, user_text, log)
        self._active[(scope, conv)] = turn
        turn.task = asyncio.create_task(self._run(turn, repo, agent, prompt, model, effort))
        return turn

    async def _run(self, turn: Turn, repo: DataRepo, agent, prompt: str,
                   model: str | None, effort: str | None) -> None:
        scope, conv = turn.scope, turn.conv
        cpath = conv_path(repo, scope, conv)
        append_message(cpath, {"role": "user", "text": turn.user_text})
        turn.emit({"type": "turn_start", "user_text": turn.user_text})
        final_text = ""
        try:
            session_id = get_session(repo, scope, conv)
            proc = agent.start_turn(repo.root, prompt, session_id=session_id,
                                    model=model, effort=effort)
            turn._proc = proc
            async for event in proc.events():
                if event["type"] == "session" and event.get("session_id"):
                    set_session(repo, scope, conv, event["session_id"])
                if event["type"] == "result":
                    final_text = event["text"]
                turn.emit(event)
            for event in await asyncio.to_thread(self._epilogue, repo, scope):
                turn.emit(event)
        except Exception as e:
            turn.emit({"type": "error", "message": f"turn failed: {e}"})
        finally:
            if final_text:
                append_message(cpath, {"role": "assistant", "text": final_text})
            turn.log.unlink(missing_ok=True)
            turn.emit({"type": TERMINAL})
            turn.finished = True
            self._active.pop((scope, conv), None)

    def _epilogue(self, repo: DataRepo, scope: str) -> list[dict]:
        """Post-turn bookkeeping (blocking; runs in a thread): flag protected-
        file edits, checkpoint, re-render app resumes, count proposals."""
        events: list[dict] = []
        touched = [
            f
            for f in gitops.changed_files(repo.root, "db", "CLAUDE.md", "AGENTS.md")
            if not f.startswith("db/chats/") and f != "db/memory.md"
        ]
        if touched:
            events.append({
                "type": "warning",
                "message": "The agent changed protected files directly: "
                + ", ".join(touched)
                + ". The change is checkpointed - review it in History and undo if unwanted.",
            })
        if gitops.is_dirty(repo.root, scope):
            gitops.checkpoint(repo.root, scope, "agent turn")
            if scope.startswith("app:"):
                result = render.render(repo.root, scope[4:])
                events.append({"type": "rendered", **result})
        events.append({"type": "proposals", "count": len(repo.list_proposals())})
        return events


manager = TurnManager()


def new_conv_id() -> str:
    return datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
