"""App config at ~/.resumedb.json, validated with pydantic on every load so a
hand-edit typo produces a clear message instead of a 500 deep in a route."""

import json
import shutil
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ValidationError

from .fsio import atomic_write

CONFIG_PATH = Path.home() / ".resumedb.json"

Effort = Literal["low", "medium", "high", "xhigh", "max"] | None


class Models(BaseModel):
    # Every model has a concrete default. null is still accepted because a
    # config written before this change can hold one: for tailor it means
    # "inherit the chat model", elsewhere "let the CLI pick".
    chat: str | None = "sonnet"
    chat_effort: Effort = None
    tailor: str | None = "opus"
    tailor_effort: Effort = "high"  # tailoring thinks by default
    audit: str | None = "sonnet"
    audit_effort: Effort = "low"
    jd: str | None = "haiku"
    jd_effort: Effort = "low"


class Config(BaseModel):
    data_repo: str = str(Path.home() / "resume-data")
    agent_provider: Literal["claude", "codex"] = "claude"
    claude_bin: str | None = None  # null = resolve via which
    codex_bin: str | None = None
    models: Models = Models()


class ConfigError(Exception):
    pass


def _validated(cfg: dict, where: str = "") -> Config:
    """Pydantic's error list is unreadable in a toast, so report only the first
    offending field. `where` names the source when the value came off disk."""
    try:
        return Config(**cfg)
    except ValidationError as e:
        first = e.errors()[0]
        loc = ".".join(str(p) for p in first["loc"])
        raise ConfigError(f"{where}invalid value for '{loc}': {first['msg']}")


def load() -> dict:
    stored = {}
    if CONFIG_PATH.exists():
        try:
            stored = json.loads(CONFIG_PATH.read_text())
        except json.JSONDecodeError as e:
            raise ConfigError(f"{CONFIG_PATH} is not valid JSON: {e}")
    return _validated(stored, f"{CONFIG_PATH}: ").model_dump()


def save(cfg: dict) -> dict:
    """Validate and persist. Returns the normalized config."""
    model = _validated(cfg)
    atomic_write(CONFIG_PATH, model.model_dump_json(indent=2) + "\n")
    return model.model_dump()


def claude_bin(cfg: dict) -> str | None:
    return cfg.get("claude_bin") or shutil.which("claude")


def codex_bin(cfg: dict) -> str | None:
    return cfg.get("codex_bin") or shutil.which("codex")


def typst_bin() -> str | None:
    return shutil.which("typst")
