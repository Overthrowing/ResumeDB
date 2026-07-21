"""Bring-your-own-agent MCP server.

All reasoning happens in the caller's model. These tools only read validated
ResumeDB state or perform bounded writes through the existing data layer.
"""

from __future__ import annotations

import datetime
import re
import uuid
from pathlib import Path
from typing import Annotated, Any, Literal

from mcp.server.fastmcp import FastMCP
from mcp.types import ToolAnnotations
from pydantic import AnyHttpUrl, BaseModel, Field
from ruamel.yaml import YAML
from starlette.datastructures import Headers
from starlette.responses import JSONResponse

from . import agent_connections, config, datarepo, render


READ_ONLY = ToolAnnotations(
    readOnlyHint=True,
    destructiveHint=False,
    idempotentHint=True,
    openWorldHint=False,
)
BOUNDED_WRITE = ToolAnnotations(
    readOnlyHint=False,
    destructiveHint=False,
    idempotentHint=False,
    openWorldHint=False,
)

INSTRUCTIONS = (
    "Before career work, call get_candidate_context. Never infer identity, demographics, age, "
    "graduation, authorization, dates, credentials, skills, or metrics; report missing facts. "
    "For multi-step work, call begin_agent_run first and finish_agent_run last so ResumeDB can "
    "show progress. Agents may create and tailor drafts, but only the human may move draft to "
    "ready or ready to submitted. Use only evidence returned by ResumeDB."
)

mcp_server = FastMCP(
    name="ResumeDB",
    instructions=INSTRUCTIONS,
    website_url="https://resumedb-ai.vercel.app",
    stateless_http=True,
    json_response=True,
    streamable_http_path="/",
    host="0.0.0.0",
)


def _repo() -> datarepo.DataRepo:
    cfg = config.load()
    repo = datarepo.DataRepo(Path(cfg["data_repo"]))
    if not datarepo.is_datarepo(repo.root):
        raise ValueError("ResumeDB data repository is not initialized")
    return repo


def _iso_now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _run_event(run: dict, event_id: str, label: str, detail: str, status: str) -> None:
    now = _iso_now()
    events = run.setdefault("events", [])
    existing = next((event for event in events if event.get("id") == event_id), None)
    update = {
        "id": event_id,
        "label": label.strip()[:160],
        "detail": detail.strip()[:1000],
        "status": status,
        "updated_at": now,
    }
    if existing:
        existing.update(update)
    else:
        events.append({**update, "created_at": now})
    run["updated_at"] = now


class BearerAuthApp:
    """Small ASGI guard for static bearer tokens used by local MCP clients."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            authorization = Headers(scope=scope).get("authorization", "")
            scheme, _, token = authorization.partition(" ")
            if scheme.lower() != "bearer" or not agent_connections.verify(token.strip()):
                response = JSONResponse(
                    {"error": "A valid ResumeDB agent connection token is required."},
                    status_code=401,
                    headers={"WWW-Authenticate": 'Bearer realm="ResumeDB MCP"'},
                )
                await response(scope, receive, send)
                return
        await self.app(scope, receive, send)


mcp_app = BearerAuthApp(mcp_server.streamable_http_app())


class JobLeadInput(BaseModel):
    company: str = Field(min_length=1, max_length=160)
    role: str = Field(min_length=1, max_length=200)
    location: str | None = Field(default=None, max_length=200)
    term: str | None = Field(default=None, max_length=120)
    deadline: str | None = Field(default=None, max_length=80)
    salary_amount: float | None = None
    salary_currency: str | None = Field(default=None, max_length=12)
    salary_period: str | None = Field(default=None, max_length=40)
    what_they_look_for: str | None = Field(default=None, max_length=4000)
    good_to_know: str | None = Field(default=None, max_length=4000)
    job_description: str | None = Field(default=None, max_length=100_000)
    application_url: AnyHttpUrl | None = None
    source_url: AnyHttpUrl | None = None
    fit_score: int | None = Field(default=None, ge=0, le=100)
    fit_summary: str | None = Field(default=None, max_length=4000)
    evidence: list[str] = Field(default_factory=list, max_length=50)
    missing_facts: list[str] = Field(default_factory=list, max_length=50)
    hard_conflicts: list[str] = Field(default_factory=list, max_length=50)


class LinkInput(BaseModel):
    label: str = Field(min_length=1, max_length=100)
    url: AnyHttpUrl


class KnowledgeEntryInput(BaseModel):
    type: Literal["experience", "project", "skill", "course", "education", "achievement", "extra"]
    title: str = Field(min_length=1, max_length=200)
    org: str | None = Field(default=None, max_length=200)
    location: str | None = Field(default=None, max_length=200)
    start: str | None = Field(default=None, max_length=40)
    end: str | None = Field(default=None, max_length=40)
    tags: list[str] = Field(default_factory=list, max_length=50)
    links: list[LinkInput] = Field(default_factory=list, max_length=20)
    bullets: list[str] = Field(default_factory=list, max_length=50)
    items: list[str] = Field(default_factory=list, max_length=100)
    notes: str | None = Field(default=None, max_length=10_000)


@mcp_server.tool(
    title="Get complete candidate context",
    description=(
        "Read the user-approved profile, demographic answer bank, evidence, memory, missing facts, "
        "job leads, and application summaries before doing career work."
    ),
    annotations=READ_ONLY,
)
def get_candidate_context() -> dict[str, Any]:
    repo = _repo()
    return {
        "knowledge": repo.knowledge_context(),
        "missing_facts": repo.profile_gaps(),
        "job_leads": repo.list_job_leads(),
        "applications": repo.list_applications(),
        "rules": {
            "never_infer_facts": True,
            "human_review_transition": "draft -> ready",
            "human_submit_transition": "ready -> submitted",
        },
    }


@mcp_server.tool(
    title="List applications",
    description="List tracked applications, optionally filtered to one of ResumeDB's five stages.",
    annotations=READ_ONLY,
)
def list_applications(
    status: Literal["not_started", "in_progress", "draft", "ready", "submitted"] | None = None,
) -> list[dict[str, Any]]:
    applications = _repo().list_applications()
    return [app for app in applications if status is None or app.get("status") == status]


@mcp_server.tool(
    title="Get an application",
    description="Read a tracked application's metadata and every current tailoring artifact.",
    annotations=READ_ONLY,
)
def get_application(application_id: str) -> dict[str, Any]:
    return _repo().get_application(application_id)


@mcp_server.tool(
    title="Get application readiness",
    description="Check factual gaps, artifacts, and blockers without changing the application stage.",
    annotations=READ_ONLY,
)
def get_application_readiness(application_id: str) -> dict[str, Any]:
    return _repo().readiness_report(application_id)


@mcp_server.tool(
    title="Save a discovered job",
    description=(
        "Save or update a job lead after the connected agent has extracted the posting and compared "
        "it with supported candidate evidence."
    ),
    annotations=BOUNDED_WRITE,
)
def save_job_lead(lead: JobLeadInput) -> dict[str, Any]:
    return _repo().save_job_lead(lead.model_dump(mode="json", exclude_none=True))


@mcp_server.tool(
    title="Create an application workspace",
    description=(
        "Create an in-progress application from an already extracted job description. This cannot "
        "approve or submit the application."
    ),
    annotations=BOUNDED_WRITE,
)
def create_application_draft(
    company: Annotated[str, Field(min_length=1, max_length=160)],
    role: Annotated[str, Field(min_length=1, max_length=200)],
    job_description: Annotated[str, Field(min_length=1, max_length=100_000)],
    source_url: AnyHttpUrl | None = None,
    fit_score: Annotated[int | None, Field(ge=0, le=100)] = None,
    fit_summary: str | None = None,
    template: str = "classic",
) -> dict[str, Any]:
    repo = _repo()
    app_id = repo.create_application(
        company=company.strip(),
        role=role.strip(),
        jd_text=job_description,
        template=template,
        source=str(source_url) if source_url else None,
        fit_score=fit_score,
        fit_summary=fit_summary,
    )
    repo.set_app_meta(app_id, status="in_progress")
    return repo.get_application(app_id)


EDITABLE_ARTIFACTS = Literal[
    "jd.md",
    "notes.md",
    "resume.yaml",
    "cover-letter.md",
    "decisions.md",
    "answers.yaml",
    "tailoring.yaml",
]


@mcp_server.tool(
    title="Save an application artifact",
    description=(
        "Save one bounded tailoring artifact. YAML artifacts must be valid mappings. This cannot "
        "change an application's review or submission stage."
    ),
    annotations=BOUNDED_WRITE,
)
def save_application_artifact(
    application_id: str,
    file_name: EDITABLE_ARTIFACTS,
    content: Annotated[str, Field(max_length=200_000)],
) -> dict[str, Any]:
    if file_name.endswith(".yaml"):
        parsed = YAML(typ="safe").load(content)
        if not isinstance(parsed, dict):
            raise ValueError(f"{file_name} must contain a YAML mapping")
    repo = _repo()
    current = repo.get_application(application_id)["meta"]["status"]
    if current in {"ready", "submitted"}:
        raise ValueError("Connected agents cannot modify a ready or submitted application")
    repo.save_app_file(application_id, file_name, content)
    return {"ok": True, "application_id": application_id, "file_name": file_name}


@mcp_server.tool(
    title="Update an application draft",
    description=(
        "Update fit metadata or move an application only among not_started, in_progress, and draft. "
        "Human review and submission stages are intentionally unavailable."
    ),
    annotations=BOUNDED_WRITE,
)
def update_application_draft(
    application_id: str,
    status: Literal["not_started", "in_progress", "draft"] | None = None,
    deadline: str | None = None,
    fit_score: Annotated[int | None, Field(ge=0, le=100)] = None,
    fit_summary: str | None = None,
) -> dict[str, Any]:
    updates = {
        key: value
        for key, value in {
            "status": status,
            "deadline": deadline,
            "fit_score": fit_score,
            "fit_summary": fit_summary,
        }.items()
        if value is not None
    }
    if not updates:
        raise ValueError("Provide at least one draft update")
    repo = _repo()
    current = repo.get_application(application_id)["meta"]["status"]
    if current in {"ready", "submitted"}:
        raise ValueError("Connected agents cannot modify a ready or submitted application")
    repo.set_app_meta(application_id, **updates)
    return repo.get_application(application_id)


@mcp_server.tool(
    title="Render a tailored resume",
    description="Compile the existing tailored resume YAML into its PDF and return the page count.",
    annotations=BOUNDED_WRITE,
)
def render_application_resume(application_id: str) -> dict[str, Any]:
    repo = _repo()
    repo.app_dir(application_id)
    return render.render(repo.root, application_id)


@mcp_server.tool(
    title="Propose candidate knowledge",
    description=(
        "Create a reviewable knowledge proposal from user-provided evidence. It does not modify the "
        "canonical profile until the human approves it in ResumeDB."
    ),
    annotations=BOUNDED_WRITE,
)
def propose_knowledge_entry(entry_id: str, entry: KnowledgeEntryInput) -> dict[str, Any]:
    return _repo().save_entry_proposal(
        entry_id,
        entry.model_dump(mode="json", exclude_none=True),
    )


@mcp_server.tool(
    title="Begin an agent run",
    description="Start a live ResumeDB timeline for a multi-step connected-agent request.",
    annotations=BOUNDED_WRITE,
)
def begin_agent_run(query: str) -> dict[str, Any]:
    repo = _repo()
    now = _iso_now()
    run = {
        "id": uuid.uuid4().hex,
        "kind": "external_agent",
        "query": query.strip()[:240],
        "status": "running",
        "summary": "Connected agent is working...",
        "created_at": now,
        "updated_at": now,
        "error": None,
        "result": None,
        "events": [],
    }
    _run_event(run, "connected", "Connected agent started", query, "active")
    repo.save_research_run(run["id"], run, checkpoint=True)
    return run


@mcp_server.tool(
    title="Record agent progress",
    description="Add or update a visible event in a connected agent's live ResumeDB timeline.",
    annotations=BOUNDED_WRITE,
)
def record_agent_progress(
    run_id: str,
    event_id: str,
    label: str,
    detail: str,
    status: Literal["pending", "active", "completed", "failed"] = "completed",
) -> dict[str, Any]:
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", event_id):
        raise ValueError("event_id must use letters, numbers, dots, underscores, or hyphens")
    repo = _repo()
    run = repo.get_research_run(run_id)
    _run_event(run, event_id, label, detail, status)
    repo.save_research_run(run_id, run, checkpoint=False)
    return run


@mcp_server.tool(
    title="Finish an agent run",
    description="Complete or fail a connected-agent timeline with a concise user-facing summary.",
    annotations=BOUNDED_WRITE,
)
def finish_agent_run(
    run_id: str,
    summary: str,
    status: Literal["completed", "failed"] = "completed",
) -> dict[str, Any]:
    repo = _repo()
    run = repo.get_research_run(run_id)
    _run_event(
        run,
        "connected",
        "Connected agent finished" if status == "completed" else "Connected agent needs attention",
        summary,
        status,
    )
    run.update({
        "status": status,
        "summary": summary.strip()[:1000],
        "completed_at": _iso_now(),
        "error": summary.strip()[:1000] if status == "failed" else None,
    })
    repo.save_research_run(run_id, run, checkpoint=True)
    return run


async def tool_manifest() -> list[dict[str, str]]:
    """Small stable manifest for the web UI and health checks."""
    return [
        {"name": tool.name, "description": tool.description or ""}
        for tool in await mcp_server.list_tools()
    ]
