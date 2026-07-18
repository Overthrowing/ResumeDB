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


def sync_new_skills(path: Path) -> None:
    """Copy scaffold skills (and a missing CLAUDE.md) into an existing data repo.

    Never overwrites: skills and CLAUDE.md are user-editable, so only whole
    skills the repo does not have yet are added, and CLAUDE.md is restored only
    if it is missing entirely (e.g. an agent deleted it - it is the standing
    rulebook, so a repo must never run without one).
    """
    if not is_datarepo(path):
        return
    added = []
    for skill_dir in (SCAFFOLD / ".claude" / "skills").iterdir():
        target = path / ".claude" / "skills" / skill_dir.name
        if skill_dir.is_dir() and not target.exists():
            shutil.copytree(skill_dir, target)
            added.append(f"skill {skill_dir.name}")
    if not (path / "CLAUDE.md").exists():
        shutil.copy(SCAFFOLD / "CLAUDE.md", path / "CLAUDE.md")
        added.append("CLAUDE.md")
    if added:
        gitops.checkpoint(path, "db", f"sync from app update: {', '.join(added)}")


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

    def approve_proposal(self, name: str) -> str:
        src = self._proposal_path(name)
        try:
            data = _load(src) or {}
        except Exception as e:
            raise DataRepoError(
                f"proposal {name} is not valid YAML ({type(e).__name__}). "
                f"Ask the assistant to rewrite it, or discard it."
            )
        target = data.pop("target", None)
        if not target or not re.fullmatch(r"db/[a-z0-9][a-z0-9-]*\.yaml", str(target)):
            raise DataRepoError(f"proposal {name} has no valid db/ target")
        _dump(data, self.root / target)
        src.unlink()
        gitops.checkpoint(self.root, "db", f"approve proposal {name} -> {target}")
        return target

    def reject_proposal(self, name: str) -> None:
        self._proposal_path(name).unlink()
        gitops.checkpoint(self.root, "db", f"reject proposal {name}")

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

