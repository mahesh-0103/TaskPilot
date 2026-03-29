from fastapi import APIRouter, HTTPException
from models.schemas import SimulateDelayRequest, SimulateDelayResponse, Task
from services.monitoring_service import simulate_delay, monitor_tasks, get_risk_assessment
from services import escalation_service

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
        # Step 4: Detect issue is implicit in call
        # Step 5: Escalate
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
        # Step 3, 4 and 5 are handled by monitor_tasks logic
        logs = monitor_tasks(tasks, token)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Monitoring protocol failure: {exc}")

    return {"logs": [l.model_dump() for l in logs]}
