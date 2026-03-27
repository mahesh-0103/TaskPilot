"""
Execution service.

Responsibilities:
 - Auto-execute pending tasks (simple demo agent).
 - Persist task state changes and create audit logs with decision_trace.
"""

from typing import List
from datetime import datetime

from models.schemas import Task, Log
from utils.helpers import new_id, now_iso
from utils import db


def execute_tasks(tasks: List[Task]):
    """Generator: execute tasks deterministically and yield logs one by one."""
    import time
    for task in tasks:
        if task.status not in ["pending", "healed"]:
            continue

        time.sleep(0.5)  # Simulate execution work for UI visibility
        ts = now_iso()
        # Enforce allowed transition: pending/healed -> completed
        db.update_task(task.task_id, {"status": "completed", "updated_at": ts})

        log = Log(
            log_id=new_id(),
            action="Task executed",
            reason="Auto execution by system",
            timestamp=ts,
            task_id=task.task_id,
            decision_trace="Rule: pending or healed → execute",
        )
        db.insert_log(log)
        yield log.model_dump_json() + "\n"
