from types import SimpleNamespace

from resumedb import config
from resumedb.chat import _http_base


def test_deployment_origins_include_local_and_configured(monkeypatch):
    monkeypatch.setenv(
        "RESUMEDB_ALLOWED_ORIGINS",
        "https://resumedb.vercel.app/, https://preview.example.com",
    )

    origins = config.allowed_origins()

    assert "http://localhost:5173" in origins
    assert "https://resumedb.vercel.app" in origins
    assert "https://preview.example.com" in origins


def test_origin_validation_supports_web_and_extension(monkeypatch):
    monkeypatch.setenv("RESUMEDB_ALLOWED_ORIGINS", "https://resumedb.vercel.app")
    monkeypatch.setenv(
        "RESUMEDB_ALLOWED_ORIGIN_REGEX",
        r"https://resumedb-[a-z0-9-]+\.vercel\.app",
    )

    assert config.origin_is_allowed("https://resumedb.vercel.app")
    assert config.origin_is_allowed("https://resumedb-feature-123.vercel.app")
    assert config.origin_is_allowed("chrome-extension://abcdefghijklmnop")
    assert config.origin_is_allowed(None)
    assert not config.origin_is_allowed("https://untrusted.example")


def test_agent_api_base_respects_forwarded_https():
    websocket = SimpleNamespace(
        headers={
            "host": "resumedb.up.railway.app",
            "x-forwarded-proto": "https",
        },
        url=SimpleNamespace(scheme="ws"),
    )

    assert _http_base(websocket) == "https://resumedb.up.railway.app"
