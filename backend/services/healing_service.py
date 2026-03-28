"""
Self-Healing service for TaskPilot.
Handles automatic correction of stalled workflows.
"""
import logging
from typing import List, Tuple
from models.schemas import Task, Log
from utils import db, helpers
from settings import settings

logger = logging.getLogger(__name__)

def self_heal(tasks: List[Task], token: str = None) -> Tuple[List[Task], List[Log]]:
    """
    Performs Phase 6 healing on all delayed tasks.
    IF no dependency → reassign owner to backup_user.
    ELSE → extend deadline by DEADLINE_EXTENSION_DAYS.
    """
    healed: List[Task] = []
    logs: List[Log] = []
    ts = helpers.now_iso()

    for task in tasks:
        # Step 6: Identify delayed tasks
        if task.status != "delayed":
            healed.append(task)
            continue

        # ── Step 6.1: Check dependencies ──────────────────────────────────────
        if not task.depends_on:
            # Rule: delayed && no depends_on → reassign owner to backup_user
            logger.info(f"Self-Heal: Reassigning {task.task_id} from {task.owner} to {settings.BACKUP_USER}")
            updated_task = task.model_copy(update={
                "owner": settings.BACKUP_USER if task.owner != settings.BACKUP_USER else task.owner,
                "status": "pending",      # status must return to pending
                "updated_at": ts,
            })
            log = Log(
                log_id=helpers.new_id(),
                user_id=task.user_id,
                action="Task reassigned",
                reason="Delay without dependency detected",
                timestamp=ts,
                task_id=task.task_id,
                decision_trace="Rule: delayed && no depends_on → reassign owner to backup_user (pending)"
            )
        else:
            # Rule: delayed && has dependency → extend deadline
            new_dl = helpers.extend_deadline(task.deadline, settings.DEADLINE_EXTENSION_DAYS)
            logger.info(f"Self-Heal: Extending deadline for {task.task_id} to {new_dl}")
            updated_task = task.model_copy(update={
                "deadline": new_dl,
                "status": "pending",      # status must return to pending
                "updated_at": ts,
            })
            log = Log(
                log_id=helpers.new_id(),
                user_id=task.user_id,
                action="Deadline extended",
                reason="Dependent task delay detected",
                timestamp=ts,
                task_id=task.task_id,
                decision_trace=f"Rule: delayed && has dependency → extend by {settings.DEADLINE_EXTENSION_DAYS}d (pending)"
            )

        healed.append(updated_task)
        logs.append(log)

    # ── Step 6.2: Persist ───────────────────────────────────────────────────
    db.upsert_tasks(healed)
    for log in logs:
        db.insert_log(log)

    return healed, logs
