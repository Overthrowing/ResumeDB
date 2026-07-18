import asyncio
import subprocess
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, PlainTextResponse
from pydantic import BaseModel

from . import audit, config, datarepo, gitops, render
from .claude import ClaudeError, run_oneshot
from .codex import run_oneshot_codex

router = APIRouter(prefix="/api")


def repo() -> datarepo.DataRepo:
    cfg = config.load()
    r = datarepo.DataRepo(Path(cfg["data_repo"]))
    if not datarepo.is_datarepo(r.root):
        raise HTTPException(409, "data repo not initialized; POST /api/datarepo/init")
    return r


def _wrap(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except (datarepo.DataRepoError, gitops.GitError) as e:
        raise HTTPException(400, str(e))


# -- health / config ----------------------------------------------------------

@router.get("/health")
def health():
    cfg = config.load()
    provider = cfg.get("agent_provider", "claude")
    claude = config.claude_bin(cfg)
    claude_version = None
    if claude:
        proc = subprocess.run([claude, "--version"], capture_output=True, text=True, timeout=30)
        claude_version = proc.stdout.strip() or None
    codex = config.codex_bin(cfg)
    codex_version = None
    if codex:
        proc = subprocess.run([codex, "--version"], capture_output=True, text=True, timeout=30)
        codex_version = proc.stdout.strip() or None
    root = Path(cfg["data_repo"]).expanduser()
    ok = datarepo.is_datarepo(root)
    if ok:
        datarepo.sync_new_skills(root)  # ship newly added skills to existing repos
    return {
        "agent_provider": provider,
        "claude": claude,
        "claude_version": claude_version,
        "codex": codex,
        "codex_version": codex_version,
        "typst": config.typst_bin(),
        "data_repo": str(root),
        "data_repo_ok": ok,
    }


@router.get("/config")
def get_config():
    return config.load()


@router.put("/config")
def put_config(cfg: dict):
    merged = config.load()
    merged.update({k: v for k, v in cfg.items() if k != "models"})
    merged["models"].update(cfg.get("models", {}))
    config.save(merged)
    return merged


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
    _wrap(datarepo.init_datarepo, root)
    return {"ok": True, "path": str(root)}


# -- db entries ----------------------------------------------------------------

@router.get("/db/entries")
def list_entries():
    return repo().list_entries()


@router.get("/db/entries/{entry_id}")
def get_entry(entry_id: str):
    return _wrap(repo().get_entry, entry_id)


@router.put("/db/entries/{entry_id}")
def put_entry(entry_id: str, data: dict):
    _wrap(repo().save_entry, entry_id, data)
    return {"ok": True}


@router.delete("/db/entries/{entry_id}")
def delete_entry(entry_id: str):
    _wrap(repo().delete_entry, entry_id)
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


# -- proposals -------------------------------------------------------------------

@router.get("/proposals")
def list_proposals():
    return repo().list_proposals()


@router.post("/proposals/{name}/approve")
def approve_proposal(name: str):
    return {"ok": True, "target": _wrap(repo().approve_proposal, name)}


@router.post("/proposals/{name}/reject")
def reject_proposal(name: str):
    _wrap(repo().reject_proposal, name)
    return {"ok": True}


# -- applications -----------------------------------------------------------------

class NewApplication(BaseModel):
    company: str
    role: str
    jd_text: str = ""
    jd_url: str | None = None  # handled by the jd-from-link agent in M6
    template: str = "classic"


@router.get("/applications")
def list_applications():
    return repo().list_applications()


@router.post("/applications")
async def create_application(body: NewApplication):
    r = repo()
    fetch_url = body.jd_url if body.jd_url and not body.jd_text.strip() else None
    jd_text = f"(Fetching job description from {fetch_url} - refresh in a minute.)" if fetch_url else body.jd_text
    app_id = _wrap(r.create_application, body.company, body.role, jd_text, body.template)
    if fetch_url:
        asyncio.create_task(_fetch_jd(r, app_id, fetch_url))
    return {"ok": True, "id": app_id}


async def _fetch_jd(r: datarepo.DataRepo, app_id: str, url: str) -> None:
    cfg = config.load()
    provider = cfg.get("agent_provider", "claude")
    prompt = (
        f"Use the jd-from-link skill: fetch {url} and write "
        f"applications/{app_id}/jd.md in the structured format the skill describes."
    )
    try:
        if provider == "codex":
            codex_bin = config.codex_bin(cfg)
            await run_oneshot_codex(
                codex_bin,
                cwd=r.root,
                prompt=prompt,
                model=cfg["models"].get("jd"),
                effort=cfg["models"].get("jd_effort"),
            )
        else:
            claude_bin = config.claude_bin(cfg)
            if not claude_bin:
                return
            await run_oneshot(
                claude_bin,
                cwd=r.root,
                prompt=prompt,
                model=cfg["models"].get("jd"),
                effort=cfg["models"].get("jd_effort"),
            )
        gitops.checkpoint(r.root, f"app:{app_id}", "fetch jd from link")
    except Exception:
        pass  # placeholder jd.md stays; the user can paste the text instead


@router.get("/applications/{app_id}")
def get_application(app_id: str):
    return _wrap(repo().get_application, app_id)


@router.put("/applications/{app_id}/meta")
def put_app_meta(app_id: str, updates: dict):
    _wrap(repo().set_app_meta, app_id, **updates)
    return {"ok": True}


class FileBody(BaseModel):
    content: str


@router.put("/applications/{app_id}/files/{name}")
def put_app_file(app_id: str, name: str, body: FileBody):
    _wrap(repo().save_app_file, app_id, name, body.content)
    return {"ok": True}


@router.post("/applications/{app_id}/render")
def render_application(app_id: str):
    r = repo()
    _wrap(r.app_dir, app_id)
    return render.render(r.root, app_id)


@router.get("/applications/{app_id}/resume.pdf")
def get_pdf(app_id: str):
    pdf = _wrap(repo().app_dir, app_id) / "resume.pdf"
    if not pdf.exists():
        raise HTTPException(404, "not rendered yet")
    return FileResponse(pdf, media_type="application/pdf", headers={"Cache-Control": "no-store"})


@router.post("/applications/{app_id}/audit")
async def audit_application(app_id: str):
    r = repo()
    _wrap(r.app_dir, app_id)
    extraction = audit.extraction_check(r.root, app_id)
    llm = await audit.llm_rubric(r, app_id)
    return {"extraction": extraction, "llm": llm}


# -- templates ---------------------------------------------------------------------

@router.get("/templates")
def list_templates():
    return repo().list_templates()


# -- history -----------------------------------------------------------------------

@router.get("/history")
def history(scope: str):
    return gitops.log(repo().root, scope)


@router.get("/history/{sha}/diff", response_class=PlainTextResponse)
def history_diff(sha: str):
    return _wrap(gitops.diff, repo().root, sha)


@router.post("/history/{sha}/revert")
def history_revert(sha: str):
    _wrap(gitops.revert, repo().root, sha)
    return {"ok": True}


# -- agent ingestion & discovery ---------------------------------------------------

import datetime
import json
import uuid

class AgentIngestRequest(BaseModel):
    input: str

class AgentSearchRequest(BaseModel):
    query: str

JOB_LEAD_SCHEMA = {
    "type": "object",
    "required": ["company", "role"],
    "properties": {
        "company": {"type": "string"},
        "role": {"type": "string"},
        "location": {"type": "string"},
        "term": {"type": "string"},
        "department": {"type": "string"},
        "team": {"type": "string"},
        "deadline": {"type": "string"},
        "salary_amount": {"type": "integer"},
        "salary_currency": {"type": "string"},
        "salary_period": {"type": "string"},
        "priority": {"type": "integer", "minimum": 0, "maximum": 3},
        "what_they_look_for": {"type": "string"},
        "good_to_know": {"type": "string"},
        "job_description": {"type": "string"},
        "notes": {"type": "string"},
        "application_url": {"type": "string"},
        "source_url": {"type": "string"},
    }
}

INGEST_SCHEMA = {
    "type": "object",
    "required": ["job", "summary"],
    "properties": {
        "summary": {"type": "string"},
        "job": JOB_LEAD_SCHEMA
    }
}

SEARCH_SCHEMA = {
    "type": "object",
    "required": ["jobs", "summary"],
    "properties": {
        "summary": {"type": "string"},
        "jobs": {
            "type": "array",
            "items": JOB_LEAD_SCHEMA
        }
    }
}

@router.post("/agent/ingest")
async def agent_ingest(body: AgentIngestRequest):
    r = repo()
    cfg = config.load()
    provider = cfg.get("agent_provider", "claude")
    run_id = uuid.uuid4().hex
    
    run_data = {
        "id": run_id,
        "kind": "ingest",
        "query": body.input[:100],
        "status": "pending",
        "summary": "Extracting details...",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "error": None,
        "result": None
    }
    r.save_research_run(run_id, run_data)
    
    prompt = (
        f"Extract the details of a job posting and return them strictly structured according to the JSON schema.\n"
        f"Input: {body.input}\n\n"
        f"If the input is a URL (starts with http or https), fetch or browse that URL to retrieve the full job posting before extraction.\n"
        f"Ensure all fields are populated correctly:\n"
        f"- Use empty strings or null for unknown text fields.\n"
        f"- salary_amount should be an integer (not string or float) or null.\n"
        f"- Use deadline as YYYY-MM-DD or null.\n"
        f"- priority is 0 through 3.\n"
        f"Provide a brief 'summary' of the role."
    )
    
    try:
        if provider == "codex":
            codex_bin = config.codex_bin(cfg)
            res_text = await run_oneshot_codex(
                codex_bin,
                cwd=r.root,
                prompt=prompt,
                model=cfg["models"].get("jd"),
                effort=cfg["models"].get("jd_effort"),
                json_schema=INGEST_SCHEMA,
            )
        else:
            claude_bin = config.claude_bin(cfg)
            if not claude_bin:
                raise HTTPException(503, "Claude CLI path not configured")
            res_text = await run_oneshot(
                claude_bin,
                cwd=r.root,
                prompt=prompt,
                model=cfg["models"].get("jd"),
                effort=cfg["models"].get("jd_effort"),
                json_schema=INGEST_SCHEMA,
            )
            
        result = json.loads(res_text)
        run_data["status"] = "completed"
        run_data["summary"] = result.get("summary", "Extraction completed")
        run_data["result"] = result
        r.save_research_run(run_id, run_data)
        
        return {
            "run_id": run_id,
            "summary": result.get("summary", ""),
            "job": result.get("job", {})
        }
    except Exception as e:
        run_data["status"] = "failed"
        run_data["error"] = str(e)
        r.save_research_run(run_id, run_data)
        raise HTTPException(500, f"Ingestion failed: {e}")

@router.post("/agent/search")
async def agent_search(body: AgentSearchRequest):
    r = repo()
    cfg = config.load()
    provider = cfg.get("agent_provider", "claude")
    run_id = uuid.uuid4().hex
    profile = r.get_profile()
    
    run_data = {
        "id": run_id,
        "kind": "search",
        "query": body.query,
        "status": "pending",
        "summary": "Searching for roles...",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "error": None,
        "result": None
    }
    r.save_research_run(run_id, run_data)
    
    prompt = (
        f"Search the web and find relevant internship/job openings matching this query: {body.query}\n\n"
        f"Candidate profile details (use to match/rank fit, but do NOT leak candidate private contact info in search terms):\n"
        f"{json.dumps(profile)}\n\n"
        f"Use live web research/fetching to find up to 10 verified job listings. Return them as a structured list of jobs under 'jobs' plus a concise 'summary' of the coverage.\n"
        f"Each job in the list must strictly follow the schema."
    )
    
    try:
        if provider == "codex":
            codex_bin = config.codex_bin(cfg)
            res_text = await run_oneshot_codex(
                codex_bin,
                cwd=r.root,
                prompt=prompt,
                model=cfg["models"].get("jd"),
                effort=cfg["models"].get("jd_effort"),
                json_schema=SEARCH_SCHEMA,
            )
        else:
            claude_bin = config.claude_bin(cfg)
            if not claude_bin:
                raise HTTPException(503, "Claude CLI path not configured")
            res_text = await run_oneshot(
                claude_bin,
                cwd=r.root,
                prompt=prompt,
                model=cfg["models"].get("jd"),
                effort=cfg["models"].get("jd_effort"),
                json_schema=SEARCH_SCHEMA,
            )
            
        result = json.loads(res_text)
        run_data["status"] = "completed"
        run_data["summary"] = result.get("summary", "Search completed")
        run_data["result"] = result
        r.save_research_run(run_id, run_data)
        
        return {
            "run_id": run_id,
            "summary": result.get("summary", ""),
            "jobs": result.get("jobs", [])
        }
    except Exception as e:
        run_data["status"] = "failed"
        run_data["error"] = str(e)
        r.save_research_run(run_id, run_data)
        raise HTTPException(500, f"Search failed: {e}")

@router.get("/agent/runs")
def list_runs(limit: int = 10):
    return repo().list_research_runs(limit=limit)

from fastapi import File, UploadFile

@router.get("/agent/runs/{run_id}")
def get_run(run_id: str):
    return _wrap(repo().get_research_run, run_id)


@router.post("/import/resume")
async def import_resume(file: UploadFile = File(...)):
    from . import importer
    try:
        pdf_bytes = await file.read()
        return await importer.parse_resume_pdf(pdf_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import/resume/confirm")
def import_resume_confirm(parsed: dict):
    from . import importer
    importer.apply_import(repo(), parsed)
    return {"ok": True}

