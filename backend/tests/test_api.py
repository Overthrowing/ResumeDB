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


def test_status_transitions_build_history(client, tmp_path):
    r = client.post("/api/applications", json={"company": "Acme", "role": "Engineer"})
    app_id = r.json()["id"]
    for status in ("in_progress", "applied", "screen", "interview", "offer", "accepted"):
        assert client.put(f"/api/applications/{app_id}/meta", json={"status": status}).status_code == 200
    meta = client.get(f"/api/applications/{app_id}").json()["meta"]
    assert meta["status"] == "accepted"
    assert [h["status"] for h in meta["history"]] == [
        "not_started", "in_progress", "applied", "screen", "interview", "offer", "accepted",
    ]
    assert all(h["date"] for h in meta["history"])
    # re-setting the same status does not add a duplicate entry
    client.put(f"/api/applications/{app_id}/meta", json={"status": "accepted"})
    meta2 = client.get(f"/api/applications/{app_id}").json()["meta"]
    assert len(meta2["history"]) == len(meta["history"])


def test_terminal_status_from_any_stage(client):
    r = client.post("/api/applications", json={"company": "B", "role": "R"})
    app_id = r.json()["id"]
    client.put(f"/api/applications/{app_id}/meta", json={"status": "applied"})
    client.put(f"/api/applications/{app_id}/meta", json={"status": "ghosted", "outcome_note": "never replied"})
    meta = client.get(f"/api/applications/{app_id}").json()["meta"]
    assert meta["status"] == "ghosted"
    assert meta["outcome_note"] == "never replied"
    assert [h["status"] for h in meta["history"]] == ["not_started", "applied", "ghosted"]
    assert client.put(f"/api/applications/{app_id}/meta", json={"status": "nope"}).status_code == 400


def test_legacy_status_and_missing_history_migrate_on_read(client, tmp_path):
    """Pre-refactor repos used `draft` and had no history at all."""
    from resumedb.fsio import dump_yaml

    app_dir = tmp_path / "data" / "applications" / "2026-01-legacy"
    app_dir.mkdir(parents=True)
    dump_yaml(
        {"company": "Old", "role": "Dev", "template": "classic",
         "created": "2026-01-05", "status": "draft"},
        app_dir / "meta.yaml",
    )
    listed = {a["id"]: a for a in client.get("/api/applications").json()}
    assert listed["2026-01-legacy"]["status"] == "not_started"
    assert listed["2026-01-legacy"]["history"] == [{"status": "not_started", "date": "2026-01-05"}]
    # advancing a legacy application keeps the synthesized origin point
    client.put("/api/applications/2026-01-legacy/meta", json={"status": "applied"})
    meta = client.get("/api/applications/2026-01-legacy").json()["meta"]
    assert [h["status"] for h in meta["history"]] == ["not_started", "applied"]


def test_history_sha_rejects_git_argument_injection(client, tmp_path):
    """A sha reaches git as an argument: `--output=X` would make `git show`
    overwrite a repo file."""
    root = tmp_path / "data"
    target = root / "CLAUDE.md"
    before = target.read_text()
    for evil in ("--output=CLAUDE.md", "-h", "HEAD~5..HEAD", "--help", "not-hex"):
        r = client.get(f"/api/history/{evil}/diff")
        assert r.status_code >= 400, evil
    assert target.read_text() == before
    assert client.post("/api/history/--output=CLAUDE.md/revert").status_code >= 400
    assert target.read_text() == before


def test_template_cannot_escape_the_repo(client, tmp_path):
    """`template` becomes a path component; traversal would read any .typ file
    on the machine into the application (and back out through the API)."""
    secret = tmp_path / "outside.typ"
    secret.write_text("SECRET")
    rel = "../" * 12 + str(secret.with_suffix("")).lstrip("/")
    r = client.post(
        "/api/applications", json={"company": "X", "role": "Y", "template": rel}
    )
    assert r.status_code == 400
    assert client.get("/api/applications").json() == []


def test_one_bad_file_does_not_break_a_list(client, tmp_path):
    root = tmp_path / "data"
    (root / "db" / "broken.yaml").write_text("title: [unclosed\n\tbad\n")
    entries = {e["id"]: e for e in client.get("/api/db/entries").json()}
    assert entries["broken"]["error"]  # surfaced as data...
    assert any(not e["error"] for e in entries.values())  # ...and the rest still load

    app_dir = root / "applications" / "2026-01-broken"
    app_dir.mkdir(parents=True)
    (app_dir / "meta.yaml").write_text("company: [unclosed\n\tbad\n")
    apps = client.get("/api/applications").json()
    assert any(a["id"] == "2026-01-broken" and a["error"] for a in apps)

    chats = root / "db" / "chats"
    chats.mkdir(parents=True, exist_ok=True)
    (chats / "20260101-000000.jsonl").write_text('not json\n{"role":"user","text":"ok"}\n{"text":5}\n')
    convs = client.get("/api/chat/db/conversations").json()
    assert convs[0]["count"] == 2  # corrupt line skipped, non-string text coerced


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
