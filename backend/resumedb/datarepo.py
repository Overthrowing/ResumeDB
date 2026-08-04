"""Data repo layer: YAML CRUD for entries, applications, proposals; init/scaffold.

ruamel.yaml round-trip mode (via fsio) so hand-written comments and key order
in the user-owned ground truth survive form saves. All writes are atomic.

Machine-local state (chat sessions, turn logs) lives under .resumedb/, which is
gitignored and doubles as the "this is a ResumeDB repo" marker.
"""

import datetime
import re
import shutil
from pathlib import Path

from . import gitops
from .fsio import NAME_RE, SLUG_RE, atomic_write, dump_yaml, load_yaml

SCAFFOLD = Path(__file__).parent / "scaffold"
MARKER = ".resumedb"
ENTRY_TYPES = {"experience", "project", "skill", "course", "education", "achievement", "extra"}
NON_ENTRY_FILES = {"profile", "memory"}
APP_FILES = {"jd.md", "notes.md", "resume.yaml", "resume.typ", "decisions.md"}
UPLOAD_EXTS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".md"}

# Skills removed from the product, plus ones from the diverged agent-native line
# that reference endpoints this backend does not serve. Pruned from existing data
# repos on sync so an agent cannot follow instructions into a 404.
RETIRED_SKILLS = {"cover-letter", "discover-jobs", "add-job", "prepare-application"}


class DataRepoError(Exception):
    pass


def _load_mapping(path: Path) -> dict:
    """Load a YAML file that has to be a mapping. Raises DataRepoError, which
    the list_* readers catch per file and surface as data on that item."""
    data = load_yaml(path) or {}
    if not isinstance(data, dict):
        raise DataRepoError(f"{path.name} is not a YAML mapping")
    return data


def _today() -> str:
    return f"{datetime.date.today():%Y-%m-%d}"


def is_datarepo(path: Path) -> bool:
    return (path / MARKER).exists()


def state_dir(root: Path) -> Path:
    """Machine-local state directory (.resumedb/). Converts the legacy marker
    file from older repos into a directory."""
    d = root / MARKER
    if d.is_file():
        d.unlink()
    d.mkdir(exist_ok=True)
    return d


def init_datarepo(path: Path) -> None:
    if path.exists() and any(path.iterdir()) and not is_datarepo(path):
        raise DataRepoError(f"{path} exists and is not empty; refusing to scaffold over it")
    path.mkdir(parents=True, exist_ok=True)
    shutil.copytree(SCAFFOLD, path, dirs_exist_ok=True)
    (path / "gitignore").rename(path / ".gitignore")
    state_dir(path)
    for d in ("applications", "proposals"):
        (path / d).mkdir(exist_ok=True)
    gitops.init(path)


# App-authored boilerplate the scaffold owns. db/, applications/, proposals/
# are deliberately absent - that is user data, never overwritten by a sync.
BOILERPLATE_FILES = (
    "CLAUDE.md", "AGENTS.md",
    "templates/SCHEMA.md", "templates/sample.yaml", "templates/classic.typ",
)


def sync_boilerplate(path: Path, force: bool = False) -> list[str]:
    """Sync app-authored boilerplate (skills, CLAUDE.md/AGENTS.md, template
    contract) from the scaffold into an existing data repo.

    force=False: additive only - add whole skills the repo lacks and restore a
    missing boilerplate file. Never overwrites user edits.
    force=True (make dev / explicit sync): overwrite the boilerplate so scaffold
    changes propagate. Still never touches db/, applications/, or proposals/.

    Retired skills are pruned either way. Returns the git-relative paths that
    actually changed.
    """
    if not is_datarepo(path):
        return []
    skills_root = path / ".claude" / "skills"
    for name in RETIRED_SKILLS:
        if (skills_root / name).exists():
            shutil.rmtree(skills_root / name)
    for skill_dir in (SCAFFOLD / ".claude" / "skills").iterdir():
        if not skill_dir.is_dir():
            continue
        target = skills_root / skill_dir.name
        if force and target.exists():
            shutil.rmtree(target)
        if not target.exists():
            shutil.copytree(skill_dir, target)
    for rel in BOILERPLATE_FILES:
        dst = path / rel
        if force or not dst.exists():
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(SCAFFOLD / rel, dst)
    # adopted pre-refactor repos lack the .resumedb/ ignore; committing
    # machine-local turn logs into checkpoints would corrupt undo semantics
    gi = path / ".gitignore"
    lines = gi.read_text().splitlines() if gi.exists() else []
    missing = [rule for rule in (".resumedb/", ".resumedb-tmp-*") if rule not in lines]
    if missing:
        atomic_write(gi, "\n".join([*lines, *missing]) + "\n")
    # ignoring it is not enough once it is tracked; the resulting index change
    # must be part of this checkpoint, or adoption leaves the user's repo dirty
    untracked_marker = gitops.untrack(path, MARKER)
    changed = gitops.changed_files(path, ".claude/skills", "CLAUDE.md", "AGENTS.md", "templates", ".gitignore")
    if changed or untracked_marker:
        verb = "overwrite" if force else "add"
        note = f"sync boilerplate from scaffold ({verb} {len(changed)} file(s))"
        if untracked_marker:
            note += f"; stop tracking {MARKER}/"
        gitops.checkpoint(path, "db", note)
    return changed


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
        """One malformed file must never hide the rest: a bad parse is surfaced
        as data on that entry, not raised for the whole list."""
        entries = []
        for f in sorted((self.root / "db").glob("*.yaml")):
            if f.stem in NON_ENTRY_FILES:
                continue
            try:
                data = _load_mapping(f)
                data["error"] = None
            except Exception as e:
                data = {"title": f.stem, "type": "extra",
                        "error": f"{type(e).__name__}: {str(e)[:300]}"}
            data["id"] = f.stem
            entries.append(data)
        return entries

    def entry_path(self, entry_id: str) -> Path:
        if not SLUG_RE.fullmatch(entry_id):
            raise DataRepoError(f"bad entry id: {entry_id!r}")
        return self.root / "db" / f"{entry_id}.yaml"

    def get_entry(self, entry_id: str) -> dict:
        path = self.entry_path(entry_id)
        if not path.exists():
            raise DataRepoError(f"no entry {entry_id}")
        data = load_yaml(path) or {}
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
            doc = load_yaml(path) or {}
            for k in [k for k in doc if k not in data]:
                del doc[k]
            doc.update(data)
            data = doc
        dump_yaml(data, path)
        gitops.checkpoint(self.root, "db", f"save entry {entry_id}", [f"db/{entry_id}.yaml"])

    def delete_entry(self, entry_id: str) -> None:
        path = self.entry_path(entry_id)
        if not path.exists():
            raise DataRepoError(f"no entry {entry_id}")
        path.unlink()
        gitops.checkpoint(self.root, "db", f"delete entry {entry_id}", [f"db/{entry_id}.yaml"])

    def get_profile(self) -> dict:
        return load_yaml(self.root / "db" / "profile.yaml") or {}

    def save_profile(self, data: dict) -> None:
        dump_yaml(data, self.root / "db" / "profile.yaml")
        gitops.checkpoint(self.root, "db", "save profile", ["db/profile.yaml"])

    def get_memory(self) -> dict:
        md = self.root / "db" / "memory.md"
        return {"content": md.read_text() if md.exists() else ""}

    def save_memory(self, content: str) -> None:
        atomic_write(self.root / "db" / "memory.md", content)
        gitops.checkpoint(self.root, "db", "save memory", ["db/memory.md"])

    # -- applications --------------------------------------------------------

    def list_applications(self) -> list[dict]:
        apps = []
        for d in sorted((self.root / "applications").iterdir(), reverse=True):
            meta_file = d / "meta.yaml"
            if not meta_file.exists():
                continue
            try:  # a single unparseable meta.yaml must not blank the pipeline
                meta = self._normalize(_load_mapping(meta_file))
                meta["error"] = None
            except Exception as e:
                meta = {"company": d.name, "role": "(unreadable meta.yaml)",
                        "status": "not_started", "history": [],
                        "error": f"{type(e).__name__}: {str(e)[:300]}"}
            meta["id"] = d.name
            apps.append(meta)
        return apps

    def app_dir(self, app_id: str) -> Path:
        if not SLUG_RE.fullmatch(app_id) or app_id == "chats":
            raise DataRepoError(f"bad application id: {app_id!r}")
        d = self.root / "applications" / app_id
        if not (d / "meta.yaml").exists():  # a bare directory is not an application
            raise DataRepoError(f"no application {app_id}")
        return d

    def create_application(self, company: str, role: str, jd_text: str, template: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", f"{company} {role}".lower()).strip("-")[:100]
        if not slug:  # e.g. a company/role with no ASCII alphanumerics at all
            raise DataRepoError("company and role need at least one letter or digit")
        created = _today()
        app_id = f"{created[:7]}-{slug}"  # YYYY-MM prefix keeps the folder sorted
        d = self.root / "applications" / app_id
        if d.exists():
            raise DataRepoError(f"application {app_id} already exists")
        # `template` is client-controlled and becomes a path component: an
        # unvalidated "../../.." reads any .typ file on the machine into the
        # application (and back out through GET /applications/<id>).
        if template not in self.list_templates():
            raise DataRepoError(f"no template {template}")
        template_file = self.root / "templates" / f"{template}.typ"
        d.mkdir(parents=True)
        profile = self.get_profile()
        dump_yaml(
            {
                "company": company,
                "role": role,
                "template": template,
                "created": created,
                "status": "not_started",
                "history": [{"status": "not_started", "date": created}],
            },
            d / "meta.yaml",
        )
        atomic_write(d / "jd.md", jd_text)
        atomic_write(d / "notes.md", "")
        shutil.copy(template_file, d / "resume.typ")
        dump_yaml(
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
        meta = self._normalize(load_yaml(d / "meta.yaml") or {})
        meta["id"] = app_id
        # errors="replace": one stray byte in notes.md must not make the whole
        # application unopenable
        files = {
            name: (d / name).read_text(errors="replace")
            for name in APP_FILES
            if (d / name).exists()
        }
        return {"meta": meta, "files": files, "has_pdf": (d / "resume.pdf").exists()}

    def save_app_file(self, app_id: str, name: str, content: str) -> None:
        if name not in APP_FILES:
            raise DataRepoError(f"not an editable file: {name}")
        atomic_write(self.app_dir(app_id) / name, content)
        gitops.checkpoint(self.root, f"app:{app_id}", f"edit {name}",
                          [f"applications/{app_id}/{name}"])
        if name == "resume.yaml":
            self.mark_drafted(app_id)

    def mark_drafted(self, app_id: str) -> bool:
        """Move a still-untouched application to in_progress once its resume has
        real content. Returns True if the status moved.

        The signal is resume.yaml having sections: create_application scaffolds
        the file with `sections: []`, so its existence proves nothing. Only
        not_started advances - a later status is a statement the user made, and
        re-tailoring an application they already sent must not walk it back.
        """
        try:
            meta = _load_mapping(self.app_dir(app_id) / "meta.yaml")
            if self._normalize(meta)["status"] != "not_started":
                return False
            resume = load_yaml(self.app_dir(app_id) / "resume.yaml") or {}
        except (DataRepoError, OSError, ValueError):
            return False  # a half-written or malformed app is not a status event
        if not (isinstance(resume, dict) and resume.get("sections")):
            return False
        self.set_app_meta(app_id, status="in_progress")
        return True

    META_FIELDS = {"company", "role", "status", "deadline", "source", "template", "outcome_note"}
    APP_STATUSES = [
        # pre-submission
        "not_started", "in_progress", "awaiting_review", "ready",
        # submitted
        "applied", "screen", "interview", "offer",
        # terminal
        "accepted", "rejected", "ghosted", "withdrawn",
    ]
    LEGACY_STATUSES = {"draft": "not_started"}

    def set_app_meta(self, app_id: str, **updates) -> None:
        bad = set(updates) - self.META_FIELDS
        if bad:
            raise DataRepoError(f"not editable meta fields: {sorted(bad)}")
        if "status" in updates and updates["status"] not in self.APP_STATUSES:
            raise DataRepoError(f"invalid status: {updates['status']}")
        path = self.app_dir(app_id) / "meta.yaml"
        meta = load_yaml(path) or {}
        # snapshot the prior state BEFORE applying updates: synthesizing the
        # history afterwards would record the new status as the origin point
        prior = self._normalize(meta)
        old_status, prior_history = prior["status"], list(prior["history"])
        meta.update(updates)
        new_status = updates.get("status")
        if new_status and new_status != old_status:
            # append-only transition log: the Sankey needs flows, not just the
            # current value. Repeat entries collapse.
            history = prior_history
            if not history or history[-1].get("status") != new_status:
                history.append({"status": new_status, "date": _today()})
            meta["history"] = history
        dump_yaml(meta, path)
        gitops.checkpoint(self.root, f"app:{app_id}", "edit details",
                          [f"applications/{app_id}/meta.yaml"])

    @classmethod
    def _normalize(cls, meta: dict) -> dict:
        """Read-side migration: map retired status values, and give an
        application written before transition tracking a one-entry history from
        its creation date so the flow view is not blank."""
        meta = dict(meta)
        meta["status"] = cls.LEGACY_STATUSES.get(meta.get("status"), meta.get("status")) or "not_started"
        if not meta.get("history"):
            meta["history"] = [{"status": meta["status"], "date": meta.get("created") or ""}]
        return meta

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
                data = _load_mapping(f)
                out.append({"name": f.stem, "target": data.get("target"), "data": data, "error": None})
            except Exception as e:  # scanner/parser errors carry useful positions
                out.append({
                    "name": f.stem, "target": None, "data": {},
                    "error": f"{type(e).__name__}: {str(e)[:300]}",
                })
        return out

    def _proposal_path(self, name: str) -> Path:
        if not NAME_RE.fullmatch(name):
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
            data = load_yaml(src) or {}
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
        dump_yaml(data, self.root / target)
        src.unlink()
        return str(target)

    def approve_proposal(self, name: str) -> str:
        # hold the repo lock across write+unlink+commit: a checkpoint from
        # another request must not stage the half-applied state
        with gitops.repo_lock(self.root):
            target = self._apply_proposal(name)
            gitops.checkpoint(self.root, "db", f"approve proposal {name} -> {target}")
        return target

    def approve_all_proposals(self) -> dict:
        """Approve every readable proposal in one checkpoint; skip broken ones."""
        approved, skipped = [], []
        with gitops.repo_lock(self.root):
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
        if scope not in ("db", "apps") and not scope.startswith("app:"):
            raise DataRepoError(f"bad scope: {scope!r}")
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

    # -- templates -----------------------------------------------------------

    def list_templates(self) -> list[str]:
        return sorted(f.stem for f in (self.root / "templates").glob("*.typ"))
