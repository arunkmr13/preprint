"""
FastAPI server wrapping the existing pipeline.
Provides REST endpoints + SSE log streaming for the frontend dashboard.

Run from inside fetch-data-from-s3/:
    uvicorn api.server:app --reload --port 8000
"""

import sys
import json
import asyncio
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# Make sure the pipeline modules are importable
sys.path.insert(0, str(Path(__file__).parent.parent))

# ---------------------------------------------------------------------------
# In-memory run store (persisted to runs.json next to this file)
# ---------------------------------------------------------------------------

RUNS_FILE = Path(__file__).parent / "runs.json"


def _load_runs() -> List[Dict]:
    if RUNS_FILE.exists():
        try:
            return json.loads(RUNS_FILE.read_text())
        except Exception:
            return []
    return []


def _save_runs(runs: List[Dict]):
    RUNS_FILE.write_text(json.dumps(runs, indent=2, default=str))


runs_store: List[Dict] = _load_runs()

# run_id -> asyncio.Queue of log lines (for SSE streaming)
log_queues: Dict[str, asyncio.Queue] = {}


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class RunRequest(BaseModel):
    platform: str           # "biorxiv" | "medrxiv"
    start_month: str        # "01-2024"
    end_month: Optional[str] = None
    resume: bool = True
    local_only: bool = False
    cleanup: bool = False
    clear_checkpoint: bool = False
    download_workers: int = 1


class RunSummary(BaseModel):
    run_id: str
    platform: str
    start_month: str
    end_month: str
    status: str             # "running" | "completed" | "failed" | "interrupted"
    started_at: str
    finished_at: Optional[str] = None
    duration_seconds: Optional[float] = None
    stats: Optional[Dict] = None
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(title="Preprint Pipeline API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Log capture handler — bridges Python logging → asyncio Queue
# ---------------------------------------------------------------------------

import logging

class QueueLogHandler(logging.Handler):
    """Sends log records into an asyncio Queue for SSE streaming."""

    def __init__(self, queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
        super().__init__()
        self.queue = queue
        self.loop = loop

    def emit(self, record: logging.LogRecord):
        msg = {
            "time": datetime.utcnow().strftime("%H:%M:%S"),
            "level": record.levelname,
            "message": self.format(record),
        }
        try:
            self.loop.call_soon_threadsafe(self.queue.put_nowait, msg)
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Background pipeline runner
# ---------------------------------------------------------------------------

async def _run_pipeline(run_id: str, req: RunRequest):
    """Executes the pipeline in a thread so it doesn't block the event loop."""
    loop = asyncio.get_event_loop()
    queue = log_queues[run_id]

    # Attach queue handler to the root logger so all pipeline logs stream
    handler = QueueLogHandler(queue, loop)
    handler.setFormatter(logging.Formatter("%(message)s"))
    root_logger = logging.getLogger()
    root_logger.addHandler(handler)

    def _run():
        from src.pipeline import get_pipeline
        from utils.checkpoint import get_checkpoint_manager
        from config.config import get_config

        config = get_config()
        end_month = req.end_month or req.start_month

        if req.clear_checkpoint:
            cp = get_checkpoint_manager(req.platform)
            cp.clear_checkpoint()

        pipeline = get_pipeline(req.platform, run_id)
        return pipeline.run(
            start_month=req.start_month,
            end_month=end_month,
            resume=req.resume,
            cleanup_after=req.cleanup,
            local_only=req.local_only,
            download_worker=req.download_workers,
        )

    # Find the run record
    run = next((r for r in runs_store if r["run_id"] == run_id), None)
    if not run:
        return

    try:
        result = await loop.run_in_executor(None, _run)
        run["status"] = "completed" if result.get("success") else "failed"
        run["finished_at"] = datetime.utcnow().isoformat()
        run["duration_seconds"] = result.get("duration_seconds")
        run["stats"] = result
    except Exception as e:
        run["status"] = "failed"
        run["finished_at"] = datetime.utcnow().isoformat()
        run["error"] = str(e)
    finally:
        root_logger.removeHandler(handler)
        # Signal SSE stream to close
        await queue.put(None)
        _save_runs(runs_store)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}


@app.post("/runs", response_model=RunSummary, status_code=201)
async def create_run(req: RunRequest):
    """Start a new pipeline run."""
    if req.platform not in ("biorxiv", "medrxiv"):
        raise HTTPException(400, "platform must be biorxiv or medrxiv")

    run_id = datetime.utcnow().strftime("%Y%m%d_%H%M%S") + "_" + uuid.uuid4().hex[:4]
    end_month = req.end_month or req.start_month

    run: Dict = {
        "run_id": run_id,
        "platform": req.platform,
        "start_month": req.start_month,
        "end_month": end_month,
        "status": "running",
        "started_at": datetime.utcnow().isoformat(),
        "finished_at": None,
        "duration_seconds": None,
        "stats": None,
        "error": None,
        "config": req.model_dump(),
    }

    runs_store.insert(0, run)
    _save_runs(runs_store)

    log_queues[run_id] = asyncio.Queue()
    asyncio.create_task(_run_pipeline(run_id, req))

    return RunSummary(**run)


@app.get("/runs", response_model=List[RunSummary])
def list_runs():
    """List all runs, newest first."""
    return [RunSummary(**r) for r in runs_store]


@app.get("/runs/{run_id}", response_model=RunSummary)
def get_run(run_id: str):
    run = next((r for r in runs_store if r["run_id"] == run_id), None)
    if not run:
        raise HTTPException(404, "Run not found")
    return RunSummary(**run)


@app.delete("/runs/{run_id}")
def delete_run(run_id: str):
    global runs_store
    runs_store = [r for r in runs_store if r["run_id"] != run_id]
    _save_runs(runs_store)
    return {"deleted": run_id}


@app.get("/runs/{run_id}/logs")
async def stream_logs(run_id: str):
    """SSE endpoint — streams live log lines while the run is active."""
    run = next((r for r in runs_store if r["run_id"] == run_id), None)
    if not run:
        raise HTTPException(404, "Run not found")

    queue = log_queues.get(run_id)

    async def event_generator():
        # If run already finished and no queue, yield stored stats and close
        if not queue:
            data = json.dumps({"type": "done", "status": run["status"]})
            yield f"data: {data}\n\n"
            return

        while True:
            try:
                msg = await asyncio.wait_for(queue.get(), timeout=30)
            except asyncio.TimeoutError:
                yield "data: {\"type\":\"ping\"}\n\n"
                continue

            if msg is None:
                # Pipeline finished
                updated = next((r for r in runs_store if r["run_id"] == run_id), run)
                data = json.dumps({"type": "done", "status": updated["status"], "stats": updated.get("stats")})
                yield f"data: {data}\n\n"
                break

            data = json.dumps({"type": "log", **msg})
            yield f"data: {data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/checkpoint/{platform}")
def get_checkpoint(platform: str):
    """Read checkpoint status for a platform."""
    try:
        sys.path.insert(0, str(Path(__file__).parent.parent))
        from utils.checkpoint import get_checkpoint_manager
        cp = get_checkpoint_manager(platform)
        return {
            "platform": platform,
            "processed_count": cp.get_processed_count(),
        }
    except Exception as e:
        raise HTTPException(500, str(e))


@app.delete("/checkpoint/{platform}")
def clear_checkpoint(platform: str):
    """Clear checkpoint for a platform."""
    try:
        from utils.checkpoint import get_checkpoint_manager
        cp = get_checkpoint_manager(platform)
        cp.clear_checkpoint()
        return {"cleared": platform}
    except Exception as e:
        raise HTTPException(500, str(e))
