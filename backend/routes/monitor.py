from fastapi import APIRouter, HTTPException
from models.schemas import SimulateDelayRequest, SimulateDelayResponse, Task
from services.monitoring_service import simulate_delay, monitor_tasks

router = APIRouter()


@router.post("/simulate-delay", response_model=SimulateDelayResponse)
def simulate_delay_endpoint(body: SimulateDelayRequest):
    """
    Mark a task as 'delayed' and record an audit log entry.
    """
    try:
        simulate_delay(body.task_id)
        
        if body.token:
            import utils.db as db
            from services.google_service import send_email
            task = db.get_task_by_id(body.task_id)
            if task and task.get("user_id"):
                user_email = db.get_user_email(task.get("user_id"))
                if user_email:
                    send_email(
                        body.token,
                        user_email,
                        "Task Delayed ⚠️",
                        f"{task.get('task')} has been delayed."
                    )
                    
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to simulate delay: {exc}")

    return SimulateDelayResponse(message="Task marked as delayed")


@router.post("/monitor")
def monitor_endpoint(body: dict):
    """Automatic monitoring endpoint: inspects provided tasks and creates delay logs."""
    try:
        raw = body.get("tasks", [])
        tasks = [Task(**r) for r in raw]
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid tasks payload: {exc}")

    try:
        logs = monitor_tasks(tasks)
        token = body.get("token")
        if token and logs:
            import utils.db as db
            from services.google_service import send_email
            seen_emails = {}
            for log in logs:
                uid = log.user_id
                if uid:
                    if uid not in seen_emails:
                        seen_emails[uid] = db.get_user_email(uid)
                    email_addr = seen_emails[uid]
                    if email_addr:
                        task = next((t for t in tasks if t.task_id == log.task_id), None)
                        task_name = task.task if task else log.task_id
                        send_email(
                            token,
                            email_addr,
                            "Task Delayed ⚠️",
                            f"Task '{task_name}' has been automatically marked as delayed due to deadline."
                        )
                        
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Monitoring failed: {exc}")

    return {"logs": [l.model_dump() for l in logs]}
