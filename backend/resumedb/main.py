from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .chat import router as chat_router
from .config import ConfigError
from .datarepo import DataRepoError
from .gitops import GitError
from .providers import AgentError
from .routes import router

app = FastAPI(title="ResumeDB")

# Dev frontend origin only. No credentials, so this is CORS-valid (the old
# allow_origins=["*"] + allow_credentials=True combination is rejected by
# browsers). The built frontend is served same-origin below and needs no CORS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _envelope(status: int, error: str, detail: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": error, "detail": detail})


@app.exception_handler(HTTPException)
async def http_error(request: Request, exc: HTTPException):
    return _envelope(exc.status_code, "http_error", str(exc.detail))


@app.exception_handler(DataRepoError)
async def datarepo_error(request: Request, exc: DataRepoError):
    return _envelope(400, "datarepo_error", str(exc))


@app.exception_handler(GitError)
async def git_error(request: Request, exc: GitError):
    return _envelope(500, "git_error", str(exc))


@app.exception_handler(ConfigError)
async def config_error(request: Request, exc: ConfigError):
    return _envelope(500, "config_error", str(exc))


@app.exception_handler(AgentError)
async def agent_error(request: Request, exc: AgentError):
    return _envelope(503, "agent_error", str(exc))


@app.exception_handler(Exception)
async def unhandled_error(request: Request, exc: Exception):
    return _envelope(500, "internal_error", f"{type(exc).__name__}: {exc}")


app.include_router(router)
app.include_router(chat_router)

dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
if dist.is_dir():
    app.mount("/", StaticFiles(directory=dist, html=True), name="frontend")
