import json
import pytest
from fastapi.testclient import TestClient
from resumedb.main import app
from resumedb import config, routes
from resumedb.datarepo import init_datarepo, DataRepo
from unittest.mock import patch, AsyncMock

@pytest.fixture()
def client(tmp_path, monkeypatch):
    root = tmp_path / "data"
    init_datarepo(root)
    # mock config to return our temp repo
    monkeypatch.setattr(config, "load", lambda: {
        "data_repo": str(root),
        "agent_provider": "claude",
        "claude_bin": "claude",
        "models": {
            "jd": "haiku",
            "jd_effort": "low",
        }
    })
    return TestClient(app)

@patch("resumedb.routes.run_oneshot", new_callable=AsyncMock)
def test_agent_ingest(mock_run_oneshot, client):
    mock_run_oneshot.return_value = json.dumps({
        "summary": "Extracted Software Engineer role at Google",
        "job": {
            "company": "Google",
            "role": "Software Engineer",
            "location": "Mountain View, CA",
            "salary_amount": 150000,
            "salary_currency": "USD",
            "salary_period": "year",
            "priority": 3,
            "job_description": "We need a python dev",
            "application_url": "https://google.com/jobs",
        }
    })
    
    response = client.post("/api/agent/ingest", json={"input": "Google SWE listing"})
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["summary"] == "Extracted Software Engineer role at Google"
    assert res_data["job"]["company"] == "Google"
    assert res_data["job"]["role"] == "Software Engineer"
    
    # Check that the run was saved in history
    runs_res = client.get("/api/agent/runs")
    assert runs_res.status_code == 200
    runs = runs_res.json()
    assert len(runs) == 1
    assert runs[0]["id"] == res_data["run_id"]
    assert runs[0]["status"] == "completed"

@patch("resumedb.routes.run_oneshot", new_callable=AsyncMock)
def test_agent_search(mock_run_oneshot, client):
    mock_run_oneshot.return_value = json.dumps({
        "summary": "Found 1 role",
        "jobs": [
            {
                "company": "Apple",
                "role": "iOS Engineer",
                "location": "Cupertino, CA",
                "priority": 2,
                "job_description": "Swift developer",
            }
        ]
    })
    
    response = client.post("/api/agent/search", json={"query": "iOS internships"})
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["summary"] == "Found 1 role"
    assert len(res_data["jobs"]) == 1
    assert res_data["jobs"][0]["company"] == "Apple"
    
    # Check detail run endpoint
    run_id = res_data["run_id"]
    run_res = client.get(f"/api/agent/runs/{run_id}")
    assert run_res.status_code == 200
    run_data = run_res.json()
    assert run_data["status"] == "completed"
    assert run_data["result"]["summary"] == "Found 1 role"
