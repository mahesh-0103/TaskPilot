"""
Monitoring service.

Responsibilities:
  - Mark a task as 'delayed' by task_id (simulation endpoint).
  - Generate the corresponding audit log entry.
"""

from models.schemas import Task, Log
from utils.helpers import new_id, now_iso
from utils import db
from datetime import datetime


def simulate_delay(task_id: str) -> Log:
    """
    Set task.status = 'delayed' in the database and return a Log entry.
    Raises ValueError if the task_id is not found.
    """
    row = db.get_task_by_id(task_id)
    if row is None:
        raise ValueError(f"Task '{task_id}' not found.")

    ts = now_iso()
    db.update_task(task_id, {"status": "delayed", "updated_at": ts})

    log = Log(
        log_id=new_id(),
        user_id=row.get("user_id"),          # propagate from task row
        action="Task delayed",
        reason="Manual simulation",
        timestamp=ts,
        task_id=task_id,
        decision_trace="Manual: simulate_delay endpoint",
    )
    db.insert_log(log)
    return log


def monitor_tasks(tasks: list) -> list:
    """
    Automatic delay detection over a provided list of Task dicts.
    Marks tasks as 'delayed' when current_time > deadline and status != 'completed'.
    Returns list of Log objects created.
    """
    logs = []
    from datetime import timezone
    now = datetime.now(timezone.utc).date()
    for task in tasks:
        # parse deadline date portion
        try:
            dl_date = datetime.fromisoformat(task.deadline).date()
        except Exception:
            # skip if cannot parse
            continue

        if now > dl_date and task.status != "completed":
            ts = now_iso()
            # persist status change
            db.update_task(task.task_id, {"status": "delayed", "updated_at": ts})
            log = Log(
                log_id=new_id(),
                user_id=getattr(task, "user_id", None),  # propagate from task
                action="Delay detected",
                reason="Deadline exceeded",
                timestamp=ts,
                task_id=task.task_id,
                decision_trace="Rule: current_time > deadline",
            )
            db.insert_log(log)
            logs.append(log)

    return logs
