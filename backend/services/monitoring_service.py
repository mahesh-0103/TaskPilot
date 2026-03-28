"""
Monitoring service for TaskPilot.
Handles detection of delays, blocked tasks, missing owners and inactivity.
"""
import logging
from datetime import datetime, timezone
from models.schemas import Task, Log
from utils import db, helpers
from services import escalation_service

logger = logging.getLogger(__name__)

def monitor_tasks(tasks: list = None, token: str = None) -> list:
    """
    Scans all tasks to detect issues.
    If no task list is provided, it fetches from the database.
    Returns a list of created logs.
    """
    if tasks is None:
        tasks_raw = db.get_all_tasks()
    else:
        # Resolve Task objects to dicts for uniform processing
        tasks_raw = []
        for t in tasks:
            if hasattr(t, "model_dump"):
                tasks_raw.append(t.model_dump())
            elif isinstance(t, dict):
                tasks_raw.append(t)
            else:
                tasks_raw.append(dict(t))
        
    logs = []
    ts = helpers.now_iso()
    now_dt = datetime.now(timezone.utc)
    now_date = now_dt.date()
    
    # Pre-build a map of completed tasks for blocked check
    completed_ids = {t["task_id"] for t in tasks_raw if t.get("status") == "completed"}

    for task in tasks_raw:
        task_id = task.get("task_id")
        user_id = task.get("user_id")
        status = task.get("status")
        deadline_str = task.get("deadline")
        owner = task.get("owner")
        
        # ── 1. Detect: Deadline Breach ───────────────────────────────────
        try:
            if deadline_str:
                dl_date = datetime.fromisoformat(deadline_str).date()
                if now_date > dl_date and status != "completed" and status != "delayed":
                    logger.info(f"Threshold exceeded for {task_id}. Initializing Escalation...")
                    escalation_service.escalate_task(task_id, token)
                    logs.append(Log(
                        log_id=helpers.new_id(),
                        user_id=user_id,
                        action="Delay detected",
                        reason="Deadline exceeded",
                        timestamp=ts,
                        task_id=task_id,
                        decision_trace="Rule: current_time > deadline && status != completed → escalate"
                    ))
                    continue
        except (ValueError, TypeError):
            pass

        # ── 2. Detect: Missing Owners (Critical) ─────────────────────────
        if not owner or owner.lower() in ["unassigned", "strategy", "none"]:
             logs.append(Log(
                log_id=helpers.new_id(),
                user_id=user_id,
                action="Critical Alert",
                reason="Missing Node Operator",
                timestamp=ts,
                task_id=task_id,
                decision_trace="Rule: owner == 'unassigned' → alert for manual correction"
            ))

        # ── 3. Detect: Blocked tasks (Dependency check) ──────────────────
        depends_on = task.get("depends_on") or []
        if status == "pending" and depends_on:
            for dep_id in depends_on:
                if dep_id not in completed_ids:
                    logs.append(Log(
                        log_id=helpers.new_id(),
                        user_id=user_id,
                        action="Process Blocked",
                        reason=f"Waiting for upstream {dep_id}",
                        timestamp=ts,
                        task_id=task_id,
                        decision_trace=f"Rule: child {task_id} waiting for parent {dep_id}"
                    ))
                    break

        # ── 4. Detect: Inactivity (no update for e.g., 7 days) ───────────
        updated_at_str = task.get("updated_at")
        if updated_at_str:
            try:
                updated_at = datetime.fromisoformat(updated_at_str)
                if updated_at.tzinfo is None:
                    updated_at = updated_at.replace(tzinfo=timezone.utc)
                    
                diff = (now_dt - updated_at).days
                if diff > 7 and status == "pending":
                    logger.warning(f"Task {task_id} inactive for {diff} days. Escalating...")
                    escalation_service.escalate_task(task_id, token)
                    logs.append(Log(
                        log_id=helpers.new_id(),
                        user_id=user_id,
                        action="Inactivity detected",
                        reason=f"No updates for {diff} days",
                        timestamp=ts,
                        task_id=task_id,
                        decision_trace=f"Rule: inactive_days > 7 → escalate"
                    ))
            except (ValueError, TypeError):
                pass

    return logs

def simulate_delay(task_id: str, token: str = None) -> Log:
    """
    Manually trigger delay + escalation for testing.
    """
    escalation_service.escalate_task(task_id, token)
    ts = helpers.now_iso()
    task_row = db.get_task_by_id(task_id)
    log = Log(
        log_id=helpers.new_id(),
        user_id=task_row.get("user_id") if task_row else None,
        action="Task delayed (Simulation)",
        reason="Manual trigger",
        timestamp=ts,
        task_id=task_id,
        decision_trace="Manual: simulate_delay endpoint → escalate_task"
    )
    db.insert_log(log)
    return log
