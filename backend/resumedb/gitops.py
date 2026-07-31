"""Git checkpoints for the data repo. Scope is "db" or "app:<id>".

db scope = everything except applications/; app:<id> scope = applications/<id>.
One checkpoint per event, events never span scopes, so path-scoped log is exact.

All operations hold a per-repo lock: git shares one .git/index, so two
concurrent checkpoints (chat epilogue + a form save) would otherwise corrupt
staging or die on index.lock. Subprocesses get a timeout so a stale lock file
surfaces as an error instead of a hang.
"""

import re
import subprocess
import threading
from pathlib import Path

GIT_TIMEOUT = 30
SHA_RE = re.compile(r"[0-9a-fA-F]{7,40}")

_locks: dict[str, threading.RLock] = {}
_locks_guard = threading.Lock()


def _lock(repo: Path) -> threading.RLock:
    key = str(Path(repo).resolve())
    with _locks_guard:
        return _locks.setdefault(key, threading.RLock())


class GitError(Exception):
    pass


def _git(repo: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess:
    try:
        proc = subprocess.run(
            ["git", "-C", str(repo), *args],
            capture_output=True, text=True, timeout=GIT_TIMEOUT,
        )
    except subprocess.TimeoutExpired:
        raise GitError(
            f"git {args[0]} timed out after {GIT_TIMEOUT}s "
            "(a stale .git/index.lock in the data repo can cause this)"
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
    with _lock(repo):
        _git(repo, "init")
        _git(repo, "add", "-A")
        _git(repo, "commit", "-m", "db: scaffold data repo")


def checkpoint(repo: Path, scope: str, message: str) -> str | None:
    """Commit changes under scope. Returns commit sha, or None if nothing changed."""
    with _lock(repo):
        _git(repo, "add", "-A", "--", *_scope_pathspec(scope))
        staged = _git(repo, "diff", "--cached", "--quiet", check=False)
        if staged.returncode == 0:
            return None
        _git(repo, "commit", "-m", f"{scope}: {message}")
        return _git(repo, "rev-parse", "HEAD").stdout.strip()


def is_dirty(repo: Path, scope: str) -> bool:
    with _lock(repo):
        out = _git(repo, "status", "--porcelain", "--", *_scope_pathspec(scope)).stdout
    return bool(out.strip())


def untrack(repo: Path, path: str) -> bool:
    """Stop tracking a path that should never have been committed, keeping the
    working copy. Returns True if anything was tracked. (Adding a .gitignore
    line does not untrack files that are already in the index.)"""
    with _lock(repo):
        tracked = _git(repo, "ls-files", "--", path, check=False).stdout.strip()
        if not tracked:
            return False
        _git(repo, "rm", "-r", "--cached", "-q", "--", path, check=False)
        return True


def changed_files(repo: Path, *paths: str) -> list[str]:
    """Uncommitted changed/deleted/new file paths under the given pathspecs."""
    with _lock(repo):
        out = _git(repo, "status", "--porcelain", "--", *paths).stdout
    return [line[3:].strip().strip('"') for line in out.splitlines() if line.strip()]


def log(repo: Path, scope: str, limit: int = 100) -> list[dict]:
    with _lock(repo):
        proc = _git(
            repo, "log", f"-{limit}", "--format=%H%x00%ct%x00%s", "--",
            *_scope_pathspec(scope), check=False,
        )
    entries = []
    for line in proc.stdout.splitlines():
        sha, ts, subject = line.split("\x00", 2)
        entries.append({"sha": sha, "timestamp": int(ts), "subject": subject})
    return entries


def _check_sha(sha: str) -> str:
    """A sha reaches git as an argument, so an unvalidated one is argument
    injection: `--output=CLAUDE.md` would make `git show` overwrite a repo file,
    and a revspec range would mass-revert. Only real hex object names pass."""
    if not SHA_RE.fullmatch(sha):
        raise GitError(f"not a valid checkpoint id: {sha!r}")
    return sha


def diff(repo: Path, sha: str) -> str:
    with _lock(repo):
        return _git(repo, "show", "--stat", "--patch", _check_sha(sha), "--").stdout


def revert(repo: Path, sha: str) -> None:
    with _lock(repo):
        proc = _git(repo, "revert", "--no-edit", _check_sha(sha), check=False)
        if proc.returncode != 0:
            _git(repo, "revert", "--abort", check=False)
            raise GitError(
                "Revert conflicts with a later change on the same files. "
                "Revert newer checkpoints on this scope first.\n" + proc.stderr.strip()
            )
