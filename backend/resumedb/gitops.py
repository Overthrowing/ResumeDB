"""Git checkpoints for the data repo. Scope is "db" or "app:<id>".

db scope = everything except applications/; app:<id> scope = applications/<id>.
One checkpoint per event, events never span scopes, so path-scoped log is exact.
"""

import subprocess
from pathlib import Path


class GitError(Exception):
    pass


def _git(repo: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess:
    proc = subprocess.run(
        ["git", "-C", str(repo), *args], capture_output=True, text=True
    )
    if check and proc.returncode != 0:
        raise GitError(proc.stderr.strip() or proc.stdout.strip())
    return proc


def _scope_pathspec(scope: str) -> list[str]:
    if scope.startswith("app:"):
        return [f"applications/{scope[4:]}"]
    if scope == "apps":
        return ["applications"]
    return [".", ":(exclude)applications"]


def init(repo: Path) -> None:
    _git(repo, "init")
    _git(repo, "add", "-A")
    _git(repo, "commit", "-m", "db: scaffold data repo")


def checkpoint(repo: Path, scope: str, message: str) -> str | None:
    """Commit changes under scope. Returns commit sha, or None if nothing changed."""
    _git(repo, "add", "-A", "--", *_scope_pathspec(scope))
    staged = _git(repo, "diff", "--cached", "--quiet", check=False)
    if staged.returncode == 0:
        return None
    _git(repo, "commit", "-m", f"{scope}: {message}")
    return _git(repo, "rev-parse", "HEAD").stdout.strip()


def is_dirty(repo: Path, scope: str) -> bool:
    out = _git(repo, "status", "--porcelain", "--", *_scope_pathspec(scope)).stdout
    return bool(out.strip())


def changed_files(repo: Path, *paths: str) -> list[str]:
    """Uncommitted changed/deleted/new file paths under the given pathspecs."""
    out = _git(repo, "status", "--porcelain", "--", *paths).stdout
    return [line[3:].strip().strip('"') for line in out.splitlines() if line.strip()]


def log(repo: Path, scope: str, limit: int = 100) -> list[dict]:
    proc = _git(
        repo, "log", f"-{limit}", "--format=%H%x00%ct%x00%s", "--",
        *_scope_pathspec(scope), check=False,
    )
    entries = []
    for line in proc.stdout.splitlines():
        sha, ts, subject = line.split("\x00", 2)
        entries.append({"sha": sha, "timestamp": int(ts), "subject": subject})
    return entries


def diff(repo: Path, sha: str) -> str:
    return _git(repo, "show", "--stat", "--patch", sha).stdout


def revert(repo: Path, sha: str) -> None:
    proc = _git(repo, "revert", "--no-edit", sha, check=False)
    if proc.returncode != 0:
        _git(repo, "revert", "--abort", check=False)
        raise GitError(
            "Revert conflicts with a later change on the same files. "
            "Revert newer checkpoints on this scope first.\n" + proc.stderr.strip()
        )
