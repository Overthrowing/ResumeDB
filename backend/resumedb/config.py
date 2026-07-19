import json
import shutil
from pathlib import Path

CONFIG_PATH = Path.home() / ".resumedb.json"

DEFAULTS = {
    "data_repo": str(Path.home() / "resume-data"),
    "agent_provider": "claude",
    "claude_bin": None,  # null = resolve via which
    "codex_bin": None,   # null = resolve via which
    "models": {
        "chat": None,  # null = user's CLI default
        "chat_effort": None,
        "tailor": None,  # null = fall back to chat model
        "tailor_effort": "high",  # tailoring thinks by default
        "audit": "sonnet",
        "audit_effort": "low",
        "jd": "haiku",
        "jd_effort": "low",
    },
}


def load() -> dict:
    cfg = json.loads(json.dumps(DEFAULTS))
    if CONFIG_PATH.exists():
        stored = json.loads(CONFIG_PATH.read_text())
        cfg.update({k: v for k, v in stored.items() if k != "models"})
        cfg["models"].update(stored.get("models", {}))
    return cfg


def save(cfg: dict) -> None:
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2) + "\n")


def claude_bin(cfg: dict) -> str | None:
    return cfg.get("claude_bin") or shutil.which("claude")


def codex_bin(cfg: dict) -> str | None:
    return cfg.get("codex_bin") or shutil.which("codex")


def typst_bin() -> str | None:
    return shutil.which("typst")

