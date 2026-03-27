from fastapi import APIRouter, HTTPException
from models.schemas import ExtractTasksRequest, ExtractTasksResponse
from services.extraction_service import extract_tasks
from utils import db

router = APIRouter()


@router.post("/extract-tasks", response_model=ExtractTasksResponse)
def extract_tasks_endpoint(body: ExtractTasksRequest):
    """
    Extract structured tasks from free-form meeting text using LLM / trained model.
    Persists extracted tasks to Supabase.
    """
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Input text must not be empty.")

    try:
        tasks = extract_tasks(body.text)
        # Set user_id on each task so DB constraint is met
        for task in tasks:
            task.user_id = body.user_id
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {exc}")

    # Persist to Supabase
    db.upsert_tasks(tasks)

    if body.token:
        from services.google_service import create_calendar_event
        for task in tasks:
            if task.deadline and task.deadline != "unknown":
                create_calendar_event(body.token, task.model_dump())

    return ExtractTasksResponse(tasks=tasks)
