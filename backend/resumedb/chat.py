"""Chat API: conversation CRUD + a WebSocket that subscribes to durable turns.

Scopes: "db", "apps", or "app:<id>". Each scope holds multiple conversations
stored as JSONL message files (db/chats/, applications/chats/,
applications/<id>/chats/). Turn execution lives in turns.py; the socket here
only starts turns and forwards their events, so a dropped socket never kills a
running turn and a reconnect replays it.

Client sends {"type": "message", "text": ..., "model"?, "effort"?} or
{"type": "cancel"}. Server sends {"type": "conversation", "id"} when a first
message creates a conversation, then the normalized turn events (turn_start,
session, text_delta, thinking_delta, tool_use, result, warning, rendered,
proposals, error, turn_done).
"""

import asyncio
import datetime
import re
from pathlib import Path

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from . import config, gitops, turns
from .datarepo import DataRepo, DataRepoError
from .providers import AgentError, get_agent, model_for
from .turns import BadScope, TurnBusy, check_scope, manager

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


def _check_conv(conv: str) -> str:
    if not CONV_RE.fullmatch(conv):
        raise HTTPException(400, f"bad conversation id: {conv!r}")
    return conv


def _check_scope(scope: str) -> str:
    try:
        return check_scope(scope)
    except BadScope as e:
        raise HTTPException(400, str(e))


@router.get("/api/chat/{scope}/conversations")
def list_conversations(scope: str):
    repo = _repo()
    _check_scope(scope)
    try:
        d = turns.chats_dir(repo, scope)
    except DataRepoError as e:
        raise HTTPException(404, str(e))
    active = manager.active_convs(scope)
    out = []
    for f in sorted(d.glob("*.jsonl"), reverse=True):
        msgs = turns.read_messages(f)
        title = next((m["text"] for m in msgs if m.get("role") == "user"), "(empty)")
        title = re.sub(r"\s+", " ", title).strip() or "(empty)"
        try:
            created = datetime.datetime.strptime(f.stem, "%Y%m%d-%H%M%S").timestamp()
        except ValueError:
            created = f.stat().st_mtime
        out.append({
            "id": f.stem, "title": title[:80], "created": created,
            "count": len(msgs), "active": f.stem in active,
        })
    return out


@router.get("/api/chat/{scope}/conversations/{conv}")
def get_conversation(scope: str, conv: str):
    repo = _repo()
    _check_scope(scope)
    try:
        turns.reap_stale(repo, scope, _check_conv(conv), manager)
        return {
            "messages": turns.read_messages(turns.conv_path(repo, scope, conv)),
            "active": manager.active(scope, conv) is not None,
        }
    except DataRepoError as e:
        raise HTTPException(404, str(e))


@router.delete("/api/chat/{scope}/conversations/{conv}")
def delete_conversation(scope: str, conv: str):
    repo = _repo()
    _check_scope(scope)
    if manager.active(scope, _check_conv(conv)):
        raise HTTPException(409, "a turn is running in this conversation; cancel it first")
    try:
        path = turns.conv_path(repo, scope, conv)
    except DataRepoError as e:
        raise HTTPException(404, str(e))
    if not path.exists():
        raise HTTPException(404, f"no conversation {conv}")
    path.unlink()
    turns._turn_log(repo, scope, conv).unlink(missing_ok=True)
    turns.set_session(repo, scope, conv, None)
    gitops.checkpoint(repo.root, scope, f"delete conversation {conv}")
    return {"ok": True}


async def _forward(ws: WebSocket, turn: turns.Turn) -> None:
    """Send a turn's events (replay + live) to one socket. Socket death here is
    fine - the turn keeps running and a reconnect replays."""
    try:
        async for event in turn.subscribe():
            await ws.send_json(event)
    except Exception:
        pass


@router.websocket("/api/chat")
async def chat_ws(ws: WebSocket, scope: str, conversation: str = ""):
    await ws.accept()
    try:
        check_scope(scope)
    except BadScope as e:
        await ws.send_json({"type": "error", "message": str(e)})
        await ws.close()
        return
    repo = _repo()
    conv = conversation if conversation and CONV_RE.fullmatch(conversation) else None

    forward: asyncio.Task | None = None
    if conv:
        active = manager.active(scope, conv)
        if active:  # re-attach after refresh/navigation
            forward = asyncio.create_task(_forward(ws, active))

    try:
        while True:
            msg = await ws.receive_json()
            kind = msg.get("type")

            if kind == "cancel":
                if conv and (t := manager.active(scope, conv)):
                    await t.cancel()
                continue
            if kind != "message":
                continue
            text = (msg.get("text") or "").strip()
            if not text:
                continue
            if conv and manager.active(scope, conv):
                await ws.send_json({"type": "error", "message": "A turn is already running."})
                continue

            cfg = config.load()
            try:
                agent = get_agent(cfg)
            except AgentError as e:
                await ws.send_json({"type": "error", "message": str(e)})
                continue

            if conv is None:
                conv = turns.new_conv_id()
                await ws.send_json({"type": "conversation", "id": conv})

            prompt = text
            if not turns.get_session(repo, scope, conv):  # first turn gets the scope intro
                if scope.startswith("app:"):
                    intro = APP_INTRO.format(app_id=scope[4:])
                elif scope == "apps":
                    intro = APPS_INTRO.format(base=f"http://{ws.headers.get('host', 'localhost:8000')}")
                else:
                    intro = DB_INTRO
                prompt = intro + text

            kind_ = "tailor" if scope.startswith("app:") else "chat"
            model, effort = model_for(cfg, kind_)
            model = msg.get("model") or model
            effort = msg.get("effort") or effort

            try:
                turn = manager.start(repo, agent, scope, conv, text, prompt, model, effort)
            except TurnBusy as e:
                await ws.send_json({"type": "error", "message": str(e)})
                continue
            if forward:
                forward.cancel()
            forward = asyncio.create_task(_forward(ws, turn))

    except WebSocketDisconnect:
        pass  # deliberately do NOT cancel the turn - it runs to completion
    finally:
        if forward:
            forward.cancel()
