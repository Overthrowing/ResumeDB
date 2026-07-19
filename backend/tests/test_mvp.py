import subprocess

import pytest

from resumedb import config, pipeline
from resumedb.agent import public_agent_error
from resumedb.datarepo import DataRepo, DataRepoError, init_datarepo


@pytest.fixture()
def repo(tmp_path):
    root = tmp_path / "data"
    subprocess.run(["git", "config", "--global", "user.email"], capture_output=True)
    init_datarepo(root)
    r = DataRepo(root)
    r.save_profile({
        "name": "Jordan Lee",
        "email": "jordan@example.com",
        "phone": "555-0100",
        "location": "Pittsburgh, PA",
        "college": "Carnegie Mellon University",
        "major": "Computer Science",
        "degree": "BS",
        "graduation_year": "2027",
        "work_authorization": "Authorized to work in the US",
        "requires_sponsorship": "no",
        "application_answers": {"age_18_or_older": "yes"},
        "links": [],
    })
    r.save_entry("robotics", {
        "type": "project",
        "title": "Robotics Lab",
        "bullets": ["Built a Python perception service"],
    })
    return r


def test_readiness_enforces_human_review_and_submission(repo):
    app_id = repo.create_application("Acme", "Software Intern", "Python internship", "classic")
    repo.set_app_meta(app_id, status="draft")

    with pytest.raises(DataRepoError, match="unresolved blockers"):
        repo.approve_application(app_id)

    sample = (repo.root / "templates" / "sample.yaml").read_text()
    (repo.app_dir(app_id) / "resume.yaml").write_text(sample)
    (repo.app_dir(app_id) / "resume.pdf").write_bytes(b"rendered-pdf")
    (repo.app_dir(app_id) / "answers.yaml").write_text(
        "answers: []\nmissing:\n  - key: authorization\n    label: Authorization answer\n    required: true\n"
    )
    with pytest.raises(DataRepoError, match="Authorization answer"):
        repo.approve_application(app_id)

    (repo.app_dir(app_id) / "answers.yaml").write_text("answers: []\nmissing: []\n")
    report = repo.approve_application(app_id)
    assert report["ready"] is True
    assert repo.get_application(app_id)["meta"]["status"] == "ready"

    repo.mark_submitted(app_id)
    submitted = repo.get_application(app_id)["meta"]
    assert submitted["status"] == "submitted"
    assert submitted["submitted_at"]


def test_job_leads_are_canonicalized_and_deduplicated(repo):
    first = repo.save_job_lead({
        "company": "Acme",
        "role": "Software Intern",
        "application_url": "https://jobs.acme.com/123?utm_source=list&ref=home",
        "fit_score": 82,
    })
    second = repo.save_job_lead({
        "company": "Acme",
        "role": "Software Intern",
        "application_url": "https://jobs.acme.com/123",
        "fit_score": 91,
    })
    assert first["id"] == second["id"]
    assert len(repo.list_job_leads()) == 1
    assert repo.list_job_leads()[0]["fit_score"] == 91


def test_new_repo_never_exposes_scaffolded_candidate_experience(tmp_path):
    root = tmp_path / "fresh-data"
    init_datarepo(root)
    assert DataRepo(root).list_entries() == []


@pytest.mark.anyio
async def test_universal_job_agent_receives_complete_knowledge(repo, monkeypatch):
    captured = {}

    async def fake_run_structured(**kwargs):
        captured.update(kwargs)
        return {
            "intent": "add_job",
            "summary": "Added a strong match",
            "search_goal": None,
            "jobs": [{
                "company": "Acme",
                "role": "Software Intern",
                "application_url": "https://jobs.acme.com/123",
                "fit_score": 88,
                "fit_summary": "Python project aligns with the role",
                "evidence": ["Robotics Lab used Python"],
                "missing_facts": [],
                "hard_conflicts": [],
            }],
        }

    monkeypatch.setattr(pipeline, "run_structured", fake_run_structured)
    result = await pipeline.run_job_command(repo, "add https://jobs.acme.com/123")
    assert result["jobs"][0]["fit_level"] == "high"
    assert "Carnegie Mellon University" in captured["prompt"]
    assert "Robotics Lab" in captured["prompt"]
    assert "Never infer" in captured["prompt"]
    assert captured["allow_web"] is True


@pytest.mark.anyio
async def test_prepare_application_persists_complete_draft(repo, monkeypatch):
    lead = repo.save_job_lead({
        "company": "Acme",
        "role": "Software Intern",
        "application_url": "https://jobs.acme.com/123",
        "job_description": "Build Python services",
        "fit_score": 90,
        "fit_summary": "Strong match",
    })
    app_id = pipeline.track_lead(repo, lead["id"])

    async def fake_run_structured(**_kwargs):
        return {
            "resume": {
                "name": "Jordan Lee",
                "headline": "Software Engineering Intern",
                "contact": {"email": "jordan@example.com"},
                "sections": [{
                    "title": "Projects",
                    "entries": [{
                        "title": "Robotics Lab",
                        "bullets": ["Built a Python perception service"],
                    }],
                }],
            },
            "answers": [{
                "key": "age_18_or_older",
                "question": "Are you 18 or older?",
                "value": "yes",
                "required": True,
                "source": "profile.application_answers.age_18_or_older",
            }],
            "missing": [],
            "cover_letter": "I am excited to apply.",
            "recruiter_message": "Jordan is interested in the role.",
            "decisions": ["Led with Python because the posting asks for Python services."],
            "fit_summary": "Strong Python evidence",
        }

    monkeypatch.setattr(pipeline, "run_structured", fake_run_structured)

    def fake_render(_root, rendered_app_id):
        (repo.app_dir(rendered_app_id) / "resume.pdf").write_bytes(b"rendered-pdf")
        return {"ok": True, "pages": 1, "overflow": False, "stderr": ""}

    monkeypatch.setattr(pipeline.render, "render", fake_render)

    result = await pipeline.prepare_application(repo, app_id)
    app = repo.get_application(app_id)
    assert app["meta"]["status"] == "draft"
    assert "Robotics Lab" in app["files"]["resume.yaml"]
    assert "age_18_or_older" in app["files"]["answers.yaml"]
    assert "posting asks for Python" in app["files"]["decisions.md"]
    assert result["readiness"]["ready"] is True


def test_codex_config_clears_legacy_claude_model_names(tmp_path, monkeypatch):
    path = tmp_path / "config.json"
    path.write_text(
        '{"agent_provider":"codex","models":{"jd":"haiku","audit":"sonnet","tailor":"gpt-5.6-sol"}}'
    )
    monkeypatch.setattr(config, "CONFIG_PATH", path)

    loaded = config.load()

    assert loaded["models"]["jd"] is None
    assert loaded["models"]["audit"] is None
    assert loaded["models"]["tailor"] == "gpt-5.6-sol"


def test_subscription_errors_are_visible_and_clear_after_success(repo):
    subscription = repo.save_search_subscription("Find backend internships")
    repo.mark_subscription_error(subscription["id"], "provider unavailable")
    failed = repo.list_search_subscriptions()[0]
    assert failed["last_error"] == "provider unavailable"
    assert failed["last_attempt_at"]

    repo.mark_subscription_run(subscription["id"])
    recovered = repo.list_search_subscriptions()[0]
    assert recovered["last_error"] is None
    assert recovered["last_run_at"]


def test_provider_process_details_are_not_exposed_to_users():
    error = RuntimeError("Codex process closed stdout. stderr_tail=private internal detail")
    assert public_agent_error(error) == "The configured agent process stopped unexpectedly. Retry this action."


def test_autofill_package_always_includes_nonblank_answer_bank(repo):
    app_id = repo.create_application("Acme", "Software Intern", "Build Python services", "classic")
    (repo.app_dir(app_id) / "answers.yaml").write_text("answers: []\nmissing: []\n")

    package = pipeline.autofill_package(repo, app_id)

    answer = next(item for item in package["answers"] if item["key"] == "age_18_or_older")
    assert answer["value"] == "yes"
    assert answer["source"] == "profile.application_answers.age_18_or_older"


def test_missing_age_and_demographic_answers_are_profile_warnings(repo):
    profile = repo.get_profile()
    profile["application_answers"] = {}
    repo.save_profile(profile)

    keys = {gap["key"] for gap in repo.profile_gaps()}

    assert "age_18_or_older" in keys
    assert "gender" in keys
