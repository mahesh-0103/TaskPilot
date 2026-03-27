from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from models.schemas import Task
from services.execution_service import execute_tasks

router = APIRouter()


@router.post("/execute-tasks")
def execute_tasks_endpoint(body: dict):
    """Execute pending tasks provided in the request body, streaming logs back."""
    try:
        raw = body.get("tasks", [])
        tasks = [Task(**r) for r in raw]
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid tasks payload: {exc}")

    return StreamingResponse(
        execute_tasks(tasks),
        media_type="text/plain",
        headers={"X-Accel-Buffering": "no"}
    )
