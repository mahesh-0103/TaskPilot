from fastapi import APIRouter, HTTPException, BackgroundTasks
from models.schemas import ExtractTasksRequest, ExtractTasksResponse
from services.extraction_service import extract_tasks
from services.google_service import create_calendar_event
from utils import db

router = APIRouter()

def sync_calendar_background(token: str, tasks_list: list):
    for task_data in tasks_list:
        if task_data.get("deadline") and task_data.get("deadline") != "unknown":
             create_calendar_event(token, task_data, auto_schedule=True)

@router.post("/extract-tasks", response_model=ExtractTasksResponse)
def extract_tasks_endpoint(body: ExtractTasksRequest, background_tasks: BackgroundTasks):
    """
    Extract structured tasks and persist.
    Schedules calendar sync in background to avoid latency.
    """
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Input text must not be empty.")

    try:
        tasks = extract_tasks(body.text)
        for task in tasks:
            task.user_id = body.user_id
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {exc}")

    # Persist immediately
    db.upsert_tasks(tasks)

    # Sync to Calendar in background if token exists
    if body.token and tasks:
        tasks_raw = [t.model_dump() for t in tasks]
        background_tasks.add_task(sync_calendar_background, body.token, tasks_raw)

    return ExtractTasksResponse(tasks=tasks)
