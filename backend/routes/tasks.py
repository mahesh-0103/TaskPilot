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

    # Persist immediately with explicit user linkage
    db.upsert_tasks(tasks, user_id=body.user_id)

    # Sync to Calendar in background if token exists
    if body.token and tasks:
        tasks_raw = [t.model_dump() for t in tasks]
        background_tasks.add_task(sync_calendar_background, body.token, tasks_raw)

    return ExtractTasksResponse(tasks=tasks)


@router.post("/update/{task_id}")
def update_task_endpoint(task_id: str, body: dict):
    """
    Update individual task fields. Uses service role to bypass RLS.
    Called by the frontend workflowStore to ensure schema-safe updates.
    """
    # Strip reserved/unknown cols before update
    user_id = body.pop("user_id", None)
    body.pop("email", None)
    body.pop("token", None)
    
    try:
        db.update_task(task_id, body, user_id=user_id)
        return {"status": "updated", "task_id": task_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {e}")
