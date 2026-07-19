"""Data repo layer: YAML CRUD for entries, applications, proposals; init/scaffold.

ruamel.yaml round-trip mode so hand-written comments and key order in the
user-owned ground truth survive form saves.
"""

import datetime
import io
import re
import shutil
from pathlib import Path

from ruamel.yaml import YAML

from . import gitops

SCAFFOLD = Path(__file__).parent / "scaffold"
MARKER = ".resumedb"
ENTRY_TYPES = {"experience", "project", "skill", "course", "education", "achievement", "extra"}
NON_ENTRY_FILES = {"profile", "memory"}
APP_FILES = {"jd.md", "notes.md", "resume.yaml", "resume.typ", "cover-letter.md", "decisions.md"}
UPLOAD_EXTS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".md"}


class DataRepoError(Exception):
    pass


def _yaml() -> YAML:
    # ruamel YAML instances are not thread-safe; FastAPI serves requests from a
    # threadpool, so make a fresh round-trip instance per call.
    y = YAML()
    y.default_flow_style = False
    return y


def _load(path: Path):
    with path.open() as f:
        return _yaml().load(f)


def _dump(data, path: Path) -> None:
    buf = io.StringIO()
    _yaml().dump(data, buf)
    path.write_text(buf.getvalue())


def init_datarepo(path: Path) -> None:
    if path.exists() and any(path.iterdir()) and not (path / MARKER).exists():
        raise DataRepoError(f"{path} exists and is not empty; refusing to scaffold over it")
    path.mkdir(parents=True, exist_ok=True)
    shutil.copytree(SCAFFOLD, path, dirs_exist_ok=True)
    (path / "gitignore").rename(path / ".gitignore")
    (path / MARKER).touch()
    for d in ("applications", "proposals"):
        (path / d).mkdir(exist_ok=True)
    gitops.init(path)


def is_datarepo(path: Path) -> bool:
    return (path / MARKER).exists()


# App-authored boilerplate the scaffold owns. db/, applications/, proposals/
# are deliberately absent - that is user data, never overwritten by a sync.
BOILERPLATE_FILES = ("CLAUDE.md", "templates/SCHEMA.md", "templates/sample.yaml", "templates/classic.typ")


def sync_boilerplate(path: Path, force: bool = False) -> list[str]:
    """Sync app-authored boilerplate (skills, CLAUDE.md, template contract) from
    the scaffold into an existing data repo.

    force=False (health check): additive only - add whole skills the repo lacks
    and restore a missing CLAUDE.md/template file. Never overwrites user edits.
    force=True (make dev): overwrite the boilerplate so scaffold changes
    propagate. Still never touches db/, applications/, or proposals/.

    Returns the git-relative paths that actually changed.
    """
    if not is_datarepo(path):
        return []
    for skill_dir in (SCAFFOLD / ".claude" / "skills").iterdir():
        if not skill_dir.is_dir():
            continue
        target = path / ".claude" / "skills" / skill_dir.name
        if force and target.exists():
            shutil.rmtree(target)
        if not target.exists():
            shutil.copytree(skill_dir, target)
    for rel in BOILERPLATE_FILES:
        dst = path / rel
        if force or not dst.exists():
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(SCAFFOLD / rel, dst)
    changed = gitops.changed_files(path, ".claude/skills", "CLAUDE.md", "templates")
    if changed:
        verb = "overwrite" if force else "add"
        gitops.checkpoint(path, "db", f"sync boilerplate from scaffold ({verb} {len(changed)} file(s))")
    return changed


def sync_new_skills(path: Path) -> None:
    """Additive top-up used by the health check. See sync_boilerplate."""
    sync_boilerplate(path, force=False)


if __name__ == "__main__":  # `python -m resumedb.datarepo` - dev boilerplate push
    from . import config

    root = Path(config.load()["data_repo"]).expanduser()
    if not is_datarepo(root):
        print(f"no data repo at {root} yet - nothing to sync")
    else:
        changed = sync_boilerplate(root, force=True)
        print(
            f"synced {len(changed)} boilerplate file(s) to {root}" if changed
            else f"boilerplate already up to date in {root}"
        )
        for c in changed:
            print(f"  {c}")


class DataRepo:
    def __init__(self, root: Path):
        self.root = Path(root).expanduser()

    # -- entries ------------------------------------------------------------

    def list_entries(self) -> list[dict]:
        entries = []
        for f in sorted((self.root / "db").glob("*.yaml")):
            if f.stem in NON_ENTRY_FILES:
                continue
            data = _load(f) or {}
            data["id"] = f.stem
            entries.append(data)
        return entries

    def entry_path(self, entry_id: str) -> Path:
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", entry_id):
            raise DataRepoError(f"bad entry id: {entry_id!r}")
        return self.root / "db" / f"{entry_id}.yaml"

    def get_entry(self, entry_id: str) -> dict:
        path = self.entry_path(entry_id)
        if not path.exists():
            raise DataRepoError(f"no entry {entry_id}")
        data = _load(path) or {}
        data["id"] = entry_id
        return data

    def save_entry(self, entry_id: str, data: dict) -> None:
        data = dict(data)
        data.pop("id", None)
        if data.get("type") not in ENTRY_TYPES:
            raise DataRepoError(f"type must be one of {sorted(ENTRY_TYPES)}")
        if not data.get("title"):
            raise DataRepoError("title is required")
        path = self.entry_path(entry_id)
        if path.exists():  # merge into loaded doc to preserve comments/order
            doc = _load(path) or {}
            for k in [k for k in doc if k not in data]:
                del doc[k]
            doc.update(data)
            data = doc
        _dump(data, path)
        gitops.checkpoint(self.root, "db", f"save entry {entry_id}")

    def delete_entry(self, entry_id: str) -> None:
        path = self.entry_path(entry_id)
        if not path.exists():
            raise DataRepoError(f"no entry {entry_id}")
        path.unlink()
        gitops.checkpoint(self.root, "db", f"delete entry {entry_id}")

    def get_profile(self) -> dict:
        return _load(self.root / "db" / "profile.yaml") or {}

    def save_profile(self, data: dict) -> None:
        _dump(data, self.root / "db" / "profile.yaml")
        gitops.checkpoint(self.root, "db", "save profile")

    def get_memory(self) -> dict:
        md = self.root / "db" / "memory.md"
        if not md.exists():
            self._migrate_memory()
        return {"content": md.read_text() if md.exists() else ""}

    def save_memory(self, content: str) -> None:
        (self.root / "db" / "memory.md").write_text(content)
        gitops.checkpoint(self.root, "db", "save memory")

    def _migrate_memory(self) -> None:
        """One-time: convert the old structured memory.yaml to plain markdown."""
        old = self.root / "db" / "memory.yaml"
        if not old.exists():
            return
        data = _load(old) or {}
        titles = [
            ("narrative", "Narrative"),
            ("voice", "Voice & style"),
            ("constraints", "Constraints"),
            ("emphasis", "Default emphasis"),
            ("notes", "Notes"),
        ]
        sections = [
            f"## {title}\n\n{str(data.get(key) or '').strip()}\n"
            for key, title in titles
            if str(data.get(key) or "").strip()
        ]
        (self.root / "db" / "memory.md").write_text("\n".join(sections))
        old.unlink()
        claude_md = self.root / "CLAUDE.md"
        if claude_md.exists() and "memory.yaml" in claude_md.read_text():
            claude_md.write_text(claude_md.read_text().replace("memory.yaml", "memory.md"))
        gitops.checkpoint(self.root, "db", "migrate memory to markdown")

    # -- applications --------------------------------------------------------

    def list_applications(self) -> list[dict]:
        apps = []
        for d in sorted((self.root / "applications").iterdir(), reverse=True):
            meta_file = d / "meta.yaml"
            if not meta_file.exists():
                continue
            meta = _load(meta_file) or {}
            meta["id"] = d.name
            apps.append(meta)
        return apps

    def app_dir(self, app_id: str) -> Path:
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", app_id):
            raise DataRepoError(f"bad application id: {app_id!r}")
        d = self.root / "applications" / app_id
        if not d.is_dir():
            raise DataRepoError(f"no application {app_id}")
        return d

    def create_application(self, company: str, role: str, jd_text: str, template: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", f"{company} {role}".lower()).strip("-")
        app_id = f"{datetime.date.today():%Y-%m}-{slug}"
        d = self.root / "applications" / app_id
        if d.exists():
            raise DataRepoError(f"application {app_id} already exists")
        template_file = self.root / "templates" / f"{template}.typ"
        if not template_file.exists():
            raise DataRepoError(f"no template {template}")
        d.mkdir(parents=True)
        profile = self.get_profile()
        _dump(
            {
                "company": company,
                "role": role,
                "template": template,
                "created": f"{datetime.date.today():%Y-%m-%d}",
                "status": "not_started",
                "session_id": None,
            },
            d / "meta.yaml",
        )
        (d / "jd.md").write_text(jd_text)
        (d / "notes.md").write_text("")
        shutil.copy(template_file, d / "resume.typ")
        _dump(
            {
                "name": profile.get("name", ""),
                "headline": role,
                "contact": {k: v for k, v in profile.items() if k != "name"},
                "sections": [],
            },
            d / "resume.yaml",
        )
        gitops.checkpoint(self.root, f"app:{app_id}", f"create application ({company}, {role})")
        return app_id

    def get_application(self, app_id: str) -> dict:
        d = self.app_dir(app_id)
        meta = _load(d / "meta.yaml") or {}
        meta["id"] = app_id
        files = {
            name: (d / name).read_text()
            for name in APP_FILES
            if (d / name).exists()
        }
        return {"meta": meta, "files": files, "has_pdf": (d / "resume.pdf").exists()}

    def save_app_file(self, app_id: str, name: str, content: str) -> None:
        if name not in APP_FILES:
            raise DataRepoError(f"not an editable file: {name}")
        (self.app_dir(app_id) / name).write_text(content)
        gitops.checkpoint(self.root, f"app:{app_id}", f"edit {name}")

    META_FIELDS = {"company", "role", "status", "deadline", "source", "template", "session_id"}
    APP_STATUSES = ["not_started", "in_progress", "awaiting_review", "ready", "applied"]

    def set_app_meta(self, app_id: str, **updates) -> None:
        bad = set(updates) - self.META_FIELDS
        if bad:
            raise DataRepoError(f"not editable meta fields: {sorted(bad)}")
        if "status" in updates and updates["status"] not in self.APP_STATUSES:
            raise DataRepoError(f"invalid status: {updates['status']}")
        path = self.app_dir(app_id) / "meta.yaml"
        meta = _load(path) or {}
        meta.update(updates)
        _dump(meta, path)
        if set(updates) - {"session_id"}:  # session bookkeeping is not a user-visible change
            gitops.checkpoint(self.root, f"app:{app_id}", "edit details")

    # -- proposals -----------------------------------------------------------

    def list_proposals(self) -> list[dict]:
        """One malformed file must never hide the others: parse per-file and
        surface errors as data instead of raising."""
        d = self.root / "proposals"
        if not d.is_dir():
            return []
        out = []
        for f in sorted(p for ext in ("*.yaml", "*.yml") for p in d.glob(ext)):
            try:
                data = _load(f) or {}
                if not isinstance(data, dict):
                    raise DataRepoError("file is not a YAML mapping")
                out.append({"name": f.stem, "target": data.get("target"), "data": data, "error": None})
            except Exception as e:  # scanner/parser errors carry useful positions
                out.append({
                    "name": f.stem, "target": None, "data": {},
                    "error": f"{type(e).__name__}: {str(e)[:300]}",
                })
        return out

    def _proposal_path(self, name: str) -> Path:
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", name):
            raise DataRepoError(f"bad proposal name: {name!r}")
        for ext in (".yaml", ".yml"):
            p = self.root / "proposals" / f"{name}{ext}"
            if p.exists():
                return p
        raise DataRepoError(f"no proposal {name}")

    def _apply_proposal(self, name: str) -> str:
        """Write a proposal to its db/ target and delete the file. No checkpoint."""
        src = self._proposal_path(name)
        try:
            data = _load(src) or {}
        except Exception as e:
            raise DataRepoError(
                f"proposal {name} is not valid YAML ({type(e).__name__}). "
                f"Ask the assistant to rewrite it, or discard it."
            )
        if not isinstance(data, dict):
            raise DataRepoError(f"proposal {name} is not a YAML mapping")
        target = data.pop("target", None)
        if not target or not re.fullmatch(r"db/[a-z0-9][a-z0-9-]*\.yaml", str(target)):
            raise DataRepoError(f"proposal {name} has no valid db/ target")
        _dump(data, self.root / target)
        src.unlink()
        return str(target)

    def approve_proposal(self, name: str) -> str:
        target = self._apply_proposal(name)
        gitops.checkpoint(self.root, "db", f"approve proposal {name} -> {target}")
        return target

    def approve_all_proposals(self) -> dict:
        """Approve every readable proposal in one checkpoint; skip broken ones."""
        approved, skipped = [], []
        for p in self.list_proposals():
            try:
                self._apply_proposal(p["name"])
                approved.append(p["name"])
            except DataRepoError:
                skipped.append(p["name"])
        if approved:
            gitops.checkpoint(self.root, "db", f"approve {len(approved)} proposals")
        return {"approved": approved, "skipped": skipped}

    def reject_proposal(self, name: str) -> None:
        self._proposal_path(name).unlink()
        gitops.checkpoint(self.root, "db", f"reject proposal {name}")

    # -- uploads -------------------------------------------------------------

    def save_upload(self, scope: str, filename: str, data: bytes) -> str:
        """Store a chat attachment; returns its repo-relative path."""
        ext = Path(filename).suffix.lower()
        if ext not in UPLOAD_EXTS:
            allowed = ", ".join(sorted(UPLOAD_EXTS))
            raise DataRepoError(f"file type {ext or '(none)'} not allowed; use {allowed}")
        if scope.startswith("app:"):
            d, git_scope = self.app_dir(scope[4:]) / "uploads", scope
        else:
            d, git_scope = self.root / "uploads", "db"
        d.mkdir(exist_ok=True)
        stem = re.sub(r"[^A-Za-z0-9._-]+", "-", Path(filename).stem).strip("-.") or "file"
        path = d / f"{stem}{ext}"
        n = 2
        while path.exists():
            path, n = d / f"{stem}-{n}{ext}", n + 1
        path.write_bytes(data)
        gitops.checkpoint(self.root, git_scope, f"upload {path.name}")
        return str(path.relative_to(self.root))

    # -- research runs --------------------------------------------------------

    def _runs_dir(self) -> Path:
        d = self.root / "db" / "research_runs"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def save_research_run(self, run_id: str, data: dict) -> None:
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", run_id):
            raise DataRepoError(f"bad run id: {run_id!r}")
        path = self._runs_dir() / f"{run_id}.yaml"
        _dump(data, path)
        gitops.checkpoint(self.root, "db", f"save research run {run_id}")

    def get_research_run(self, run_id: str) -> dict:
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", run_id):
            raise DataRepoError(f"bad run id: {run_id!r}")
        path = self._runs_dir() / f"{run_id}.yaml"
        if not path.exists():
            raise DataRepoError(f"no research run {run_id}")
        return _load(path) or {}

    def list_research_runs(self, limit: int = 10) -> list[dict]:
        d = self._runs_dir()
        runs = []
        for f in sorted(d.glob("*.yaml"), key=lambda x: x.stat().st_mtime, reverse=True):
            try:
                data = _load(f) or {}
                runs.append(data)
                if len(runs) >= limit:
                    break
            except Exception:
                pass
        return runs

    # -- templates -----------------------------------------------------------

    def list_templates(self) -> list[str]:
        return sorted(f.stem for f in (self.root / "templates").glob("*.typ"))

