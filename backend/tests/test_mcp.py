import pytest
from fastapi.testclient import TestClient

from resumedb import agent_connections, config
from resumedb.datarepo import DataRepo, init_datarepo
from resumedb.main import app


@pytest.fixture()
def mcp_repo(tmp_path, monkeypatch):
    root = tmp_path / "career-data"
    init_datarepo(root)
    repo = DataRepo(root)
    repo.save_profile({
        "name": "Jordan Lee",
        "email": "jordan@example.com",
        "college": "Carnegie Mellon University",
        "major": "Computer Science",
        "graduation_year": "2027",
        "application_answers": {"age_18_or_older": "yes"},
    })
    repo.save_entry("robotics", {
        "type": "project",
        "title": "Robotics Lab",
        "bullets": ["Built a Python perception service"],
    })
    monkeypatch.setattr(config, "CONFIG_PATH", tmp_path / "config.json")
    monkeypatch.setenv("RESUMEDB_DATA_REPO", str(root))
    return repo


def _mcp_request(client: TestClient, token: str, method: str, params: dict, request_id: int = 1):
    return client.post(
        "/mcp/",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json, text/event-stream",
            "Content-Type": "application/json",
            "MCP-Protocol-Version": "2025-06-18",
        },
        json={"jsonrpc": "2.0", "id": request_id, "method": method, "params": params},
    )


def test_connection_token_is_hashed_rotatable_and_revocable(mcp_repo):
    first, state = agent_connections.rotate()
    path = config.CONFIG_PATH.with_name("resumedb-agent-connection.json")

    assert state["enabled"] is True
    assert first not in path.read_text()
    assert agent_connections.verify(first) is True

    second, _ = agent_connections.rotate()
    assert agent_connections.verify(first) is False
    assert agent_connections.verify(second) is True

    assert agent_connections.revoke() is True
    assert agent_connections.verify(second) is False
    assert agent_connections.status()["enabled"] is False


def test_connection_api_reveals_secret_only_when_rotated(mcp_repo):
    client = TestClient(app)
    empty = client.get(
        "/api/agent-connections/mcp",
        headers={"x-forwarded-proto": "https", "x-forwarded-host": "api.example.test"},
    )
    assert empty.status_code == 200
    assert empty.json()["mcp_url"] == "https://api.example.test/mcp/"
    assert empty.json()["enabled"] is False
    assert len(empty.json()["tools"]) >= 10

    created = client.post(
        "/api/agent-connections/mcp/rotate",
        headers={"x-forwarded-proto": "https", "x-forwarded-host": "api.example.test"},
    )
    payload = created.json()
    assert payload["token"].startswith("rdb_mcp_")
    assert "codex mcp add resumedb" in payload["codex_command"]
    assert "--bearer-token-env-var RESUMEDB_MCP_TOKEN" in payload["codex_command"]

    hidden = client.get("/api/agent-connections/mcp").json()
    assert hidden["enabled"] is True
    assert "token" not in hidden


def test_authenticated_mcp_reads_everything_and_performs_bounded_writes(mcp_repo):
    token, _ = agent_connections.rotate()
    with TestClient(app) as client:
        unauthorized = client.post("/mcp/", json={})
        assert unauthorized.status_code == 401

        initialized = _mcp_request(
            client,
            token,
            "initialize",
            {
                "protocolVersion": "2025-06-18",
                "capabilities": {},
                "clientInfo": {"name": "ResumeDB test", "version": "1"},
            },
        )
        assert initialized.status_code == 200
        assert initialized.json()["result"]["serverInfo"]["name"] == "ResumeDB"

        tools = _mcp_request(client, token, "tools/list", {}, request_id=2).json()["result"]["tools"]
        annotations = {tool["name"]: tool["annotations"] for tool in tools}
        assert annotations["get_candidate_context"]["readOnlyHint"] is True
        assert annotations["save_job_lead"]["readOnlyHint"] is False
        assert annotations["save_job_lead"]["openWorldHint"] is False

        context_response = _mcp_request(
            client,
            token,
            "tools/call",
            {"name": "get_candidate_context", "arguments": {}},
            request_id=3,
        ).json()["result"]
        context = context_response["structuredContent"]
        assert context["knowledge"]["profile"]["name"] == "Jordan Lee"
        assert context["knowledge"]["entries"][0]["title"] == "Robotics Lab"
        assert {gap["key"] for gap in context["missing_facts"]} >= {"gender", "work_authorization"}

        saved = _mcp_request(
            client,
            token,
            "tools/call",
            {
                "name": "save_job_lead",
                "arguments": {
                    "lead": {
                        "company": "Acme",
                        "role": "Software Intern",
                        "application_url": "https://jobs.example.test/intern",
                        "fit_score": 91,
                        "evidence": ["Robotics Lab used Python"],
                    }
                },
            },
            request_id=4,
        ).json()["result"]
        assert saved["isError"] is False
        assert mcp_repo.list_job_leads()[0]["fit_score"] == 91

        proposal = _mcp_request(
            client,
            token,
            "tools/call",
            {
                "name": "propose_knowledge_entry",
                "arguments": {
                    "entry_id": "new-research",
                    "entry": {
                        "type": "project",
                        "title": "New Research",
                        "bullets": ["User reported a new research project"],
                    },
                },
            },
            request_id=5,
        ).json()["result"]
        assert proposal["isError"] is False
        assert "new-research" not in {entry["id"] for entry in mcp_repo.list_entries()}
        assert mcp_repo.list_proposals()[0]["target"] == "db/new-research.yaml"


def test_connected_agent_timeline_is_visible_to_existing_run_api(mcp_repo):
    from resumedb.mcp_server import begin_agent_run, finish_agent_run, record_agent_progress

    run = begin_agent_run("Find backend internships")
    record_agent_progress(
        run["id"],
        "knowledge",
        "Read approved knowledge",
        "Loaded the profile and evidence without inferring missing facts.",
    )
    completed = finish_agent_run(run["id"], "Saved two supported drafts.")

    assert completed["status"] == "completed"
    assert completed["kind"] == "external_agent"
    assert [event["id"] for event in completed["events"]] == ["connected", "knowledge"]
    assert mcp_repo.list_research_runs()[0]["summary"] == "Saved two supported drafts."


def test_connected_agent_cannot_change_human_controlled_application(mcp_repo):
    from resumedb.mcp_server import save_application_artifact, update_application_draft

    app_id = mcp_repo.create_application("Acme", "Software Intern", "Build Python services", "classic")
    mcp_repo.set_app_meta(app_id, status="ready")

    with pytest.raises(ValueError, match="ready or submitted"):
        save_application_artifact(app_id, "notes.md", "Change after approval")
    with pytest.raises(ValueError, match="ready or submitted"):
        update_application_draft(app_id, fit_summary="Change after approval")
