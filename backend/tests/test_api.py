"""HTTP API against a temp repo, plus the mock-agent tailor->render E2E.

The `client` fixture (backend/conftest.py) points the app at a scaffolded temp
data repo and a temp config file; `repo` is that same repo.
"""

import shutil

import pytest

from resumedb import turns


def test_health_does_not_mutate_the_repo(client, repo):
    """/health used to sync boilerplate and shell out to `claude --version`, so
    polling it wrote commits and blocked the UI."""
    import subprocess

    def head():
        return subprocess.run(
            ["git", "-C", str(repo.root), "rev-parse", "HEAD"], capture_output=True, text=True
        ).stdout

    before = head()
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["data_repo_ok"] is True
    assert head() == before  # no sync side-effect, no new commits


def test_every_error_uses_the_same_envelope(client):
    """Including FastAPI's own request-validation errors, whose default body is
    a nested list the UI cannot render."""
    bad_requests = [
        client.get("/api/db/entries/does-not-exist"),  # DataRepoError
        client.post("/api/applications", json={"company": "only-company"}),  # missing field
        client.get("/api/history/zzzz/diff"),  # bad sha -> GitInputError
        client.post("/api/import/resume/confirm", json={"entries": "nope"}),  # ImportError_
    ]
    for r in bad_requests:
        assert r.status_code == 400, r.text
        assert set(r.json()) == {"error", "detail"}, r.text
        assert isinstance(r.json()["detail"], str)
    assert bad_requests[0].json()["error"] == "datarepo_error"
    ok = client.get("/api/history", params={"scope": "db"})  # the success path is untouched
    assert ok.status_code == 200 and isinstance(ok.json(), list)


def test_env_probe_reports_versions_and_auth_state(client, monkeypatch):
    """Onboarding gates the whole app on this shape; a renamed key silently
    tells the user a working install is missing."""
    from resumedb import config, routes

    client.put("/api/config", json={"claude_bin": "/fake/claude", "codex_bin": "/fake/codex"})
    monkeypatch.setattr(config, "typst_bin", lambda: "/fake/typst")

    async def fake_probe(argv, timeout=15):
        if argv[1:] == ["auth", "status"]:
            return True, '{"loggedIn": true}'
        return True, {"/fake/claude": "2.1.197", "/fake/codex": "0.9.0",
                      "/fake/typst": "typst 0.13.0"}[argv[0]]

    monkeypatch.setattr(routes, "_probe", fake_probe)
    body = client.get("/api/env").json()
    assert set(body) == {"claude", "codex", "typst", "data_repo", "data_repo_ok"}
    assert body["claude"] == {"installed": True, "version": "2.1.197", "authed": True}
    # codex auth is deliberately not probed (experimental provider)
    assert body["codex"] == {"installed": True, "version": "0.9.0", "authed": None}
    assert body["typst"] == {"installed": True, "version": "typst 0.13.0"}
    assert body["data_repo_ok"] is True


def test_env_probe_reports_missing_tools_without_failing(client, monkeypatch):
    from resumedb import config

    for name in ("claude_bin", "codex_bin"):
        monkeypatch.setattr(config, name, lambda cfg: None)
    monkeypatch.setattr(config, "typst_bin", lambda: None)
    body = client.get("/api/env").json()
    assert body["claude"] == {"installed": False, "version": None, "authed": False}
    assert body["codex"]["installed"] is False
    assert body["typst"] == {"installed": False, "version": None}


def test_entry_crud_round_trips_through_the_api(client):
    before = {e["id"] for e in client.get("/api/db/entries").json()}  # scaffold sample entry
    r = client.put("/api/db/entries/my-role", json={"type": "experience", "title": "Dev"})
    assert r.status_code == 200
    entries = {e["id"]: e for e in client.get("/api/db/entries").json()}
    assert entries["my-role"]["title"] == "Dev"
    assert client.put("/api/db/entries/bad", json={"type": "nope", "title": "x"}).status_code == 400
    assert client.delete("/api/db/entries/my-role").status_code == 200
    assert {e["id"] for e in client.get("/api/db/entries").json()} == before


def test_application_create_and_scoped_history(client):
    r = client.post(
        "/api/applications",
        json={"company": "Acme", "role": "Engineer", "jd_text": "Build things."},
    )
    assert r.status_code == 200
    app_id = r.json()["id"]
    detail = client.get(f"/api/applications/{app_id}").json()
    assert detail["meta"]["status"] == "not_started"
    assert detail["files"]["jd.md"] == "Build things."
    hist = client.get("/api/history", params={"scope": f"app:{app_id}"}).json()
    assert any("create application" in h["subject"] for h in hist)
    # scoped history: the db log must not contain the app commit, or undo in one
    # place would revert the other
    db_hist = client.get("/api/history", params={"scope": "db"}).json()
    assert not any("create application" in h["subject"] for h in db_hist)


def test_status_transitions_append_history(client):
    r = client.post("/api/applications", json={"company": "Acme", "role": "Engineer"})
    app_id = r.json()["id"]
    for status in ("in_progress", "applied", "screen", "interview", "offer", "accepted"):
        assert client.put(
            f"/api/applications/{app_id}/meta", json={"status": status}
        ).status_code == 200
    meta = client.get(f"/api/applications/{app_id}").json()["meta"]
    assert meta["status"] == "accepted"
    # the Sankey needs flows, not just the current value
    assert [h["status"] for h in meta["history"]] == [
        "not_started", "in_progress", "applied", "screen", "interview", "offer", "accepted",
    ]
    assert all(h["date"] for h in meta["history"])
    client.put(f"/api/applications/{app_id}/meta", json={"status": "accepted"})
    meta2 = client.get(f"/api/applications/{app_id}").json()["meta"]
    assert len(meta2["history"]) == len(meta["history"])  # a no-op set adds nothing


def test_terminal_status_reachable_from_any_stage(client):
    r = client.post("/api/applications", json={"company": "B", "role": "R"})
    app_id = r.json()["id"]
    client.put(f"/api/applications/{app_id}/meta", json={"status": "applied"})
    client.put(
        f"/api/applications/{app_id}/meta",
        json={"status": "ghosted", "outcome_note": "never replied"},
    )
    meta = client.get(f"/api/applications/{app_id}").json()["meta"]
    assert meta["status"] == "ghosted"
    assert meta["outcome_note"] == "never replied"
    assert [h["status"] for h in meta["history"]] == ["not_started", "applied", "ghosted"]
    assert client.put(f"/api/applications/{app_id}/meta", json={"status": "nope"}).status_code == 400


def test_meta_update_rejects_non_field_keys(client):
    """`updates` is splatted into set_app_meta; a key like "self" used to raise
    a TypeError and 500 instead of a 400."""
    r = client.post("/api/applications", json={"company": "C", "role": "R"})
    app_id = r.json()["id"]
    for bad in ({"self": "x"}, {"history": []}, {"__class__": "x"}):
        assert client.put(f"/api/applications/{app_id}/meta", json=bad).status_code == 400


def test_legacy_status_and_missing_history_migrate_on_read(client, repo):
    """Pre-refactor repos used `draft` and had no history at all."""
    from resumedb.fsio import dump_yaml

    app_dir = repo.root / "applications" / "2026-01-legacy"
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


def test_history_sha_rejects_git_argument_injection(client, repo):
    """A sha reaches git as an argument: `--output=X` would make `git show`
    overwrite a repo file."""
    target = repo.root / "CLAUDE.md"
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


def test_one_bad_file_does_not_break_a_list(client, repo):
    """A single unparseable YAML file used to blank the whole Library or
    pipeline; it must be surfaced as data on that row instead."""
    root = repo.root
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
    (chats / "20260101-000000.jsonl").write_text(
        'not json\n{"role":"user","text":"ok"}\n{"text":5}\n'
    )
    convs = client.get("/api/chat/db/conversations").json()
    assert convs[0]["count"] == 2  # corrupt line skipped, non-string text coerced


def test_chat_scope_validation(client):
    assert client.get("/api/chat/db/conversations").status_code == 200
    assert client.get("/api/chat/bogus-scope/conversations").status_code == 400
    assert client.get("/api/chat/app:UPPER/conversations").status_code == 400


def test_upload_endpoint_stores_the_file_and_rejects_other_types(client, repo):
    r = client.post(
        "/api/upload",
        data={"scope": "db"},
        files={"file": ("notes.pdf", b"%PDF-1.4", "application/pdf")},
    )
    assert r.status_code == 200
    assert r.json()["path"] == "uploads/notes.pdf"
    assert (repo.root / "uploads" / "notes.pdf").read_bytes() == b"%PDF-1.4"
    rejected = client.post(
        "/api/upload",
        data={"scope": "db"},
        files={"file": ("payload.exe", b"MZ", "application/octet-stream")},
    )
    assert rejected.status_code == 400
    assert not (repo.root / "uploads" / "payload.exe").exists()


@pytest.mark.skipif(shutil.which("typst") is None, reason="typst required")
def test_mock_agent_tailor_render_e2e(client, repo, mock_agent):
    """The plan's one E2E: application -> (mock) tailor -> render -> 1-page PDF."""
    import asyncio

    from resumedb.fsio import load_yaml

    r = client.post(
        "/api/applications",
        json={"company": "Acme", "role": "Engineer", "jd_text": "Build things."},
    )
    app_id = r.json()["id"]

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
    agent = mock_agent(
        events=[{"type": "result", "text": "Tailored.", "is_error": False, "cost_usd": 0}],
        on_start=lambda cwd: (cwd / "applications" / app_id / "resume.yaml").write_text(resume_yaml),
    )

    async def run():
        m = turns.TurnManager()
        turn = m.start(repo, agent, f"app:{app_id}", "20260101-000000", "tailor", "tailor", None, None)
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
