"""HTTP API. Errors use one envelope ({"error", "detail"}, real status codes)
via the handlers in main.py; route code raises HTTPException or domain errors.
"""

import asyncio
import json
import sys
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, PlainTextResponse
from pydantic import BaseModel

from . import audit, config, datarepo, gitops, importer, render
from .providers import AgentError, get_agent, model_for

router = APIRouter(prefix="/api")


def repo() -> datarepo.DataRepo:
    cfg = config.load()
    r = datarepo.DataRepo(Path(cfg["data_repo"]))
    if not datarepo.is_datarepo(r.root):
        raise HTTPException(409, "data repo not initialized; POST /api/datarepo/init")
    return r


# -- health / env / config ----------------------------------------------------

@router.get("/health")
def health():
    """Fast and read-only: no subprocesses, no repo writes."""
    cfg = config.load()
    root = Path(cfg["data_repo"]).expanduser()
    return {
        "agent_provider": cfg["agent_provider"],
        "claude": config.claude_bin(cfg),
        "codex": config.codex_bin(cfg),
        "typst": config.typst_bin(),
        "data_repo": str(root),
        "data_repo_ok": datarepo.is_datarepo(root),
    }


async def _probe(argv: list[str] | None, timeout: float = 15) -> tuple[bool, str]:
    """(ok, stdout) for a CLI probe; (False, "") if the binary is missing."""
    if not argv:
        return False, ""
    try:
        proc = await asyncio.create_subprocess_exec(
            *argv, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL,
        )
        async with asyncio.timeout(timeout):
            out, _ = await proc.communicate()
        return proc.returncode == 0, out.decode("utf-8", "replace").strip()
    except (TimeoutError, OSError):
        return False, ""


@router.get("/env")
async def env_check():
    """Onboarding's environment probe: versions + auth state. Slower than
    /health (runs the CLIs), so only the setup flow calls it."""
    cfg = config.load()
    claude = config.claude_bin(cfg)
    codex = config.codex_bin(cfg)
    typst = config.typst_bin()
    (c_ok, c_ver), (t_ok, t_ver), (a_ok, a_out), (x_ok, x_ver) = await asyncio.gather(
        _probe([claude, "--version"] if claude else None),
        _probe([typst, "--version"] if typst else None),
        _probe([claude, "auth", "status"] if claude else None),
        _probe([codex, "--version"] if codex else None),
    )
    claude_authed = False
    if a_ok:
        try:
            claude_authed = bool(json.loads(a_out).get("loggedIn"))
        except json.JSONDecodeError:
            claude_authed = True  # authed but unexpected output shape
    return {
        "claude": {"installed": bool(claude and c_ok), "version": c_ver or None,
                   "authed": claude_authed},
        # codex auth is not probed (experimental provider, no verified check)
        "codex": {"installed": bool(codex and x_ok), "version": x_ver or None,
                  "authed": None},
        "typst": {"installed": bool(typst and t_ok), "version": t_ver or None},
        "data_repo": cfg["data_repo"],
        "data_repo_ok": datarepo.is_datarepo(Path(cfg["data_repo"]).expanduser()),
    }


@router.get("/config")
def get_config():
    return config.load()


@router.put("/config")
def put_config(cfg: dict):
    merged = config.load()
    merged.update({k: v for k, v in cfg.items() if k != "models"})
    merged["models"].update(cfg.get("models", {}))
    return config.save(merged)


@router.post("/pick-folder")
async def pick_folder():
    """Open a native macOS folder chooser and return the picked absolute path."""
    if sys.platform != "darwin":
        raise HTTPException(501, "folder picker is only supported on macOS")
    proc = await asyncio.create_subprocess_exec(
        "osascript", "-e",
        'POSIX path of (choose folder with prompt "Choose your ResumeDB data folder")',
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
    )
    try:
        async with asyncio.timeout(300):
            out, _ = await proc.communicate()
    except TimeoutError:
        proc.kill()
        return {"path": None}
    if proc.returncode != 0:  # user cancelled
        return {"path": None}
    return {"path": out.decode().strip().rstrip("/")}


class InitBody(BaseModel):
    path: str | None = None


@router.post("/datarepo/init")
def datarepo_init(body: InitBody):
    cfg = config.load()
    if body.path:
        cfg["data_repo"] = body.path
        config.save(cfg)
    root = Path(cfg["data_repo"]).expanduser()
    if datarepo.is_datarepo(root):
        datarepo.sync_boilerplate(root)  # adopt an existing repo, top up boilerplate
    else:
        datarepo.init_datarepo(root)
    return {"ok": True, "path": str(root)}


# -- db entries ----------------------------------------------------------------

@router.get("/db/entries")
def list_entries():
    return repo().list_entries()


@router.get("/db/entries/{entry_id}")
def get_entry(entry_id: str):
    return repo().get_entry(entry_id)


@router.put("/db/entries/{entry_id}")
def put_entry(entry_id: str, data: dict):
    repo().save_entry(entry_id, data)
    return {"ok": True}


@router.delete("/db/entries/{entry_id}")
def delete_entry(entry_id: str):
    repo().delete_entry(entry_id)
    return {"ok": True}


@router.get("/db/profile")
def get_profile():
    return repo().get_profile()


@router.put("/db/profile")
def put_profile(data: dict):
    repo().save_profile(data)
    return {"ok": True}


@router.get("/db/memory")
def get_memory():
    return repo().get_memory()


class MemoryBody(BaseModel):
    content: str


@router.put("/db/memory")
def put_memory(body: MemoryBody):
    repo().save_memory(body.content)
    return {"ok": True}


# -- proposals -----------------------------------------------------------------

@router.get("/proposals")
def list_proposals():
    return repo().list_proposals()


@router.post("/proposals/approve-all")
def approve_all_proposals():
    return repo().approve_all_proposals()


@router.post("/proposals/{name}/approve")
def approve_proposal(name: str):
    return {"ok": True, "target": repo().approve_proposal(name)}


@router.post("/proposals/{name}/reject")
def reject_proposal(name: str):
    repo().reject_proposal(name)
    return {"ok": True}


# -- uploads -------------------------------------------------------------------

MAX_UPLOAD = 20 * 1024 * 1024


@router.post("/upload")
async def upload(scope: str = Form(...), file: UploadFile = File(...)):
    data = await file.read()
    if len(data) > MAX_UPLOAD:
        raise HTTPException(400, "file too large (max 20 MB)")
    path = await asyncio.to_thread(repo().save_upload, scope, file.filename or "file", data)
    return {"path": path}


# -- applications --------------------------------------------------------------

class NewApplication(BaseModel):
    company: str
    role: str
    jd_text: str = ""
    jd_url: str | None = None
    template: str = "classic"


@router.get("/applications")
def list_applications():
    return repo().list_applications()


_bg_tasks: set[asyncio.Task] = set()  # keep strong refs so fetches survive GC


@router.post("/applications")
async def create_application(body: NewApplication):
    r = repo()
    fetch_url = body.jd_url if body.jd_url and not body.jd_text.strip() else None
    jd_text = (
        f"(Fetching job description from {fetch_url} - refresh in a minute.)"
        if fetch_url else body.jd_text
    )
    app_id = await asyncio.to_thread(
        r.create_application, body.company, body.role, jd_text, body.template
    )
    if fetch_url:
        task = asyncio.create_task(_fetch_jd(r, app_id, fetch_url))
        _bg_tasks.add(task)
        task.add_done_callback(_bg_tasks.discard)
    return {"ok": True, "id": app_id}


async def _fetch_jd(r: datarepo.DataRepo, app_id: str, url: str) -> None:
    cfg = config.load()
    prompt = (
        f"Use the jd-from-link skill: fetch {url} and write "
        f"applications/{app_id}/jd.md in the structured format the skill describes."
    )
    try:
        agent = get_agent(cfg)
        model, effort = model_for(cfg, "jd")
        await agent.oneshot(r.root, prompt, model=model, effort=effort)
        await asyncio.to_thread(gitops.checkpoint, r.root, f"app:{app_id}", "fetch jd from link")
    except Exception:
        pass  # placeholder jd.md stays; the user can paste the text instead


@router.get("/applications/{app_id}")
def get_application(app_id: str):
    return repo().get_application(app_id)


@router.put("/applications/{app_id}/meta")
def put_app_meta(app_id: str, updates: dict):
    repo().set_app_meta(app_id, **updates)
    return {"ok": True}


class FileBody(BaseModel):
    content: str


@router.put("/applications/{app_id}/files/{name}")
def put_app_file(app_id: str, name: str, body: FileBody):
    repo().save_app_file(app_id, name, body.content)
    return {"ok": True}


@router.post("/applications/{app_id}/render")
def render_application(app_id: str):
    r = repo()
    r.app_dir(app_id)
    return render.render(r.root, app_id)


@router.get("/applications/{app_id}/resume.pdf")
def get_pdf(app_id: str):
    pdf = repo().app_dir(app_id) / "resume.pdf"
    if not pdf.exists():
        raise HTTPException(404, "not rendered yet")
    return FileResponse(pdf, media_type="application/pdf", headers={"Cache-Control": "no-store"})


@router.post("/applications/{app_id}/audit")
async def audit_application(app_id: str):
    r = repo()
    r.app_dir(app_id)
    extraction = await asyncio.to_thread(audit.extraction_check, r.root, app_id)
    llm = await audit.llm_rubric(r, app_id)
    return {"extraction": extraction, "llm": llm}


# -- templates -----------------------------------------------------------------

@router.get("/templates")
def list_templates():
    return repo().list_templates()


# -- history -------------------------------------------------------------------

@router.get("/history")
def history(scope: str):
    return gitops.log(repo().root, scope)


@router.get("/history/{sha}/diff", response_class=PlainTextResponse)
def history_diff(sha: str):
    return gitops.diff(repo().root, sha)


@router.post("/history/{sha}/revert")
def history_revert(sha: str):
    gitops.revert(repo().root, sha)
    return {"ok": True}


# -- PDF import ----------------------------------------------------------------

@router.post("/import/resume")
async def import_resume(file: UploadFile = File(...)):
    cfg = config.load()
    root = Path(cfg["data_repo"]).expanduser()  # works pre-init during onboarding
    pdf_bytes = await file.read()
    return await importer.parse_resume_pdf(root if root.is_dir() else Path.home(), pdf_bytes)


@router.post("/import/resume/confirm")
def import_resume_confirm(parsed: dict):
    importer.apply_import(repo(), parsed)
    return {"ok": True}
