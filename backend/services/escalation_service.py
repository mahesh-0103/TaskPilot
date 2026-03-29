"""
Escalation service for TaskPilot.
Handles Emailing, Notifying and Extending deadlines when issues are detected.
"""
import logging
from datetime import datetime, timezone
from services import google_service
from utils import db, helpers
from settings import settings

logger = logging.getLogger(__name__)

def escalate_task(task_id: str, token: str = None):
    """
    Perform smart multi-level escalation.
    Level 1: Notify Owner
    Level 2: Notify Dependents
    Level 3: Critical Priority + Suggested Reassignment
    Level 4: Managerial Escalation
    """
    task_row = db.get_task_by_id(task_id)
    if not task_row: return

    user_id = task_row.get("user_id")
    task_name = task_row.get("task")
    owner = task_row.get("owner")
    
    # ── Determine Escalation Level ──
    logs = db.get_all_logs()
    task_escalations = [l for l in logs if l.get("task_id") == task_id and l.get("action") == "System Escalation"]
    level = len(task_escalations) + 1
    ts = helpers.now_iso()

    action_taken = f"Level {level} Escalation"
    decision_trace = f"Escalation count: {len(task_escalations)}"
    
    if level == 1:
        # Level 1: Email Owner
        owner_email = db.get_user_email(user_id)
        if token and owner_email:
            subject = f"🚨 LVL1 ALERT: {task_name} Delayed"
            msg = f"Operator {owner},\n\nYour task '{task_name}' breached deadline. First warning logged."
            google_service.send_email(token, owner_email, subject, msg)
        decision_trace += " -> Action: Notify Owner"
        
    elif level == 2:
        # Level 2: Notify Dependents
        all_tasks = db.get_all_tasks()
        dependents = [t for t in all_tasks if task_id in (t.get("depends_on") or [])]
        for dep in dependents:
            dep_email = db.get_user_email(dep.get("user_id"))
            if token and dep_email:
                subject = f"⚠️ LVL2 UPSTREAM ALERT: {task_name} Blocked"
                msg = f"Attention {dep.get('owner')},\n\nUpstream task '{task_name}' is delayed. Recalibrate dependent nodes."
                google_service.send_email(token, dep_email, subject, msg)
        decision_trace += " -> Action: Notify Dependents"

    elif level == 3:
        # Level 3: Reassign + Critical
        db.update_task(task_id, {"priority": "high", "owner": "AUTO-REASSIGN-PENDING"})
        decision_trace += " -> Action: Priority -> HIGH + Reassign Flag"

    else:
        # Level 4: Managerial/Final Warning
        owner_email = db.get_user_email(user_id)
        if token and owner_email:
            subject = f"🛑 LVL4 CRITICAL: Managerial Escalation - {task_name}"
            msg = f"FINAL ALERT: Task '{task_name}' has repeated delays. Escalated to project governance."
            google_service.send_email(token, owner_email, subject, msg)
        decision_trace += " -> Action: Managerial Alert"

    # Always extend deadline slightly and log the level
    new_dl = helpers.extend_deadline(task_row.get("deadline"), 1)
    db.update_task(task_id, {"deadline": new_dl, "status": "delayed", "updated_at": ts})

    db.insert_log({
        "log_id": helpers.new_id(),
        "user_id": user_id,
        "action": "System Escalation",
        "reason": f"Level {level} Threshold",
        "timestamp": ts,
        "task_id": task_id,
        "decision_trace": decision_trace
    })
