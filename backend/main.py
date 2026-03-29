from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from routes import tasks, workflow, monitor, healing, logs, execution, calendar
import logging
import traceback
import threading
import time

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="TaskPilot – Autonomous Workflow Execution System",
    description="Converts meeting text into structured tasks, creates workflows, detects delays, and self-heals.",
    version="1.0.0"
)

# 1. CORS Middleware (Positioned first to wrap even the exception handler)
# We use ["*"] as requested to maximize reliability during debugging.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. GZIP Middleware (Temporarily disabled for CORS isolation)
# app.add_middleware(GZipMiddleware, minimum_size=1000)

# 3. Global Exception Handler for Diagnostics
# This captures any 500 errors and returns them as JSON instead of crashing.
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"GLOBAL_CRASH_DETAIL: {exc}\n{traceback.format_exc()}")
    # We must ensure CORS headers are present even in this response
    # Often, FastAPI's custom JSONResponse here will miss the middleware-injected headers
    # So we inject them manually if needed, but normally middleware should handle if ordered correctly.
    return JSONResponse(
        status_code=500,
        content={"detail": f"INTERNAL_SERVER_ERROR: {str(exc)}"},
    )

app.include_router(tasks.router, prefix="/tasks", tags=["Task Extraction"])
app.include_router(workflow.router, prefix="/workflow", tags=["Workflow"])
app.include_router(monitor.router, prefix="/monitor", tags=["Monitoring"])
app.include_router(healing.router, prefix="/healing", tags=["Self-Healing"])
app.include_router(logs.router, prefix="/logs", tags=["Audit Logs"])
app.include_router(execution.router, prefix="/execution", tags=["Execution"])
app.include_router(calendar.router, prefix="/calendar", tags=["Calendar & Email"])

from services.monitoring_service import monitor_tasks
from services.healing_service import run_healing_cycle

def autonomous_loop():
    """Background thread for continuous monitoring and healing."""
    logger = logging.getLogger("AutonomousLoop")
    logger.info("Autonomous Monitoring & Healing Loop Started.")
    import utils.db as db
    while True:
        try:
            logger.info("Running scheduled monitoring cycle...")
            logs = monitor_tasks() # Scans for delays/issues
            for log in logs:
                db.insert_log(log) # Persist background detections
                
            logger.info("Running scheduled healing cycle...")
            # Note: run_healing_cycle currently manages its own log insertion
            run_healing_cycle() 
        except Exception as e:
            logger.error(f"Error in autonomous loop: {e}")
        time.sleep(60)

@app.on_event("startup")
def startup_event():
    logger = logging.getLogger(__name__)
    logger.info("TaskPilot backend starting up...")
    # Start the continuous monitoring loop in a background thread
    thread = threading.Thread(target=autonomous_loop, daemon=True)
    thread.start()

@app.get("/", tags=["Health"])
def health_check():
    return {"status": "TaskPilot is running", "version": "1.0.0"}

@app.get("/tasks", tags=["Task Extraction"])
def get_all_tasks_endpoint():
    """Get all tasks from Supabase."""
    import utils.db as db
    tasks = db.get_all_tasks()
    return {"tasks": tasks}
