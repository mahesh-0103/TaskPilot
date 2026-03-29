from fastapi import APIRouter, HTTPException
from models.schemas import Task
from services.execution_service import execute_tasks, execute_entire_workflow

router = APIRouter()

@router.post("/execute-tasks")
def execute_tasks_endpoint(body: dict):
    """
    Step 7: Execute pending tasks and trigger subsequent dependencies.
    """
    try:
        raw = body.get("tasks", [])
        tasks = [Task(**r) for r in raw]
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid dispatch payload: {exc}")

    try:
        # Step 7.2 & 7.3: Mark completed and trigger next checks
        logs = execute_tasks(tasks)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Execution protocol failure: {exc}")

    return {"logs": [l.model_dump() for l in logs]}

@router.post("/execute-workflow")
def execute_entire_workflow_endpoint(body: dict):
    """
    ONE-CLICK EXECUTE: Schedules all pending tasks and logs activation.
    """
    user_id = body.get("user_id")
    token = body.get("token")
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing user_id")
    
    try:
        logs = execute_entire_workflow(user_id, token)
        return {"status": "success", "logs": [l.model_dump() for l in logs]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
