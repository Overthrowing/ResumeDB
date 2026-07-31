"""HTTP API against a temp repo, plus the mock-agent tailor->render E2E."""

import shutil

import pytest
from fastapi.testclient import TestClient

from resumedb import config, turns
from resumedb.datarepo import DataRepo, init_datarepo
from resumedb.main import app

pytestmark = pytest.mark.skipif(shutil.which("git") is None, reason="git required")


@pytest.fixture
def client(tmp_path, monkeypatch):
    root = tmp_path / "data"
    init_datarepo(root)
    cfg_path = tmp_path / "cfg.json"
    monkeypatch.setattr(config, "CONFIG_PATH", cfg_path)
    config.save({"data_repo": str(root)})
    return TestClient(app)


def test_health_is_read_only(client, tmp_path):
    import subprocess

    root = tmp_path / "data"
    before = subprocess.run(
        ["git", "-C", str(root), "rev-parse", "HEAD"], capture_output=True, text=True
    ).stdout
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["data_repo_ok"] is True
    after = subprocess.run(
        ["git", "-C", str(root), "rev-parse", "HEAD"], capture_output=True, text=True
    ).stdout
    assert before == after  # no sync side-effect, no new commits


def test_error_envelope(client):
    r = client.get("/api/db/entries/does-not-exist")
    assert r.status_code == 400
    body = r.json()
    assert set(body) == {"error", "detail"}
    assert body["error"] == "datarepo_error"


def test_entry_crud(client):
    before = {e["id"] for e in client.get("/api/db/entries").json()}  # scaffold sample entry
    r = client.put("/api/db/entries/my-role", json={"type": "experience", "title": "Dev"})
    assert r.status_code == 200
    entries = {e["id"]: e for e in client.get("/api/db/entries").json()}
    assert entries["my-role"]["title"] == "Dev"
    assert client.put("/api/db/entries/bad", json={"type": "nope", "title": "x"}).status_code == 400
    assert client.delete("/api/db/entries/my-role").status_code == 200
    assert {e["id"] for e in client.get("/api/db/entries").json()} == before


def test_application_lifecycle_and_history(client):
    r = client.post(
        "/api/applications",
        json={"company": "Acme", "role": "Engineer", "jd_text": "Build things."},
    )
    assert r.status_code == 200
    app_id = r.json()["id"]
    detail = client.get(f"/api/applications/{app_id}").json()
    assert detail["meta"]["status"] == "not_started"
    assert detail["files"]["jd.md"] == "Build things."
    assert client.put(
        f"/api/applications/{app_id}/meta", json={"status": "in_progress"}
    ).status_code == 200
    assert client.put(
        f"/api/applications/{app_id}/meta", json={"status": "bogus"}
    ).status_code == 400
    hist = client.get("/api/history", params={"scope": f"app:{app_id}"}).json()
    assert any("create application" in h["subject"] for h in hist)
    # scoped history: db log does not contain the app commit
    db_hist = client.get("/api/history", params={"scope": "db"}).json()
    assert not any("create application" in h["subject"] for h in db_hist)


def test_chat_scope_validation(client):
    assert client.get("/api/chat/db/conversations").status_code == 200
    assert client.get("/api/chat/bogus-scope/conversations").status_code == 400
    assert client.get("/api/chat/app:UPPER/conversations").status_code == 400


@pytest.mark.skipif(shutil.which("typst") is None, reason="typst required")
def test_mock_agent_tailor_render_e2e(client, tmp_path):
    """The plan's one E2E: application -> (mock) tailor -> render -> 1-page PDF."""
    import asyncio

    from resumedb.fsio import load_yaml

    r = client.post(
        "/api/applications",
        json={"company": "Acme", "role": "Engineer", "jd_text": "Build things."},
    )
    app_id = r.json()["id"]
    repo = DataRepo(tmp_path / "data")

    resume_yaml = (
        "name: Test Person\n"
        "headline: Engineer\n"
        "contact:\n  email: t@example.com\n"
        "sections:\n"
        "- title: Experience\n"
        "  entries:\n"
        "  - title: Dev\n    org: Acme\n    dates: 2024\n"
        "    bullets:\n    - Built the thing end to end\n"
    )

    class TailorAgent:
        """Mock agent that writes resume.yaml like a real tailoring turn."""

        def start_turn(self, cwd, prompt, session_id=None, model=None, effort=None):
            class Proc:
                async def events(self):
                    (cwd / "applications" / app_id / "resume.yaml").write_text(resume_yaml)
                    yield {"type": "result", "text": "Tailored.", "is_error": False, "cost_usd": 0}

                async def cancel(self):
                    pass

            return Proc()

    async def run():
        m = turns.TurnManager()
        turn = m.start(
            repo, TailorAgent(), f"app:{app_id}", "20260101-000000", "tailor", "tailor", None, None
        )
        return [e async for e in turn.subscribe()]

    events = asyncio.run(run())
    # epilogue checkpointed the dirty scope and re-rendered
    rendered = next(e for e in events if e["type"] == "rendered")
    assert rendered["ok"] is True and rendered["pages"] == 1
    data = load_yaml(repo.root / "applications" / app_id / "resume.yaml")
    assert data["name"] and isinstance(data["sections"], list)  # schema shape
    pdf = client.get(f"/api/applications/{app_id}/resume.pdf")
    assert pdf.status_code == 200 and pdf.headers["content-type"] == "application/pdf"
    audit = client.post(f"/api/applications/{app_id}/audit")
    assert audit.status_code == 200
    assert audit.json()["extraction"]["ok"] is True  # every yaml token survives extraction
