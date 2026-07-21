import asyncio
from contextlib import AsyncExitStack, asynccontextmanager, suppress
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import config
from .chat import router as chat_router
from .mcp_server import mcp_app, mcp_server
from .routes import router
from .scheduler import discovery_loop


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with AsyncExitStack() as stack:
        await stack.enter_async_context(mcp_server.session_manager.run())
        task = asyncio.create_task(discovery_loop())
        try:
            yield
        finally:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task


app = FastAPI(title="ResumeDB", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.allowed_origins(),
    allow_origin_regex=config.allowed_origin_regex(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(chat_router)
app.mount("/mcp", mcp_app, name="mcp")

dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
if dist.is_dir():
    app.mount("/", StaticFiles(directory=dist, html=True), name="frontend")
