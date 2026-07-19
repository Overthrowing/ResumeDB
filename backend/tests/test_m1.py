"""M1 tests: datarepo round-trip, gitops scoping, render pipeline."""

import subprocess

import pytest

from resumedb import gitops, render
from resumedb.datarepo import DataRepo, DataRepoError, init_datarepo


@pytest.fixture()
def repo(tmp_path):
    root = tmp_path / "data"
    subprocess.run(["git", "config", "--global", "user.email"], capture_output=True)
    init_datarepo(root)
    return DataRepo(root)


def test_scaffold(repo):
    assert (repo.root / "CLAUDE.md").exists()
    assert (repo.root / ".gitignore").exists()
    assert (repo.root / ".claude" / "skills" / "tailor-resume" / "SKILL.md").exists()
    assert repo.list_templates() == ["classic"]
    assert gitops.log(repo.root, "db")  # scaffold commit present


def test_init_refuses_nonempty(tmp_path):
    d = tmp_path / "busy"
    d.mkdir()
    (d / "junk.txt").write_text("x")
    with pytest.raises(DataRepoError):
        init_datarepo(d)


def test_entry_crud_preserves_comments(repo):
    path = repo.root / "db" / "acme.yaml"
    path.write_text(
        "# my hand-written comment\n"
        "type: experience\n"
        "title: Engineer\n"
        "org: Acme\n"
        "bullets:\n"
        "  - did things  # inline note\n"
    )
    entry = repo.get_entry("acme")
    entry["title"] = "Senior Engineer"
    repo.save_entry("acme", entry)
    text = path.read_text()
    assert "# my hand-written comment" in text
    assert "# inline note" in text
    assert "Senior Engineer" in text
    assert repo.get_entry("acme")["org"] == "Acme"


def test_entry_validation(repo):
    with pytest.raises(DataRepoError):
        repo.save_entry("bad", {"type": "nonsense", "title": "x"})
    with pytest.raises(DataRepoError):
        repo.save_entry("bad", {"type": "project"})
    with pytest.raises(DataRepoError):
        repo.get_entry("../escape")


def test_application_lifecycle_and_scoped_history(repo):
    app_id = repo.create_application("Acme Corp", "SWE II", "We need a go dev", "classic")
    assert app_id.endswith("acme-corp-swe-ii")
    app = repo.get_application(app_id)
    assert app["files"]["jd.md"] == "We need a go dev"
    assert "resume.typ" in app["files"]

    repo.save_app_file(app_id, "notes.md", "referred by Jane")
    with pytest.raises(DataRepoError):
        repo.save_app_file(app_id, "meta.yaml", "nope")

    app_log = gitops.log(repo.root, f"app:{app_id}")
    assert [e["subject"].split(":")[0] for e in app_log] == ["app"] * 2
    db_log = gitops.log(repo.root, "db")
    assert all(e["subject"].startswith("db:") for e in db_log)
    assert len(db_log) == 1  # only the scaffold commit; app work is invisible to db scope


def test_render_and_overflow_flag(repo):
    app_id = repo.create_application("Acme", "SWE", "jd", "classic")
    # seed resume.yaml from the template sample so there is real content
    sample = (repo.root / "templates" / "sample.yaml").read_text()
    (repo.root / "applications" / app_id / "resume.yaml").write_text(sample)
    result = render.render(repo.root, app_id)
    assert result["ok"], result["stderr"]
    assert result["pages"] == 1
    assert result["overflow"] is False


def test_validate_template(repo):
    assert render.validate_template(repo.root, "classic")["ok"]
    (repo.root / "templates" / "broken.typ").write_text("#broken(")
    assert not render.validate_template(repo.root, "broken")["ok"]


def test_render_error_passthrough(repo):
    app_id = repo.create_application("Acme", "SWE", "jd", "classic")
    (repo.root / "applications" / app_id / "resume.typ").write_text("#broken(")
    result = render.render(repo.root, app_id)
    assert not result["ok"]
    assert result["stderr"]


def test_malformed_proposal_does_not_hide_others(repo):
    (repo.root / "proposals" / "good.yaml").write_text(
        "target: db/good.yaml\ntype: experience\ntitle: Good\n"
    )
    # unquoted "PI: name" turns the line into a key/value; the colon-free
    # continuation line then fails simple-key scanning - the real-world breaker
    (repo.root / "proposals" / "broken.yaml").write_text(
        "target: db/broken.yaml\ntype: experience\ntitle: X\nbullets:\n"
        "- Research Fellow (PI: Jeff Schneider), CMU School\n"
        "  working on world models and VLA\n"
    )
    listed = {p["name"]: p for p in repo.list_proposals()}
    assert listed["good.yaml".removesuffix(".yaml")]["error"] is None
    assert listed["broken"]["error"] is not None
    with pytest.raises(DataRepoError, match="not valid YAML"):
        repo.approve_proposal("broken")
    repo.approve_proposal("good")  # unaffected
    repo.reject_proposal("broken")
    assert repo.list_proposals() == []
    with pytest.raises(DataRepoError):
        repo.reject_proposal("../../etc/passwd")


def test_proposals(repo):
    (repo.root / "proposals" / "new-role.yaml").write_text(
        "target: db/new-role.yaml\ntype: experience\ntitle: New Role\n"
    )
    assert repo.list_proposals()[0]["name"] == "new-role"
    repo.approve_proposal("new-role")
    assert repo.get_entry("new-role")["title"] == "New Role"
    assert not (repo.root / "proposals" / "new-role.yaml").exists()

    (repo.root / "proposals" / "bad.yaml").write_text("type: experience\ntitle: X\n")
    with pytest.raises(DataRepoError):
        repo.approve_proposal("bad")
    repo.reject_proposal("bad")
    assert repo.list_proposals() == []


def test_memory_markdown_and_migration(repo):
    assert "Constraints" in repo.get_memory()["content"]  # scaffold memory.md
    repo.save_memory("## My rules\n\nBe terse.\n")
    assert repo.get_memory()["content"].startswith("## My rules")

    # legacy structured memory.yaml migrates to markdown once
    (repo.root / "db" / "memory.md").unlink()
    (repo.root / "db" / "memory.yaml").write_text(
        "narrative: Backend engineer\nconstraints: Never invent metrics\nvoice: ''\n"
    )
    content = repo.get_memory()["content"]
    assert "## Narrative" in content and "Backend engineer" in content
    assert "## Constraints" in content and "Never invent metrics" in content
    assert "## Voice" not in content  # empty fields dropped
    assert not (repo.root / "db" / "memory.yaml").exists()


def test_sync_restores_missing_claude_md(repo):
    from resumedb.datarepo import sync_new_skills

    (repo.root / "CLAUDE.md").unlink()
    gitops.checkpoint(repo.root, "db", "agent deleted the rulebook")
    sync_new_skills(repo.root)
    assert (repo.root / "CLAUDE.md").exists()
    assert gitops.log(repo.root, "db")[0]["subject"].startswith("db: sync from app update")
    assert "NEVER delete" in (repo.root / "CLAUDE.md").read_text()


def test_changed_files(repo):
    (repo.root / "db" / "new-entry.yaml").write_text("type: project\ntitle: X\n")
    (repo.root / "db" / "profile.yaml").unlink()
    changed = gitops.changed_files(repo.root, "db", "CLAUDE.md")
    assert "db/new-entry.yaml" in changed
    assert "db/profile.yaml" in changed


def test_conversation_list_and_delete(repo, monkeypatch):
    from fastapi import HTTPException

    from resumedb import chat

    monkeypatch.setattr(chat, "_repo", lambda: repo)
    log = repo.root / "db" / "chats" / "20260101-120000.jsonl"
    chat._append(log, "user", "hello\nworld")
    chat._append(log, "assistant", "hi")

    convs = chat.list_conversations("db")
    assert [c["id"] for c in convs] == ["20260101-120000"]
    assert convs[0]["title"] == "hello world"  # whitespace collapsed
    assert convs[0]["count"] == 2

    chat.delete_conversation("db", "20260101-120000")
    assert chat.list_conversations("db") == []
    with pytest.raises(HTTPException):
        chat.delete_conversation("db", "20260101-120000")
    with pytest.raises(HTTPException):
        chat.delete_conversation("db", "../../../etc/passwd")


def test_revert(repo):
    entry = {"type": "project", "title": "Original"}
    repo.save_entry("proj", entry)
    entry["title"] = "Changed"
    repo.save_entry("proj", entry)
    sha = gitops.log(repo.root, "db")[0]["sha"]
    gitops.revert(repo.root, sha)
    assert repo.get_entry("proj")["title"] == "Original"
