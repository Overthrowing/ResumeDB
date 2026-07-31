"""Deterministic render: typst compile with the data YAML passed via sys.inputs."""

import subprocess
from pathlib import Path

from pypdf import PdfReader

from .config import typst_bin


def render(repo: Path, app_id: str) -> dict:
    """Compile applications/<id>/resume.typ -> resume.pdf. Returns render status
    (never raises: typst/pypdf failures come back as {ok: False, stderr})."""
    typst = typst_bin()
    if not typst:
        return {"ok": False, "pages": 0, "stderr": "typst not installed (brew install typst)"}
    app_dir = f"applications/{app_id}"
    try:
        proc = subprocess.run(
            [
                typst, "compile",
                "--root", str(repo),
                "--input", f"data=/{app_dir}/resume.yaml",
                f"{app_dir}/resume.typ",
                f"{app_dir}/resume.pdf",
            ],
            cwd=repo, capture_output=True, text=True, timeout=60,
        )
    except subprocess.TimeoutExpired:
        return {"ok": False, "pages": 0, "stderr": "typst timed out after 60s"}
    if proc.returncode != 0:
        return {"ok": False, "pages": 0, "stderr": proc.stderr}
    try:
        pages = len(PdfReader(repo / app_dir / "resume.pdf").pages)
    except Exception as e:
        return {"ok": False, "pages": 0, "stderr": f"rendered PDF unreadable: {e}"}
    return {"ok": True, "pages": pages, "overflow": pages > 1, "stderr": ""}


def validate_template(repo: Path, name: str) -> dict:
    """Compile a template against templates/sample.yaml to prove it honors the schema."""
    typst = typst_bin()
    if not typst:
        return {"ok": False, "stderr": "typst not installed"}
    try:
        proc = subprocess.run(
            [
                typst, "compile",
                "--root", str(repo),
                "--format", "pdf",
                "--input", "data=/templates/sample.yaml",
                f"templates/{name}.typ",
                "/dev/null",
            ],
            cwd=repo, capture_output=True, text=True, timeout=60,
        )
    except subprocess.TimeoutExpired:
        return {"ok": False, "stderr": "typst timed out after 60s"}
    return {"ok": proc.returncode == 0, "stderr": proc.stderr}
