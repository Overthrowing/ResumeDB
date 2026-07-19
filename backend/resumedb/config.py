import json
import os
import shutil
from pathlib import Path

CONFIG_PATH = Path(os.environ.get("RESUMEDB_CONFIG_PATH", Path.home() / ".resumedb.json")).expanduser()

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
        "audit": None,
        "audit_effort": "low",
        "jd": None,
        "jd_effort": "low",
    },
}

CLAUDE_MODEL_NAMES = {"haiku", "sonnet", "opus"}


def _clear_incompatible_models(cfg: dict) -> None:
    """Drop stale provider-specific selections when the provider changes."""
    provider = cfg.get("agent_provider", "claude")
    models = cfg.get("models", {})
    for task in ("chat", "tailor", "audit", "jd"):
        model = models.get(task)
        if provider == "codex" and model in CLAUDE_MODEL_NAMES:
            models[task] = None
        elif provider == "claude" and isinstance(model, str) and model.startswith("gpt-"):
            models[task] = None


def load() -> dict:
    cfg = json.loads(json.dumps(DEFAULTS))
    if CONFIG_PATH.exists():
        stored = json.loads(CONFIG_PATH.read_text())
        cfg.update({k: v for k, v in stored.items() if k != "models"})
        cfg["models"].update(stored.get("models", {}))
    if os.environ.get("RESUMEDB_DATA_REPO"):
        cfg["data_repo"] = os.environ["RESUMEDB_DATA_REPO"]
    if os.environ.get("RESUMEDB_AGENT_PROVIDER"):
        cfg["agent_provider"] = os.environ["RESUMEDB_AGENT_PROVIDER"]
    _clear_incompatible_models(cfg)
    return cfg


def save(cfg: dict) -> None:
    _clear_incompatible_models(cfg)
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2) + "\n")


def claude_bin(cfg: dict) -> str | None:
    return cfg.get("claude_bin") or shutil.which("claude")


def codex_bin(cfg: dict) -> str | None:
    return cfg.get("codex_bin") or shutil.which("codex")


def typst_bin() -> str | None:
    return shutil.which("typst")
