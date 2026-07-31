"""The seams between the app and the tools it shells out to.

get_agent/model_for (every agent call resolves here), render (typst), and the
deterministic half of the ATS audit. None of these may raise into a route: a
missing or broken external tool has to come back as a readable result.
"""

import importlib.util
import subprocess
import types
from pathlib import Path

import pytest

from resumedb import audit, config, render
from resumedb.claude import ClaudeProcess
from resumedb.providers import AgentError, get_agent, model_for

HAS_CODEX_SDK = importlib.util.find_spec("openai_codex") is not None


# -- provider seam -------------------------------------------------------------

def test_get_agent_routes_claude_turns_to_the_configured_binary():
    agent = get_agent({"agent_provider": "claude", "claude_bin": "/fake/claude"})
    assert agent.bin == "/fake/claude"
    proc = agent.start_turn(Path("/tmp"), "hi")
    assert isinstance(proc, ClaudeProcess)
    assert proc.argv[0] == "/fake/claude"  # the configured bin actually gets spawned


def test_get_agent_resolves_the_codex_binary_for_the_codex_provider():
    assert get_agent({"agent_provider": "codex", "codex_bin": "/fake/codex"}).bin == "/fake/codex"


@pytest.mark.skipif(HAS_CODEX_SDK, reason="only meaningful when the optional SDK is absent")
def test_selecting_codex_without_the_sdk_says_how_to_recover():
    """Codex is optional, so the gap has to surface as an instruction rather
    than an ImportError from deep inside a turn."""
    agent = get_agent({"agent_provider": "codex", "codex_bin": "/fake/codex"})
    with pytest.raises(RuntimeError, match="openai_codex SDK"):
        agent.start_turn(Path("/tmp"), "hi")


def test_get_agent_falls_back_to_the_binary_on_path(monkeypatch):
    monkeypatch.setattr(config.shutil, "which", lambda name: f"/usr/bin/{name}")
    assert get_agent({"agent_provider": "claude"}).bin == "/usr/bin/claude"
    assert get_agent({"agent_provider": "codex"}).bin == "/usr/bin/codex"


def test_get_agent_errors_actionably_when_the_cli_is_missing(monkeypatch):
    """This message is what the user sees in a chat bubble, so it has to say
    what to do rather than surface a stack trace."""
    monkeypatch.setattr(config.shutil, "which", lambda name: None)
    with pytest.raises(AgentError, match="claude auth login"):
        get_agent({"agent_provider": "claude"})
    with pytest.raises(AgentError, match="switch the provider"):
        get_agent({"agent_provider": "codex"})


def test_model_for_pairs_each_call_kind_with_its_own_model_and_effort():
    """Kinds must not cross-wire: a cheap jd fetch on the tailoring model is an
    expensive silent regression. Set explicitly, so product defaults can move."""
    cfg = config.Config(models={
        "chat": "chat-m", "chat_effort": "low",
        "audit": "audit-m", "audit_effort": "medium",
        "jd": "jd-m", "jd_effort": "high",
    }).model_dump()
    assert model_for(cfg, "chat") == ("chat-m", "low")
    assert model_for(cfg, "audit") == ("audit-m", "medium")
    assert model_for(cfg, "jd") == ("jd-m", "high")
    cfg["models"]["chat"] = None  # null outside tailor means "let the CLI pick"
    assert model_for(cfg, "chat") == (None, "low")


def test_every_shipped_model_default_is_a_concrete_name():
    """Settings labels the real model "<name> (default)" instead of offering an
    opaque "default" option, so no setting may resolve to null out of the box."""
    cfg = config.Config().model_dump()
    assert model_for(cfg, "chat") == ("sonnet", None)
    assert model_for(cfg, "tailor") == ("opus", "high")
    assert model_for(cfg, "audit") == ("sonnet", "low")
    assert model_for(cfg, "jd") == ("haiku", "low")


def test_a_stored_null_tailor_still_inherits_the_chat_model():
    """Configs written before the models had concrete defaults legitimately hold
    null. For tailor that means "same as chat"; resolving it to None instead
    would silently downgrade tailoring to whatever the CLI picks."""
    cfg = config.Config(models={"chat": "opus", "tailor": None}).model_dump()
    assert model_for(cfg, "tailor") == ("opus", "high")  # effort keeps its own default
    cfg["models"]["chat_effort"] = "medium"
    cfg["models"]["tailor_effort"] = None
    assert model_for(cfg, "tailor") == ("opus", "medium")  # null effort falls back too
    cfg["models"]["tailor"] = "sonnet"
    assert model_for(cfg, "tailor") == ("sonnet", "medium")  # an explicit choice wins


# -- render --------------------------------------------------------------------

def _app(repo):
    return repo.create_application("Acme", "Engineer", "jd text", "classic")


def _fake_typst(monkeypatch, *, returncode=0, stderr="", raises=None):
    """Swap the subprocess module render sees, so a canned typst result never
    leaks into the git subprocesses the rest of the app runs."""
    monkeypatch.setattr(render, "typst_bin", lambda: "/fake/typst")

    def run(argv, **kwargs):
        if raises:
            raise raises
        return subprocess.CompletedProcess(argv, returncode, "", stderr)

    monkeypatch.setattr(
        render, "subprocess",
        types.SimpleNamespace(run=run, TimeoutExpired=subprocess.TimeoutExpired),
    )


def test_render_reports_a_missing_typst_instead_of_raising(repo, monkeypatch):
    monkeypatch.setattr(render, "typst_bin", lambda: None)
    result = render.render(repo.root, _app(repo))
    assert result == {"ok": False, "pages": 0, "stderr": "typst not installed (brew install typst)"}


def test_render_surfaces_typst_compile_errors(repo, monkeypatch):
    _fake_typst(monkeypatch, returncode=1, stderr="error: unknown variable: nmae")
    result = render.render(repo.root, _app(repo))
    assert result["ok"] is False and result["pages"] == 0
    assert "unknown variable" in result["stderr"]  # the real message reaches the UI


def test_render_reports_a_timeout_rather_than_hanging_the_request(repo, monkeypatch):
    _fake_typst(monkeypatch, raises=subprocess.TimeoutExpired("typst", 60))
    assert render.render(repo.root, _app(repo))["stderr"] == "typst timed out after 60s"


def test_render_reports_an_unreadable_pdf(repo, monkeypatch):
    """typst can exit 0 and still leave a PDF pypdf refuses; that must be a
    render failure, not a 500 from inside the page count."""
    _fake_typst(monkeypatch)  # "succeeds" but writes nothing
    result = render.render(repo.root, _app(repo))
    assert result["ok"] is False
    assert "unreadable" in result["stderr"]


# -- ATS extraction check ------------------------------------------------------

def test_extraction_check_reports_a_resume_that_was_never_rendered(repo):
    result = audit.extraction_check(repo.root, _app(repo))
    assert result == {"ok": False, "error": "not rendered yet", "missing": [], "checked": 0}


def test_extraction_check_reports_an_unreadable_pdf(repo):
    app_id = _app(repo)
    (repo.root / "applications" / app_id / "resume.pdf").write_bytes(b"not a pdf at all")
    result = audit.extraction_check(repo.root, app_id)
    assert result["ok"] is False
    assert "could not read resume.pdf" in result["error"]


def test_extraction_check_names_the_fields_a_pdf_reader_loses(repo):
    """The whole point of the check: prove an ATS can read every word. A field
    the PDF text layer drops has to come back with the exact lost tokens."""
    from pypdf import PdfWriter

    app_id = _app(repo)
    app_dir = repo.root / "applications" / app_id
    (app_dir / "resume.yaml").write_text(
        "name: Zebediah Quux\nsections:\n- title: Experience\n  entries:\n  - title: Dev\n"
    )
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)  # renders no text at all
    with (app_dir / "resume.pdf").open("wb") as f:
        writer.write(f)

    result = audit.extraction_check(repo.root, app_id)
    assert result["ok"] is False and result["error"] is None
    lost = {m["field"]: m["missing_tokens"] for m in result["missing"]}
    assert lost["name"] == ["zebediah", "quux"]  # normalized, not raw
    assert result["checked"] == len(lost) == 3  # name + section title + entry title
