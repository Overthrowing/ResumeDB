from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .chat import router as chat_router
from .routes import router

app = FastAPI(title="ResumeDB")
app.include_router(router)
app.include_router(chat_router)

dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
if dist.is_dir():
    app.mount("/", StaticFiles(directory=dist, html=True), name="frontend")
