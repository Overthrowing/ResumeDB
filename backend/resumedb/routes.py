import asyncio
import datetime
import subprocess
import sys
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, PlainTextResponse
from pydantic import BaseModel

from . import audit, config, datarepo, gitops, pipeline, render
from .agent import public_agent_error

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
    app_id = _wrap(
        r.create_application,
        body.company,
        body.role,
        jd_text,
        body.template,
        source=body.jd_url,
    )
    if fetch_url:
        asyncio.create_task(_fetch_jd(r, app_id, fetch_url))
    return {"ok": True, "id": app_id}


async def _fetch_jd(r: datarepo.DataRepo, app_id: str, url: str) -> None:
    try:
        result = await pipeline.run_job_command(r, f"Add this job posting: {url}", mode="add_job")
        if result["jobs"]:
            lead = result["jobs"][0]
            r.save_app_file(app_id, "jd.md", pipeline.job_description(lead))
            r.set_app_meta(app_id, source=lead.get("application_url") or lead.get("source_url") or url)
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


@router.get("/applications/{app_id}/readiness")
def application_readiness(app_id: str):
    return _wrap(repo().readiness_report, app_id)


@router.post("/applications/{app_id}/prepare")
async def prepare_application(app_id: str):
    try:
        return await pipeline.prepare_application(repo(), app_id)
    except (datarepo.DataRepoError, pipeline.DataRepoError) as exc:
        raise HTTPException(400, str(exc))
    except Exception as exc:
        raise HTTPException(500, f"Preparation failed: {public_agent_error(exc)}")


@router.post("/applications/{app_id}/approve")
def approve_application(app_id: str):
    return _wrap(repo().approve_application, app_id)


@router.post("/applications/{app_id}/submitted")
def submit_application(app_id: str):
    _wrap(repo().mark_submitted, app_id)
    return {"ok": True, "application": repo().get_application(app_id)}


@router.get("/applications/{app_id}/autofill-package")
def get_autofill_package(app_id: str):
    return _wrap(pipeline.autofill_package, repo(), app_id)


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

class AgentIngestRequest(BaseModel):
    input: str

class AgentSearchRequest(BaseModel):
    query: str


class AgentCommandRequest(BaseModel):
    command: str
    auto_prepare: bool = True


class SearchSubscriptionRequest(BaseModel):
    query: str
    enabled: bool = True

@router.post("/agent/ingest")
async def agent_ingest(body: AgentIngestRequest):
    r = repo()
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
    
    try:
        result = await pipeline.run_job_command(r, body.input, mode="add_job")
        job = result.get("jobs", [None])[0] if result.get("jobs") else None
        run_data["status"] = "completed"
        run_data["summary"] = result.get("summary", "Extraction completed")
        run_data["result"] = {**result, "job": job}
        r.save_research_run(run_id, run_data)
        
        return {
            "run_id": run_id,
            "summary": result.get("summary", ""),
            "job": job or {},
        }
    except Exception as e:
        run_data["status"] = "failed"
        run_data["error"] = public_agent_error(e)
        r.save_research_run(run_id, run_data)
        raise HTTPException(500, f"Ingestion failed: {public_agent_error(e)}")

@router.post("/agent/search")
async def agent_search(body: AgentSearchRequest):
    r = repo()
    run_id = uuid.uuid4().hex
    
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
    
    try:
        result = await pipeline.run_job_command(r, body.query, mode="discover")
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
        run_data["error"] = public_agent_error(e)
        r.save_research_run(run_id, run_data)
        raise HTTPException(500, f"Search failed: {public_agent_error(e)}")


async def _prepare_tracked_leads(r: datarepo.DataRepo, jobs: list[dict]) -> None:
    """Prepare high-confidence leads serially to keep git checkpoints safe."""
    for lead in jobs[:3]:
        try:
            app_id = lead.get("application_id") or pipeline.track_lead(r, lead["id"])
            r.set_job_lead_status(lead["id"], "preparing", application_id=app_id)
            await pipeline.prepare_application(r, app_id)
            r.set_job_lead_status(lead["id"], "tracked", application_id=app_id)
        except Exception as exc:
            try:
                r.set_job_lead_status(
                    lead["id"],
                    "inbox",
                    preparation_error=public_agent_error(exc),
                )
            except Exception:
                pass


@router.post("/agent/command")
async def agent_command(body: AgentCommandRequest):
    r = repo()
    try:
        result = await pipeline.run_job_command(r, body.command)
        high = [
            job for job in result["jobs"]
            if job.get("fit_score", 0) >= 80 and not job.get("hard_conflicts")
        ]
        if body.auto_prepare and high:
            for lead in high[:3]:
                app_id = pipeline.track_lead(r, lead["id"])
                lead.update(r.set_job_lead_status(lead["id"], "preparing", application_id=app_id))
            asyncio.create_task(_prepare_tracked_leads(r, high))
        return result
    except datarepo.DataRepoError as exc:
        raise HTTPException(400, str(exc))
    except Exception as exc:
        raise HTTPException(500, f"Agent request failed: {public_agent_error(exc)}")


@router.get("/agent/jobs")
def list_job_leads(status: str | None = None):
    return repo().list_job_leads(status=status)


@router.post("/agent/jobs/{lead_id}/track")
def track_job_lead(lead_id: str):
    app_id = _wrap(pipeline.track_lead, repo(), lead_id)
    return {"ok": True, "application_id": app_id}


@router.post("/agent/jobs/{lead_id}/prepare")
async def prepare_job_lead(lead_id: str):
    r = repo()
    try:
        app_id = pipeline.track_lead(r, lead_id)
        r.set_job_lead_status(lead_id, "preparing", application_id=app_id)
        result = await pipeline.prepare_application(r, app_id)
        r.set_job_lead_status(lead_id, "tracked", application_id=app_id)
        return {"ok": True, "application_id": app_id, **result}
    except datarepo.DataRepoError as exc:
        raise HTTPException(400, str(exc))
    except Exception as exc:
        raise HTTPException(500, f"Preparation failed: {public_agent_error(exc)}")


@router.post("/agent/jobs/{lead_id}/dismiss")
def dismiss_job_lead(lead_id: str):
    return _wrap(repo().set_job_lead_status, lead_id, "dismissed")


@router.get("/agent/subscriptions")
def list_search_subscriptions():
    return repo().list_search_subscriptions()


@router.post("/agent/subscriptions")
def save_search_subscription(body: SearchSubscriptionRequest):
    return _wrap(repo().save_search_subscription, body.query, body.enabled)


@router.post("/agent/subscriptions/{sub_id}/run")
async def run_search_subscription(sub_id: str):
    r = repo()
    sub = next((item for item in r.list_search_subscriptions() if item.get("id") == sub_id), None)
    if not sub:
        raise HTTPException(404, f"no search goal {sub_id}")
    try:
        result = await pipeline.run_job_command(r, sub["query"], mode="discover")
        r.mark_subscription_run(sub_id)
        return result
    except Exception as exc:
        message = public_agent_error(exc)
        r.mark_subscription_error(sub_id, message)
        raise HTTPException(500, f"Scheduled discovery failed: {message}")

@router.get("/agent/runs")
def list_runs(limit: int = 10):
    return repo().list_research_runs(limit=limit)

@router.get("/agent/runs/{run_id}")
def get_run(run_id: str):
    return _wrap(repo().get_research_run, run_id)


@router.post("/applications/{app_id}/review")
async def audit_review(app_id: str):
    from . import review
    return await review.run_review(repo(), app_id)


@router.post("/applications/{app_id}/interview/generate")
async def generate_interview(app_id: str):
    from . import interview
    return await interview.generate_questions(repo(), app_id)


@router.get("/applications/{app_id}/interview/questions")
def get_interview(app_id: str):
    from . import interview
    return interview.load_questions(repo(), app_id)


@router.post("/import/resume")
async def import_resume(file: UploadFile = File(...)):
    from . import importer
    try:
        pdf_bytes = await file.read()
        return await importer.parse_resume_pdf(pdf_bytes, repo())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import/resume/confirm")
def import_resume_confirm(parsed: dict):
    from . import importer
    importer.apply_import(repo(), parsed)
    return {"ok": True}
