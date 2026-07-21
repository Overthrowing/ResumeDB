"""WebSocket chat: one endpoint per scope ("db", "apps", or "app:<id>").

Each scope holds multiple conversations, stored as JSONL message files:
  db      -> db/chats/<conv>.jsonl
  apps    -> applications/chats/<conv>.jsonl
  app:<x> -> applications/<x>/chats/<conv>.jsonl

Conversation id = creation timestamp. Claude session ids are machine-local, so
they live in the gitignored .state.json ({"sessions": {"<scope>/<conv>": sid}}),
not in tracked files.

Client sends {"type": "message", "text": ...} or {"type": "cancel"}.
Server relays normalized claude events plus {"type": "conversation", "id": ...}
when a first message creates a new conversation, then a post-turn epilogue:
checkpoint if dirty, re-render + {"type":"rendered"} if resume files changed,
{"type":"proposals", count}, and a warning if a non-db scope touched db/.
"""

import asyncio
import datetime
import json
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from . import config, gitops, render
from .claude import ClaudeProcess
from .codex import CodexProcess
from .datarepo import DataRepo, DataRepoError

router = APIRouter()

CONV_RE = re.compile(r"[0-9]{8}-[0-9]{6}")

DB_INTRO = (
    "You are the Library assistant for this resume data repo. The user message "
    "relates to building or cleaning the master database. Follow the "
    "intake-interview skill: draft entries into proposals/, never write db/ directly.\n\n"
)
APP_INTRO = (
    "Work on the job application in applications/{app_id}/ (its jd.md, notes.md, "
    "resume.yaml, resume.typ). Follow the tailor-resume skill for tailoring work.\n\n"
)
APPS_INTRO = (
    "You are the Applications assistant managing the applications/ pipeline. "
    "Follow the manage-applications skill: create applications from links or "
    "pasted postings and update their status/deadline via the ResumeDB HTTP API "
    "at {base} (curl). Never edit db/.\n\n"
)


def _repo() -> DataRepo:
    return DataRepo(Path(config.load()["data_repo"]))


def _chats_dir(repo: DataRepo, scope: str) -> Path:
    if scope.startswith("app:"):
        return repo.app_dir(scope[4:]) / "chats"
    if scope == "apps":
        return repo.root / "applications" / "chats"
    return repo.root / "db" / "chats"


def _legacy_log(repo: DataRepo, scope: str) -> Path:
    if scope.startswith("app:"):
        return repo.root / "applications" / scope[4:] / "chat.jsonl"
    if scope == "apps":
        return repo.root / "applications" / "chat.jsonl"
    return repo.root / "db" / "chat.jsonl"


def _state(repo: DataRepo) -> dict:
    path = repo.root / ".state.json"
    return json.loads(path.read_text()) if path.exists() else {}


def _save_state(repo: DataRepo, data: dict) -> None:
    (repo.root / ".state.json").write_text(json.dumps(data))


def _get_session(repo: DataRepo, scope: str, conv: str) -> str | None:
    return _state(repo).get("sessions", {}).get(f"{scope}/{conv}")


def _set_session(repo: DataRepo, scope: str, conv: str, sid: str) -> None:
    data = _state(repo)
    data.setdefault("sessions", {})[f"{scope}/{conv}"] = sid
    _save_state(repo, data)


def _migrate_legacy(repo: DataRepo, scope: str) -> None:
    """Move the old single chat.jsonl into chats/ as one conversation."""
    old = _legacy_log(repo, scope)
    if not old.exists():
        return
    d = _chats_dir(repo, scope)
    d.mkdir(parents=True, exist_ok=True)
    conv = datetime.datetime.fromtimestamp(old.stat().st_mtime).strftime("%Y%m%d-%H%M%S")
    old.rename(d / f"{conv}.jsonl")
    # carry the old session id over so the conversation still resumes
    sid = None
    if scope.startswith("app:"):
        app_id = scope[4:]
        sid = repo.get_application(app_id)["meta"].get("session_id")
        if sid:
            repo.set_app_meta(app_id, session_id=None)
    else:
        data = _state(repo)
        sid = data.pop(f"{scope}_session_id", None)
        _save_state(repo, data)
    if sid:
        _set_session(repo, scope, conv, sid)


def _messages(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def _append(path: Path, role: str, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a") as f:
        f.write(json.dumps({"role": role, "text": text}) + "\n")


def _check_conv(conv: str) -> str:
    if not CONV_RE.fullmatch(conv):
        raise HTTPException(400, f"bad conversation id: {conv!r}")
    return conv


def _http_base(ws: WebSocket) -> str:
    forwarded = ws.headers.get("x-forwarded-proto", "").split(",", 1)[0].strip()
    scheme = forwarded or ws.url.scheme
    if scheme in {"wss", "https"}:
        scheme = "https"
    else:
        scheme = "http"
    return f"{scheme}://{ws.headers.get('host', 'localhost:8000')}"


@router.get("/api/chat/{scope}/conversations")
def list_conversations(scope: str):
    repo = _repo()
    try:
        _migrate_legacy(repo, scope)
        d = _chats_dir(repo, scope)
    except DataRepoError as e:
        raise HTTPException(404, str(e))
    out = []
    for f in sorted(d.glob("*.jsonl"), reverse=True):
        msgs = _messages(f)
        title = next((m["text"] for m in msgs if m.get("role") == "user"), "(empty)")
        title = re.sub(r"\s+", " ", title).strip() or "(empty)"
        try:
            created = datetime.datetime.strptime(f.stem, "%Y%m%d-%H%M%S").timestamp()
        except ValueError:
            created = f.stat().st_mtime
        out.append({"id": f.stem, "title": title[:80], "created": created, "count": len(msgs)})
    return out


@router.get("/api/chat/{scope}/conversations/{conv}")
def get_conversation(scope: str, conv: str):
    repo = _repo()
    try:
        return _messages(_chats_dir(repo, scope) / f"{_check_conv(conv)}.jsonl")
    except DataRepoError as e:
        raise HTTPException(404, str(e))


@router.delete("/api/chat/{scope}/conversations/{conv}")
def delete_conversation(scope: str, conv: str):
    repo = _repo()
    try:
        path = _chats_dir(repo, scope) / f"{_check_conv(conv)}.jsonl"
    except DataRepoError as e:
        raise HTTPException(404, str(e))
    if not path.exists():
        raise HTTPException(404, f"no conversation {conv}")
    path.unlink()
    data = _state(repo)
    data.get("sessions", {}).pop(f"{scope}/{conv}", None)
    _save_state(repo, data)
    gitops.checkpoint(repo.root, scope, f"delete conversation {conv}")
    return {"ok": True}


@router.websocket("/api/chat")
async def chat_ws(ws: WebSocket, scope: str, conversation: str = ""):
    if not config.origin_is_allowed(ws.headers.get("origin")):
        await ws.close(code=1008, reason="origin not allowed")
        return
    await ws.accept()
    cfg = config.load()
    repo = DataRepo(Path(cfg["data_repo"]))
    provider = cfg.get("agent_provider", "claude")

    if provider == "codex":
        codex_bin = config.codex_bin(cfg)
        if not codex_bin:
            await ws.send_json({"type": "error", "message": "codex CLI not found. Install Codex."})
            await ws.close()
            return
        agent_bin = codex_bin
    else:
        claude_bin = config.claude_bin(cfg)
        if not claude_bin:
            await ws.send_json({"type": "error", "message": "claude CLI not found. Install Claude Code."})
            await ws.close()
            return
        agent_bin = claude_bin

    conv = conversation if conversation and CONV_RE.fullmatch(conversation) else None
    proc = None

    try:
        while True:
            msg = await ws.receive_json()
            if msg.get("type") != "message":
                continue
            text = msg.get("text", "").strip()
            if not text:
                continue

            first_turn = False
            if conv is None:
                conv = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
                first_turn = True
                await ws.send_json({"type": "conversation", "id": conv})

            session_id = _get_session(repo, scope, conv)
            prompt = text
            if not session_id:  # first turn of the session gets the scope intro
                if scope.startswith("app:"):
                    intro = APP_INTRO.format(app_id=scope[4:])
                elif scope == "apps":
                    intro = APPS_INTRO.format(base=_http_base(ws))
                else:
                    intro = DB_INTRO
                prompt = intro + text

            models = cfg["models"]
            if scope.startswith("app:"):  # tailoring gets its own (thinking) defaults
                model = msg.get("model") or models.get("tailor") or models.get("chat")
                effort = msg.get("effort") or models.get("tailor_effort") or models.get("chat_effort")
            else:
                model = msg.get("model") or models.get("chat")
                effort = msg.get("effort") or models.get("chat_effort")
            if provider == "codex":
                proc = CodexProcess(
                    agent_bin,
                    cwd=repo.root,
                    prompt=prompt,
                    session_id=session_id,
                    model=model,
                    effort=effort,
                )
            else:
                proc = ClaudeProcess(
                    agent_bin,
                    cwd=repo.root,
                    prompt=prompt,
                    session_id=session_id,
                    model=model,
                    effort=effort,
                )

            log = _chats_dir(repo, scope) / f"{conv}.jsonl"
            _append(log, "user", text)
            final_text = ""

            async def run_turn():
                nonlocal final_text
                async for event in proc.events():
                    if event["type"] == "session" and event.get("session_id"):
                        _set_session(repo, scope, conv, event["session_id"])
                    if event["type"] == "result":
                        final_text = event["text"]
                    await ws.send_json(event)

            async def listen_for_cancel():
                while True:
                    m = await ws.receive_json()
                    if m.get("type") == "cancel" and proc:
                        await proc.cancel()
                        return

            turn = asyncio.create_task(run_turn())
            listener = asyncio.create_task(listen_for_cancel())
            done, _ = await asyncio.wait({turn, listener}, return_when=asyncio.FIRST_COMPLETED)
            if turn in done:
                listener.cancel()
                turn.result()  # re-raise
            else:
                await turn  # cancel path: drain remaining events (yields "Cancelled.")

            if final_text:
                _append(log, "assistant", final_text)

            # -- epilogue -------------------------------------------------
            # protected ground truth: any direct change to db entries or the
            # rulebook gets flagged before it is checkpointed (memory.md edits
            # are sanctioned; chat logs are ours)
            touched = [
                f
                for f in gitops.changed_files(repo.root, "db", "CLAUDE.md")
                if not f.startswith("db/chats/") and f != "db/memory.md"
            ]
            if touched:
                await ws.send_json({
                    "type": "warning",
                    "message": "The agent changed protected files directly: "
                    + ", ".join(touched)
                    + ". The change is checkpointed - review it in History and undo if unwanted.",
                })
            if gitops.is_dirty(repo.root, scope):
                gitops.checkpoint(repo.root, scope, "agent turn")
                if scope.startswith("app:"):
                    app_id = scope[4:]
                    result = render.render(repo.root, app_id)
                    await ws.send_json({"type": "rendered", **result})
            proposals = repo.list_proposals()
            await ws.send_json({"type": "proposals", "count": len(proposals)})
            await ws.send_json({"type": "turn_done", "first_turn": first_turn})

    except WebSocketDisconnect:
        if proc:
            await proc.cancel()
