"""ATS audit: (1) deterministic PDF-extraction diff proving machines can read
every word of the rendered resume; (2) LLM keyword-coverage rubric vs the JD."""

import json
import re
import unicodedata
from pathlib import Path

from pypdf import PdfReader

from . import config
from .datarepo import DataRepo
from .fsio import load_yaml
from .providers import get_agent, model_for

RUBRIC_SCHEMA = {
    "type": "object",
    "properties": {
        "score": {"type": "number"},
        "covered": {"type": "array", "items": {"type": "string"}},
        "missing": {"type": "array", "items": {"type": "string"}},
        # a list, not a paragraph: these are read while deciding what to fix
        "notes": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["score", "covered", "missing", "notes"],
}


# A link's href is not text: the PDF renders the label and hides the target, so
# checking it only ever reports words no reader was going to see.
URL_FIELD_RE = re.compile(r"(^|\.)url$")
# Same idea one level down: "https" never renders, and a host reads with or
# without its www. depending on the template. Neither is a word that got lost.
SCHEME_TOKENS = {"http", "https", "www"}


def _norm_tokens(s: str) -> list[str]:
    s = unicodedata.normalize("NFKC", s).lower()
    tokens = (t for t in re.split(r"[^a-z0-9@.+#]+", s) if t)
    return [t[4:] if t.startswith("www.") else t for t in tokens if t not in SCHEME_TOKENS]


def _walk_strings(node, path: str = "") -> list[tuple[str, str]]:
    out = []
    if isinstance(node, str):
        if node.strip():
            out.append((path, node))
    elif isinstance(node, dict):
        for k, v in node.items():
            out.extend(_walk_strings(v, f"{path}.{k}" if path else str(k)))
    elif isinstance(node, list):
        for i, v in enumerate(node):
            out.extend(_walk_strings(v, f"{path}[{i}]"))
    return out


def extraction_check(repo_root: Path, app_id: str) -> dict:
    """Prove a machine can read every word of the rendered PDF: every token in
    resume.yaml must appear in the text pypdf extracts back out."""
    app_dir = repo_root / "applications" / app_id
    pdf = app_dir / "resume.pdf"
    if not pdf.exists():
        return {"ok": False, "error": "not rendered yet", "missing": [], "checked": 0}
    try:
        extracted = " ".join(page.extract_text() or "" for page in PdfReader(pdf).pages)
    except Exception as e:
        return {"ok": False, "error": f"could not read resume.pdf: {e}", "missing": [], "checked": 0}
    haystack = set(_norm_tokens(extracted))
    data = load_yaml(app_dir / "resume.yaml") or {}
    missing = []
    fields = [f for f in _walk_strings(data) if not URL_FIELD_RE.search(f[0])]
    for path, text in fields:
        lost = [t for t in _norm_tokens(text) if t not in haystack]
        if lost:
            missing.append({"field": path, "text": text, "missing_tokens": lost})
    return {"ok": not missing, "missing": missing, "checked": len(fields), "error": None}


async def llm_rubric(repo: DataRepo, app_id: str) -> dict:
    cfg = config.load()
    prompt = (
        f"Follow the ats-audit skill for the application in applications/{app_id}/: "
        f"read its jd.md and resume.yaml and score keyword coverage. "
        f"Respond with only the JSON object the skill describes."
    )
    try:
        agent = get_agent(cfg)
        model, effort = model_for(cfg, "audit")
        text = await agent.oneshot(repo.root, prompt, model=model, effort=effort,
                                   json_schema=RUBRIC_SCHEMA)
        return json.loads(text)
    except Exception as e:
        return {"error": str(e)}
