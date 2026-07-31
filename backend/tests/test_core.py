"""Persistence core: atomic writes, YAML round-trip, gitops, config."""

import json
import subprocess
import threading

import pytest

from resumedb import config, gitops
from resumedb.datarepo import DataRepo, init_datarepo, sync_boilerplate
from resumedb.fsio import atomic_write, dump_yaml, load_yaml


@pytest.fixture
def repo(tmp_path):
    root = tmp_path / "data"
    init_datarepo(root)
    return DataRepo(root)


def test_atomic_write_no_temp_left(tmp_path):
    p = tmp_path / "f.txt"
    atomic_write(p, "hello")
    assert p.read_text() == "hello"
    atomic_write(p, "world")
    assert p.read_text() == "world"
    assert [x.name for x in tmp_path.iterdir()] == ["f.txt"]


def test_yaml_roundtrip_preserves_comments(tmp_path):
    p = tmp_path / "e.yaml"
    p.write_text("type: experience  # hand-written comment\ntitle: Dev\norg: Acme\n")
    doc = load_yaml(p)
    doc["title"] = "Senior Dev"
    dump_yaml(doc, p)
    text = p.read_text()
    assert "# hand-written comment" in text
    assert "Senior Dev" in text


def test_entry_save_preserves_comments(repo):
    path = repo.root / "db" / "widget.yaml"
    path.write_text("# my note\ntype: project\ntitle: Widget\nbullets:\n- built it\n")
    e = repo.get_entry("widget")
    e["title"] = "Widget 2"
    repo.save_entry("widget", e)
    assert "# my note" in path.read_text()
    assert repo.get_entry("widget")["title"] == "Widget 2"


def test_gitops_checkpoint_log_revert(repo):
    root = repo.root
    (root / "db" / "x.yaml").write_text("type: skill\ntitle: X\n")
    sha = gitops.checkpoint(root, "db", "add x")
    assert sha
    assert gitops.checkpoint(root, "db", "nothing changed") is None
    entries = gitops.log(root, "db")
    assert entries[0]["subject"] == "db: add x"
    gitops.revert(root, sha)
    assert not (root / "db" / "x.yaml").exists()


def test_gitops_scope_isolation(repo):
    root = repo.root
    (root / "applications" / "a1").mkdir()
    (root / "applications" / "a1" / "jd.md").write_text("jd")
    (root / "db" / "y.yaml").write_text("type: skill\ntitle: Y\n")
    gitops.checkpoint(root, "app:a1", "app change")
    # db change must still be uncommitted (scopes never overlap)
    assert gitops.is_dirty(root, "db")
    assert not gitops.is_dirty(root, "app:a1")


def test_checkpoint_attribution_is_per_file(repo):
    """Parallel saves used to fold into one another's commits, so undoing one
    entry could revert unrelated entries."""
    root = repo.root
    errs = []

    def save(i):
        try:
            repo.save_entry(f"attr-{i}", {"type": "skill", "title": f"Attr {i}"})
        except Exception as e:  # pragma: no cover
            errs.append(e)

    threads = [threading.Thread(target=save, args=(i,)) for i in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert not errs
    subjects = [e["subject"] for e in gitops.log(root, "db")]
    for i in range(8):
        assert f"db: save entry attr-{i}" in subjects  # one commit each, none folded


def test_checkpoint_survives_files_moving_mid_add(repo):
    """`git add` walking a directory while another request deletes a file used
    to abort the whole command and lose the checkpoint."""
    root = repo.root
    scratch = root / "db" / "scratch"
    scratch.mkdir()
    stop = threading.Event()

    def churn():
        i = 0
        while not stop.is_set():
            f = scratch / f"f{i % 5}.yaml"
            f.write_text("type: skill\ntitle: X\n")
            f.unlink(missing_ok=True)
            i += 1

    t = threading.Thread(target=churn, daemon=True)
    t.start()
    try:
        for i in range(15):
            repo.save_memory(f"memory {i}")  # must not raise despite the churn
    finally:
        stop.set()
        t.join(timeout=2)


def test_gitops_concurrent_checkpoints(repo):
    """The per-repo lock keeps parallel checkpoints from corrupting the index."""
    root = repo.root
    errs = []

    def work(i):
        try:
            (root / "db" / f"c{i}.yaml").write_text(f"type: skill\ntitle: C{i}\n")
            gitops.checkpoint(root, "db", f"add c{i}")
        except Exception as e:  # pragma: no cover
            errs.append(e)

    threads = [threading.Thread(target=work, args=(i,)) for i in range(6)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert not errs
    committed = subprocess.run(
        ["git", "-C", str(root), "ls-files", "db/"], capture_output=True, text=True
    ).stdout
    for i in range(6):
        assert f"db/c{i}.yaml" in committed


def test_config_defaults_merge_validate(tmp_path, monkeypatch):
    cfg_path = tmp_path / "cfg.json"
    monkeypatch.setattr(config, "CONFIG_PATH", cfg_path)
    cfg = config.load()
    assert cfg["agent_provider"] == "claude"
    cfg["models"]["chat"] = "opus"
    saved = config.save(cfg)
    assert saved["models"]["chat"] == "opus"
    # unknown keys in the stored file are ignored, not fatal
    stored = json.loads(cfg_path.read_text())
    stored["long_gone_key"] = True
    cfg_path.write_text(json.dumps(stored))
    assert config.load()["models"]["chat"] == "opus"


def test_config_rejects_bad_values(tmp_path, monkeypatch):
    cfg_path = tmp_path / "cfg.json"
    monkeypatch.setattr(config, "CONFIG_PATH", cfg_path)
    with pytest.raises(config.ConfigError, match="agent_provider"):
        config.save({"agent_provider": "gpt"})
    cfg_path.write_text("{not json")
    with pytest.raises(config.ConfigError, match="not valid JSON"):
        config.load()


def test_init_refuses_nonempty_dir(tmp_path):
    root = tmp_path / "occupied"
    root.mkdir()
    (root / "something.txt").write_text("x")
    from resumedb.datarepo import DataRepoError

    with pytest.raises(DataRepoError, match="refusing"):
        init_datarepo(root)


def test_scaffold_and_sync(repo):
    root = repo.root
    assert (root / "CLAUDE.md").exists()
    assert (root / "AGENTS.md").exists()
    assert (root / ".gitignore").read_text().count(".resumedb/") == 1
    # retired skills get pruned, missing boilerplate restored
    retired = root / ".claude" / "skills" / "cover-letter"
    retired.mkdir(parents=True)
    (retired / "SKILL.md").write_text("old")
    (root / "CLAUDE.md").unlink()
    sync_boilerplate(root)
    assert not retired.exists()
    assert (root / "CLAUDE.md").exists()
    # sync is idempotent on .gitignore
    sync_boilerplate(root)
    assert (root / ".gitignore").read_text().count(".resumedb/") == 1


def test_proposal_flow(repo):
    (repo.root / "proposals" / "new-entry.yaml").write_text(
        "target: db/new-entry.yaml\ntype: project\ntitle: Thing\n"
    )
    (repo.root / "proposals" / "broken.yaml").write_text("target: [unclosed")
    props = repo.list_proposals()
    assert {p["name"] for p in props} == {"broken", "new-entry"}
    assert next(p for p in props if p["name"] == "broken")["error"]
    result = repo.approve_all_proposals()
    assert result["approved"] == ["new-entry"] and result["skipped"] == ["broken"]
    assert (repo.root / "db" / "new-entry.yaml").exists()
    repo.reject_proposal("broken")
    assert repo.list_proposals() == []
