from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import tasks, workflow, monitor, healing, logs, execution, calendar
import logging

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="TaskPilot – Autonomous Workflow Execution System",
    description="Converts meeting text into structured tasks, creates workflows, detects delays, and self-heals.",
    version="1.0.0"
)

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


@app.on_event("startup")
def startup_event():
    logger = logging.getLogger(__name__)
    logger.info("TaskPilot backend starting up...")


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "TaskPilot is running", "version": "1.0.0"}


@app.get("/tasks", tags=["Task Extraction"])
def get_all_tasks_endpoint():
    """Get all tasks from Supabase."""
    import utils.db as db
    tasks = db.get_all_tasks()
    return {"tasks": tasks}
