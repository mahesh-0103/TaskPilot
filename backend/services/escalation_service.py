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
    Perform escalation steps for an individual task.
    1. Email the owner (John).
    2. Notify dependent task owners (Sarah).
    3. Push to secondary notification emails.
    """
    task_row = db.get_task_by_id(task_id)
    if not task_row:
        return

    ts = helpers.now_iso()
    user_id = task_row.get("user_id")
    owner = task_row.get("owner")
    task_name = task_row.get("task")
    deadline = task_row.get("deadline")
    
    # ── 1. Email John (the owner of the delayed task) ────────────────────────
    # We try to find the email if user_id is linked to profiles
    owner_email = None
    if user_id:
        owner_email = db.get_user_email(user_id)
    
    if token and owner_email:
        subject = f"🚨 TASKPILOT ALERT: Task Delayed - {task_name}"
        message = f"Hello {owner},\n\nYour task '{task_name}' has exceeded its deadline ({deadline}).\nThe system is initiating recovery protocols."
        google_service.send_email(token, owner_email, subject, message)
    
    # ── 2. Notify Sarah (Dependent task owners) ──────────────────────────────
    # Sarah is someone who depends on this delayed task.
    all_tasks = db.get_all_tasks()
    dependents = [t for t in all_tasks if task_id in (t.get("depends_on") or [])]
    
    for dep in dependents:
        dep_owner = dep.get("owner")
        dep_user_id = dep.get("user_id")
        dep_email = db.get_user_email(dep_user_id) if dep_user_id else None
        
        if token and dep_email:
            dep_subject = f"⚠️ UPSTREAM ALERT: {task_name} Delayed"
            dep_msg = f"Hello {dep_owner},\n\nYour task '{dep.get('task')}' is currently blocked because its dependency '{task_name}' has been delayed.\nSystem is recalibrating."
            google_service.send_email(token, dep_email, dep_subject, dep_msg)
            
        logger.info(f"Notifying dependent owner {dep_owner} about parent delay of {task_id}")
        log = {
            "log_id": helpers.new_id(),
            "user_id": user_id,
            "action": "Dependent notified",
            "reason": f"Upstream task {task_id} delayed",
            "timestamp": ts,
            "task_id": dep.get("task_id"),
            "decision_trace": f"Rule: parent {task_id} delayed → notify {dep_owner}"
        }
        db.insert_log(log)

    # ── 3. Notify secondary emails ───────────────────────────────────────────
    secondary_emails = task_row.get("notification_emails") or []
    if token and secondary_emails:
        subject = f"⚠️ TaskPilot Escalation: {task_name}"
        message = f"Escalation Report: Task '{task_name}' (Owner: {owner}) is officially DELAYED.\nAudit path: HEAL-PROTOCOL-DETECTION"
        for email in secondary_emails:
            google_service.send_email(token, email, subject, message)

    # ── 4. Extend deadline (+1 day) as part of escalation ────────────────────
    new_dl = helpers.extend_deadline(deadline, 1)
    db.update_task(task_id, {"deadline": new_dl, "status": "delayed", "updated_at": ts})

    # Log escalation decision
    log = {
        "log_id": helpers.new_id(),
        "user_id": user_id,
        "action": "System Escalation",
        "reason": "Deadline breached",
        "timestamp": ts,
        "task_id": task_id,
        "decision_trace": "Action: Email owner + Notify dependents + Extend 1d"
    }
    db.insert_log(log)
