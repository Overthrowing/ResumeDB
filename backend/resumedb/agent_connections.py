"""Revocable credentials for user-owned agents.

The public application is intentionally single-user for the hackathon. MCP
credentials live beside the ResumeDB config on the persistent volume, never in
the career-data repository or the browser after the creation response.
"""

from __future__ import annotations

import datetime
import hashlib
import hmac
import json
import os
import secrets
from pathlib import Path

from . import config


def _state_path() -> Path:
    return config.CONFIG_PATH.with_name("resumedb-agent-connection.json")


def _digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _read_state() -> dict | None:
    path = _state_path()
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) and data.get("token_sha256") else None


def status() -> dict:
    state = _read_state()
    if not state:
        return {"enabled": False, "created_at": None, "token_hint": None}
    return {
        "enabled": True,
        "created_at": state.get("created_at"),
        "token_hint": state.get("token_hint"),
    }


def rotate() -> tuple[str, dict]:
    token = f"rdb_mcp_{secrets.token_urlsafe(32)}"
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    state = {
        "token_sha256": _digest(token),
        "token_hint": f"{token[:12]}...{token[-4:]}",
        "created_at": now,
    }
    path = _state_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(state, indent=2) + "\n")
    os.chmod(temporary, 0o600)
    temporary.replace(path)
    return token, status()


def revoke() -> bool:
    path = _state_path()
    if not path.exists():
        return False
    path.unlink()
    return True


def verify(token: str) -> bool:
    state = _read_state()
    if not state or not token:
        return False
    return hmac.compare_digest(_digest(token), str(state["token_sha256"]))
