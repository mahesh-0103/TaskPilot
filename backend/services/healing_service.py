"""
Self-Healing service.

Rules (deterministic, per spec):
  FOR each delayed task:
    IF depends_on is empty  → reassign owner to BACKUP_USER   → status: pending
    ELSE (has dependencies) → extend deadline by +1 day        → status: pending

The status is reset to 'pending' after healing (DB only accepts pending/completed/delayed).
"""

from typing import List, Tuple

from settings import settings
from models.schemas import Task, Log
from utils.helpers import new_id, now_iso, extend_deadline
import utils.db as db


def self_heal(tasks: List[Task]) -> Tuple[List[Task], List[Log]]:
    """
    Apply healing rules to the provided task list.
    Persists all changes and logs to Supabase.
    Returns (healed_tasks, generated_logs).
    """
    healed: List[Task] = []
    logs: List[Log] = []
    ts = now_iso()

    for task in tasks:
        if task.status != "delayed":
            healed.append(task)
            continue

        if not task.depends_on:
            # No dependencies → reassign to backup user
            new_owner = settings.BACKUP_USER if task.owner != settings.BACKUP_USER else task.owner
            updated_task = task.model_copy(update={
                "owner": new_owner,
                "status": "pending",      # reset — healed tasks go back to pending
                "updated_at": ts,
            })
            log = Log(
                log_id=new_id(),
                user_id=task.user_id,
                action="Task reassigned",
                reason="Delay without dependency",
                timestamp=ts,
                task_id=task.task_id,
                decision_trace="Rule: delayed && no depends_on → reassign owner to backup_user",
            )
        else:
            # Has dependencies → extend deadline by DEADLINE_EXTENSION_DAYS
            new_deadline = extend_deadline(task.deadline, settings.DEADLINE_EXTENSION_DAYS)
            updated_task = task.model_copy(update={
                "deadline": new_deadline,
                "status": "pending",      # reset — healed tasks go back to pending
                "updated_at": ts,
            })
            log = Log(
                log_id=new_id(),
                user_id=task.user_id,
                action="Deadline extended",
                reason="Dependent task delay",
                timestamp=ts,
                task_id=task.task_id,
                decision_trace=f"Rule: delayed && has dependency → extend by {settings.DEADLINE_EXTENSION_DAYS}d",
            )

        healed.append(updated_task)
        logs.append(log)

    # Persist
    db.upsert_tasks(healed)
    for log in logs:
        db.insert_log(log)

    return healed, logs
