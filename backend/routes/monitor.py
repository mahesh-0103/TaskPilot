from fastapi import APIRouter, HTTPException
from models.schemas import SimulateDelayRequest, SimulateDelayResponse, Task
from services.monitoring_service import simulate_delay, monitor_tasks, get_risk_assessment
from services import escalation_service
from utils import db, helpers

router = APIRouter()

@router.get("/risk/{user_id}")
def predictive_risk_endpoint(user_id: str):
    """
    PREDICTIVE: Returns estimated risk level (low/medium/high) for this workflow.
    """
    try:
        risk = get_risk_assessment(user_id)
        return risk
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/simulate-delay", response_model=SimulateDelayResponse)
def simulate_delay_endpoint(body: SimulateDelayRequest):
    """
    Step 4/5: Manually trigger an issue detection and escalation sequence.
    """
    try:
        escalation_service.escalate_task(body.task_id, body.token)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to trigger escalation: {exc}")

    return SimulateDelayResponse(message="Escalation sequence transmitted")

@router.post("/monitor")
def monitor_endpoint(body: dict):
    """
    Step 3: Monitor runs. Inspects tasks, detects breaches, and triggers Step 5 (Escalation).
    """
    try:
        raw = body.get("tasks", [])
        tasks = [Task(**r) for r in raw]
        token = body.get("token")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid payload: {exc}")

    try:
        logs = monitor_tasks(tasks, token)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Monitoring protocol failure: {exc}")

    return {"logs": [l.model_dump() for l in logs]}


@router.post("/self-heal/trigger")
def trigger_self_heal(body: dict):
    """
    Immediately trigger self-healing for a specific delayed task.
    Called when user manually flags a task as delayed via the UI.
    """
    task_id = body.get("task_id")
    user_id = body.get("user_id")
    
    if not task_id:
        raise HTTPException(status_code=400, detail="task_id is required.")
    
    try:
        ts = helpers.now_iso()
        
        # Mark task for healing — reset to pending to re-enter the execution queue
        db.update_task(task_id, {"status": "pending", "updated_at": ts})
        
        # Insert self-heal log entry
        from models.schemas import Log
        heal_log = Log(
            log_id=helpers.new_id(),
            user_id=user_id,
            action="Self-Heal Triggered",
            reason="User flagged task as delayed — autonomous remediation initiated",
            timestamp=ts,
            task_id=task_id,
            decision_trace="Rule: status=delayed → reset to pending → re-queue for execution"
        )
        db.insert_log(heal_log)
        
        return {"status": "healing", "task_id": task_id, "message": "Self-heal protocol initiated. Task re-queued."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Self-heal failed: {e}")
