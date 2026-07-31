"""PDF resume import: extract text with pypdf, structure it with the agent,
then write profile + entries through the normal datarepo layer."""

import asyncio
import io
import json
import re

from pypdf import PdfReader

from . import config
from .providers import get_agent, model_for

IMPORT_SCHEMA = {
    "type": "object",
    "properties": {
        "profile": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "email": {"type": "string"},
                "phone": {"type": "string"},
                "location": {"type": "string"},
                "links": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "label": {"type": "string"},
                            "url": {"type": "string"},
                        },
                        "required": ["label", "url"],
                    },
                },
            },
            "required": ["name", "email"],
        },
        "entries": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "type": {
                        "type": "string",
                        "enum": ["experience", "education", "project", "skill"],
                    },
                    "title": {"type": "string"},
                    "org": {"type": "string"},
                    "date": {"type": "string"},
                    "bullets": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["id", "type", "title"],
            },
        },
    },
    "required": ["profile", "entries"],
}


class ImportError_(Exception):
    pass


def extract_text(pdf_bytes: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception as e:
        raise ImportError_(f"Failed to read PDF: {e}")
    if not text.strip():
        raise ImportError_(
            "The PDF has no extractable text (it may be a scan). "
            "Export a text-based PDF and try again."
        )
    return text


async def parse_resume_pdf(repo_root, pdf_bytes: bytes) -> dict:
    text = await asyncio.to_thread(extract_text, pdf_bytes)  # pypdf off the event loop
    prompt = (
        "You are an expert resume parser. Extract the candidate's profile and "
        "entries from the raw resume text below. Convert every work experience, "
        "education item, project, and skill group into a structured entry. Give "
        "each entry a short lowercase dash-slug id like 'exp-google-swe' or "
        "'edu-bs-cs'. Format the response EXACTLY to the JSON schema.\n\n"
        f"Resume text:\n{text}"
    )
    cfg = config.load()
    agent = get_agent(cfg)
    model, effort = model_for(cfg, "chat")
    result = await agent.oneshot(repo_root, prompt, model=model, effort=effort,
                                 json_schema=IMPORT_SCHEMA)
    return json.loads(result)


def _slug(raw: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", str(raw).lower()).strip("-") or "entry"


def apply_import(r, parsed: dict) -> None:
    if not isinstance(parsed, dict):
        raise ImportError_("expected a parsed-resume object")
    profile = parsed.get("profile", {})
    entries = parsed.get("entries", [])
    if not isinstance(profile, dict):
        raise ImportError_("`profile` must be an object")
    if not isinstance(entries, list) or any(not isinstance(e, dict) for e in entries):
        raise ImportError_("`entries` must be a list of objects")
    r.save_profile(profile)
    for entry in entries:
        r.save_entry(_slug(entry.get("id", "")), {
            "type": entry.get("type"),
            "title": entry.get("title"),
            "org": entry.get("org", ""),
            "date": entry.get("date", ""),
            "bullets": entry.get("bullets", []),
        })
