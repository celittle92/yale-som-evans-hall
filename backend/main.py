"""FastAPI backend for the Evans Hall professor agents.

Run from the backend/ directory:
    .venv/bin/uvicorn main:app --port 8000 --reload
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import agents
from professors import PROFESSORS

log = logging.getLogger("uvicorn.error")

app = FastAPI(title="Evans Hall Faculty", version="0.1.0")

# The Vite dev server; the browser calls the backend through its /api proxy, but allow the
# direct origins too so the API is usable from a plain fetch while debugging.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    professor_id: str = Field(min_length=1, max_length=40)
    message: str = Field(min_length=1, max_length=4000)
    session_id: str = Field(default="anon", min_length=1, max_length=80)


class ChatResponse(BaseModel):
    reply: str


@app.get("/api/health")
def health() -> dict:
    """Config sanity check. Reports the model name, never a key."""
    try:
        return {"ok": True, "model": agents.model_name(), "professors": len(PROFESSORS)}
    except Exception as exc:  # missing key, unreadable .env
        return {"ok": False, "error": str(exc)}


@app.get("/api/professors")
def list_professors() -> list[dict]:
    return [
        {"id": p.id, "name": p.name, "room": p.room, "course_number": p.course_number}
        for p in PROFESSORS.values()
    ]


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    if req.professor_id not in PROFESSORS:
        raise HTTPException(status_code=404, detail=f"No professor {req.professor_id!r}")
    try:
        reply = await agents.ask(req.professor_id, req.message, req.session_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        # Log the detail server-side; hand the browser something safe and useful.
        log.exception("agent turn failed for %s", req.professor_id)
        raise HTTPException(
            status_code=502,
            detail=f"The model call failed ({type(exc).__name__}). Check the backend log.",
        ) from exc
    return ChatResponse(reply=reply)


@app.post("/api/chat/reset")
def reset(req: ChatRequest) -> dict:
    agents.reset(req.professor_id, req.session_id)
    return {"ok": True}
