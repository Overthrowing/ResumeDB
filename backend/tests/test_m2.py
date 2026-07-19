import subprocess
import asyncio
import pytest
from resumedb.datarepo import DataRepo, DataRepoError, init_datarepo
from resumedb.review import run_review
from resumedb.interview import load_questions, save_questions

@pytest.fixture()
def repo(tmp_path):
    root = tmp_path / "data"
    subprocess.run(["git", "config", "--global", "user.email"], capture_output=True)
    init_datarepo(root)
    return DataRepo(root)

def test_status_pipeline_validation(repo):
    app_id = repo.create_application("Acme Corp", "SWE II", "Go developer description", "classic")
    
    # Verify default status
    app = repo.get_application(app_id)
    assert app["meta"]["status"] == "not_started"
    
    # Valid transition
    repo.set_app_meta(app_id, status="in_progress")
    assert repo.get_application(app_id)["meta"]["status"] == "in_progress"
    
    # Invalid transition should fail
    with pytest.raises(DataRepoError):
        repo.set_app_meta(app_id, status="invalid_status")

def test_deterministic_review_missing_jd(repo):
    # Create application with empty JD
    app_id = repo.create_application("Acme Corp", "SWE II", "", "classic")
    
    report = asyncio.run(run_review(repo, app_id))
    assert report["readiness_score"] == 10
    
    # Verify that missing JD is flagged in the items
    missing_jd_item = next((it for it in report["items"] if it["title"] == "Missing Job Description"), None)
    assert missing_jd_item is not None
    assert missing_jd_item["severity"] == "critical"

def test_interview_persistence(repo):
    app_id = repo.create_application("Acme Corp", "SWE II", "Go description", "classic")
    
    # Should start with no questions
    assert load_questions(repo, app_id) == []
    
    # Save mock questions
    mock_qs = [
        {
            "id": "q1",
            "type": "technical",
            "question": "What is channels in Go?",
            "context": "Needs concurrency skills",
            "tips": "Mention CSP model"
        }
    ]
    save_questions(repo, app_id, mock_qs)
    
    # Load and verify
    loaded = load_questions(repo, app_id)
    assert len(loaded) == 1
    assert loaded[0]["id"] == "q1"
    assert loaded[0]["question"] == "What is channels in Go?"
