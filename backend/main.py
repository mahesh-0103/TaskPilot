from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import tasks, workflow, monitor, healing, logs, execution, calendar
import logging

logging.basicConfig(level=logging.INFO)

from fastapi.middleware.gzip import GZipMiddleware

app = FastAPI(
    title="TaskPilot – Autonomous Workflow Execution System",
    description="Converts meeting text into structured tasks, creates workflows, detects delays, and self-heals.",
    version="1.0.0"
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router, prefix="/tasks", tags=["Task Extraction"])
app.include_router(workflow.router, prefix="/workflow", tags=["Workflow"])
app.include_router(monitor.router, prefix="/monitor", tags=["Monitoring"])
app.include_router(healing.router, prefix="/healing", tags=["Self-Healing"])
app.include_router(logs.router, prefix="/logs", tags=["Audit Logs"])
app.include_router(execution.router, prefix="/execution", tags=["Execution"])
app.include_router(calendar.router, prefix="/calendar", tags=["Calendar & Email"])


import threading
import time
from services.monitoring_service import monitor_tasks
from services.healing_service import run_healing_cycle

def autonomous_loop():
    """Background thread for continuous monitoring and healing."""
    logger = logging.getLogger("AutonomousLoop")
    logger.info("Autonomous Monitoring & Healing Loop Started.")
    while True:
        try:
            logger.info("Running scheduled monitoring cycle...")
            monitor_tasks() # Scans for delays/issues
            logger.info("Running scheduled healing cycle...")
            run_healing_cycle() # Heals detected issues
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
