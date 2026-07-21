import pytest
from fastapi.testclient import TestClient

from resumedb import gitops, routes
from resumedb.datarepo import DataRepo, DataRepoError, init_datarepo
from resumedb.main import app


@pytest.fixture()
def repo(tmp_path):
    root = tmp_path / "data"
    init_datarepo(root)
    return DataRepo(root)


@pytest.fixture()
def client(repo, monkeypatch):
    monkeypatch.setattr(routes, "repo", lambda: repo)
    return TestClient(app)


def test_approve_all_proposals_commits_valid_entries_and_retains_invalid(repo):
    proposals = repo.root / "proposals"
    (proposals / "01-first.yaml").write_text(
        "target: db/first.yaml\ntype: project\ntitle: First\n"
    )
    (proposals / "02-second.yml").write_text(
        "target: db/second.yaml\ntype: experience\ntitle: Second\n"
    )
    (proposals / "03-missing-target.yaml").write_text(
        "type: skill\ntitle: Missing target\n"
    )
    (proposals / "04-malformed.yaml").write_text("target: [unterminated\n")
    gitops.checkpoint(repo.root, "db", "seed proposals")
    commits_before = len(gitops.log(repo.root, "db"))

    result = repo.approve_all_proposals()

    assert result == {
        "approved": ["01-first", "02-second"],
        "skipped": ["03-missing-target", "04-malformed"],
    }
    assert repo.get_entry("first")["title"] == "First"
    assert repo.get_entry("second")["title"] == "Second"
    assert not (proposals / "01-first.yaml").exists()
    assert not (proposals / "02-second.yml").exists()
    assert (proposals / "03-missing-target.yaml").exists()
    assert (proposals / "04-malformed.yaml").exists()
    log = gitops.log(repo.root, "db")
    assert len(log) == commits_before + 1
    assert log[0]["subject"] == "db: approve 2 proposals"


def test_uploads_are_sanitized_collision_safe_and_scoped(repo):
    first = repo.save_upload("db", "report FINAL.PDF", b"first")
    second = repo.save_upload("db", "report FINAL.PDF", b"second")
    app_id = repo.create_application("Acme", "Engineer", "Job", "classic")
    app_upload = repo.save_upload(
        f"app:{app_id}:interview", "notes.md", b"application notes"
    )

    assert first == "uploads/report-FINAL.pdf"
    assert second == "uploads/report-FINAL-2.pdf"
    assert (repo.root / first).read_bytes() == b"first"
    assert (repo.root / second).read_bytes() == b"second"
    assert app_upload == f"applications/{app_id}/uploads/notes.md"
    assert (repo.root / app_upload).read_bytes() == b"application notes"
    assert gitops.log(repo.root, f"app:{app_id}")[0]["subject"] == "app:" + app_id + ": upload notes.md"


@pytest.mark.parametrize("filename", ["payload.exe", "README"])
def test_uploads_reject_unsupported_file_types(repo, filename):
    with pytest.raises(DataRepoError, match="not allowed"):
        repo.save_upload("db", filename, b"nope")


def test_uploads_reject_unknown_scope(repo):
    with pytest.raises(DataRepoError, match="bad upload scope"):
        repo.save_upload("other", "notes.txt", b"nope")


def test_upload_endpoint_enforces_size_limit(client, repo, monkeypatch):
    monkeypatch.setattr(routes, "MAX_UPLOAD_BYTES", 4)

    response = client.post(
        "/api/upload",
        data={"scope": "db"},
        files={"file": ("notes.txt", b"12345", "text/plain")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "file too large (max 20 MB)"
    assert not (repo.root / "uploads").exists()


def test_upload_and_approve_all_endpoints(client, repo):
    upload = client.post(
        "/api/upload",
        data={"scope": "db"},
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert upload.status_code == 200
    assert upload.json() == {"path": "uploads/notes.txt"}

    proposal = repo.root / "proposals" / "new-project.yaml"
    proposal.write_text("target: db/new-project.yaml\ntype: project\ntitle: New Project\n")
    gitops.checkpoint(repo.root, "db", "seed proposal")

    approval = client.post("/api/proposals/approve-all")

    assert approval.status_code == 200
    assert approval.json() == {"approved": ["new-project"], "skipped": []}
    assert repo.get_entry("new-project")["title"] == "New Project"
