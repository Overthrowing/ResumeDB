"""Data repo layer: YAML CRUD for entries, applications, proposals; init/scaffold.

ruamel.yaml round-trip mode so hand-written comments and key order in the
user-owned ground truth survive form saves.
"""

import datetime
import hashlib
import io
import re
import shutil
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from ruamel.yaml import YAML

from . import gitops

SCAFFOLD = Path(__file__).parent / "scaffold"
MARKER = ".resumedb"
ENTRY_TYPES = {"experience", "project", "skill", "course", "education", "achievement", "extra"}
NON_ENTRY_FILES = {"profile", "memory"}
LEGACY_SAMPLE_SHA256 = "e1655cf2d9aea0c9d3ca899b0b1b7495d597c8ff9c7f7e835fcdd42088f952d0"
APP_FILES = {
    "jd.md",
    "notes.md",
    "resume.yaml",
    "resume.typ",
    "cover-letter.md",
    "decisions.md",
    "answers.yaml",
    "readiness.yaml",
    "tailoring.yaml",
}
UPLOAD_EXTS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".md"}

APP_STATUSES = ["not_started", "in_progress", "draft", "ready", "submitted"]
STATUS_ALIASES = {"awaiting_review": "draft", "applied": "submitted"}
PROFILE_FACTS = [
    ("name", "Full name"),
    ("email", "Email"),
    ("phone", "Phone"),
    ("location", "Location"),
    ("college", "College"),
    ("major", "Major"),
    ("degree", "Degree"),
    ("graduation_year", "Graduation year"),
    ("work_authorization", "Work authorization"),
    ("requires_sponsorship", "Sponsorship requirement"),
]
APPLICATION_ANSWER_FACTS = [
    ("age_18_or_older", "Age eligibility"),
    ("gender", "Gender identity or decline choice"),
    ("race_ethnicity", "Race or ethnicity or decline choice"),
    ("veteran_status", "Veteran status or decline choice"),
    ("disability_status", "Disability status or decline choice"),
]


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
    for d in ("applications", "proposals", "discovery", "discovery/leads"):
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
            if (
                f.name == "sample-experience.yaml"
                and hashlib.sha256(f.read_bytes()).hexdigest() == LEGACY_SAMPLE_SHA256
            ):
                # Old scaffolds shipped an illustrative Acme role. It is never
                # candidate evidence unless the user replaces the sample file.
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

    def profile_gaps(self) -> list[dict]:
        profile = self.get_profile()
        gaps = [
            {"key": key, "label": label}
            for key, label in PROFILE_FACTS
            if profile.get(key) is None or str(profile.get(key)).strip() == ""
        ]
        answers = profile.get("application_answers") or {}
        gaps.extend(
            {"key": key, "label": label}
            for key, label in APPLICATION_ANSWER_FACTS
            if answers.get(key) is None or str(answers.get(key)).strip() == ""
        )
        return gaps

    def knowledge_context(self) -> dict:
        """Return the complete canonical context available to career agents."""
        return {
            "profile": self.get_profile(),
            "entries": self.list_entries(),
            "memory": self.get_memory()["content"],
        }

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
            meta["status"] = STATUS_ALIASES.get(meta.get("status"), meta.get("status", "not_started"))
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

    def create_application(
        self,
        company: str,
        role: str,
        jd_text: str,
        template: str,
        *,
        source: str | None = None,
        fit_score: int | None = None,
        fit_summary: str | None = None,
    ) -> str:
        slug = re.sub(r"[^a-z0-9]+", "-", f"{company} {role}".lower()).strip("-")
        app_id = f"{datetime.date.today():%Y-%m}-{slug}"
        d = self.root / "applications" / app_id
        suffix = 2
        while d.exists():
            app_id = f"{datetime.date.today():%Y-%m}-{slug}-{suffix}"
            d = self.root / "applications" / app_id
            suffix += 1
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
                "source": source,
                "fit_score": fit_score,
                "fit_summary": fit_summary,
                "session_id": None,
            },
            d / "meta.yaml",
        )
        (d / "jd.md").write_text(jd_text)
        (d / "notes.md").write_text("")
        _dump({"answers": [], "missing": []}, d / "answers.yaml")
        _dump({"comparisons": []}, d / "tailoring.yaml")
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
        meta["status"] = STATUS_ALIASES.get(meta.get("status"), meta.get("status", "not_started"))
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

    META_FIELDS = {
        "company",
        "role",
        "status",
        "deadline",
        "source",
        "template",
        "session_id",
        "submitted_at",
        "fit_score",
        "fit_summary",
        "outcome",
    }
    APP_STATUSES = APP_STATUSES

    def set_app_meta(self, app_id: str, **updates) -> None:
        bad = set(updates) - self.META_FIELDS
        if bad:
            raise DataRepoError(f"not editable meta fields: {sorted(bad)}")
        if "status" in updates:
            updates["status"] = STATUS_ALIASES.get(updates["status"], updates["status"])
            if updates["status"] not in self.APP_STATUSES:
                raise DataRepoError(f"invalid status: {updates['status']}")
        path = self.app_dir(app_id) / "meta.yaml"
        meta = _load(path) or {}
        meta.update(updates)
        _dump(meta, path)
        if set(updates) - {"session_id"}:  # session bookkeeping is not a user-visible change
            gitops.checkpoint(self.root, f"app:{app_id}", "edit details")

    def readiness_report(self, app_id: str) -> dict:
        app = self.get_application(app_id)
        blockers = []
        warnings = []
        jd = app["files"].get("jd.md", "").strip()
        if not jd or jd.startswith("(Fetching job description"):
            blockers.append({
                "key": "job_description",
                "label": "Job description",
                "message": "Add the complete job description before approval.",
            })

        resume_path = self.app_dir(app_id) / "resume.yaml"
        resume = _load(resume_path) or {}
        if not resume.get("sections"):
            blockers.append({
                "key": "resume",
                "label": "Tailored resume",
                "message": "Prepare a tailored resume before approval.",
            })

        pdf_path = self.app_dir(app_id) / "resume.pdf"
        if not pdf_path.exists() or pdf_path.stat().st_size == 0:
            blockers.append({
                "key": "resume_pdf",
                "label": "Rendered resume PDF",
                "message": "Render the tailored resume before approval and autofill.",
            })

        answers_path = self.app_dir(app_id) / "answers.yaml"
        answers = _load(answers_path) if answers_path.exists() else {}
        for item in (answers or {}).get("missing", []):
            target = blockers if item.get("required", True) else warnings
            target.append({
                "key": item.get("key", "answer"),
                "label": item.get("label") or item.get("question") or "Application answer",
                "message": item.get("message") or "This factual answer is missing from your profile.",
            })

        existing_keys = {item["key"] for item in blockers + warnings}
        for gap in self.profile_gaps():
            if gap["key"] in existing_keys:
                continue
            warnings.append({
                **gap,
                "message": "Complete this canonical profile fact so the agent never has to guess.",
            })

        score = max(0, 100 - len(blockers) * 30 - min(len(warnings), 5) * 4)
        return {
            "ready": not blockers,
            "score": score,
            "blockers": blockers,
            "warnings": warnings,
            "status": app["meta"]["status"],
        }

    def approve_application(self, app_id: str) -> dict:
        app = self.get_application(app_id)
        if app["meta"]["status"] != "draft":
            raise DataRepoError("only a draft can be approved as ready")
        report = self.readiness_report(app_id)
        if report["blockers"]:
            labels = ", ".join(item["label"] for item in report["blockers"])
            raise DataRepoError(f"application has unresolved blockers: {labels}")
        self.set_app_meta(app_id, status="ready")
        return self.readiness_report(app_id)

    def mark_submitted(self, app_id: str) -> None:
        app = self.get_application(app_id)
        if app["meta"]["status"] != "ready":
            raise DataRepoError("only a ready application can be marked submitted")
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        self.set_app_meta(app_id, status="submitted", submitted_at=now)

    # -- discovery ----------------------------------------------------------

    def _leads_dir(self) -> Path:
        path = self.root / "discovery" / "leads"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @staticmethod
    def canonical_url(url: str | None) -> str:
        if not url:
            return ""
        parts = urlsplit(url.strip())
        query = [
            (key, value)
            for key, value in parse_qsl(parts.query, keep_blank_values=True)
            if not key.lower().startswith("utm_") and key.lower() not in {"ref", "source"}
        ]
        return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path.rstrip("/"), urlencode(query), ""))

    def save_job_lead(self, lead: dict) -> dict:
        lead = dict(lead)
        url = self.canonical_url(lead.get("application_url") or lead.get("source_url"))
        lead["canonical_url"] = url
        identity = url or f"{lead.get('company', '')}|{lead.get('role', '')}|{lead.get('location', '')}"
        digest = hashlib.sha256(identity.lower().encode()).hexdigest()[:10]
        slug = re.sub(r"[^a-z0-9]+", "-", f"{lead.get('company', '')}-{lead.get('role', '')}".lower()).strip("-")[:60]
        lead_id = lead.get("id") or f"{slug or 'job'}-{digest}"
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", lead_id):
            raise DataRepoError(f"bad lead id: {lead_id!r}")
        path = self._leads_dir() / f"{lead_id}.yaml"
        previous = _load(path) if path.exists() else {}
        previous = previous or {}
        previous.update(lead)
        previous.update({
            "id": lead_id,
            "status": lead.get("status") or previous.get("status") or "inbox",
            "discovered_at": previous.get("discovered_at")
            or datetime.datetime.now(datetime.timezone.utc).isoformat(),
        })
        _dump(previous, path)
        gitops.checkpoint(self.root, "discovery", f"save lead {lead_id}")
        return dict(previous)

    def list_job_leads(self, status: str | None = None) -> list[dict]:
        leads = []
        for path in self._leads_dir().glob("*.yaml"):
            try:
                lead = _load(path) or {}
                lead["id"] = path.stem
                if status is None or lead.get("status") == status:
                    leads.append(dict(lead))
            except Exception:
                continue
        return sorted(leads, key=lambda lead: (lead.get("fit_score") or 0, lead.get("discovered_at") or ""), reverse=True)

    def get_job_lead(self, lead_id: str) -> dict:
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", lead_id):
            raise DataRepoError(f"bad lead id: {lead_id!r}")
        path = self._leads_dir() / f"{lead_id}.yaml"
        if not path.exists():
            raise DataRepoError(f"no job lead {lead_id}")
        lead = _load(path) or {}
        lead["id"] = lead_id
        return dict(lead)

    def set_job_lead_status(self, lead_id: str, status: str, **updates) -> dict:
        if status not in {"inbox", "preparing", "tracked", "dismissed"}:
            raise DataRepoError(f"invalid lead status: {status}")
        lead = self.get_job_lead(lead_id)
        lead.update(updates)
        lead["status"] = status
        return self.save_job_lead(lead)

    def _subscriptions_path(self) -> Path:
        path = self.root / "discovery" / "subscriptions.yaml"
        if not path.exists():
            _dump({"subscriptions": []}, path)
        return path

    def list_search_subscriptions(self) -> list[dict]:
        return list((_load(self._subscriptions_path()) or {}).get("subscriptions", []))

    def save_search_subscription(self, query: str, enabled: bool = True) -> dict:
        query = query.strip()
        if not query:
            raise DataRepoError("search goal cannot be empty")
        doc = _load(self._subscriptions_path()) or {"subscriptions": []}
        subscriptions = doc.setdefault("subscriptions", [])
        sub_id = hashlib.sha256(query.lower().encode()).hexdigest()[:10]
        existing = next((sub for sub in subscriptions if sub.get("id") == sub_id), None)
        data = {
            "id": sub_id,
            "query": query,
            "enabled": enabled,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "last_run_at": existing.get("last_run_at") if existing else None,
        }
        if existing:
            existing.update(data)
        else:
            subscriptions.append(data)
        _dump(doc, self._subscriptions_path())
        gitops.checkpoint(self.root, "discovery", f"save search goal {sub_id}")
        return data

    def mark_subscription_run(self, sub_id: str) -> None:
        doc = _load(self._subscriptions_path()) or {"subscriptions": []}
        for sub in doc.get("subscriptions", []):
            if sub.get("id") == sub_id:
                now = datetime.datetime.now(datetime.timezone.utc).isoformat()
                sub["last_run_at"] = now
                sub["last_attempt_at"] = now
                sub["last_error"] = None
                _dump(doc, self._subscriptions_path())
                gitops.checkpoint(self.root, "discovery", f"run search goal {sub_id}")
                return
        raise DataRepoError(f"no search goal {sub_id}")

    def mark_subscription_error(self, sub_id: str, error: str) -> None:
        doc = _load(self._subscriptions_path()) or {"subscriptions": []}
        for sub in doc.get("subscriptions", []):
            if sub.get("id") == sub_id:
                sub["last_attempt_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
                sub["last_error"] = error.strip()[:500]
                _dump(doc, self._subscriptions_path())
                gitops.checkpoint(self.root, "discovery", f"record search goal error {sub_id}")
                return
        raise DataRepoError(f"no search goal {sub_id}")

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

    def save_entry_proposal(self, entry_id: str, data: dict) -> dict:
        """Persist a reviewable agent proposal without changing canonical facts."""
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", entry_id):
            raise DataRepoError(f"bad entry id: {entry_id!r}")
        if data.get("type") not in ENTRY_TYPES:
            raise DataRepoError(f"type must be one of {sorted(ENTRY_TYPES)}")
        if not str(data.get("title") or "").strip():
            raise DataRepoError("title is required")
        proposal_id = f"connected-agent-{entry_id}"
        path = self.root / "proposals" / f"{proposal_id}.yaml"
        payload = {"target": f"db/{entry_id}.yaml", **data}
        _dump(payload, path)
        gitops.checkpoint(self.root, "db", f"propose entry {entry_id}")
        return {"name": proposal_id, "target": payload["target"], "data": payload, "error": None}

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

    def save_research_run(self, run_id: str, data: dict, *, checkpoint: bool = True) -> None:
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", run_id):
            raise DataRepoError(f"bad run id: {run_id!r}")
        path = self._runs_dir() / f"{run_id}.yaml"
        _dump(data, path)
        if checkpoint:
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
