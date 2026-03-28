"""
Execution service for TaskPilot.
Handles the autonomous completion of dispatches.
"""
import logging
from typing import List
from models.schemas import Task, Log
from utils import db, helpers

logger = logging.getLogger(__name__)

def execute_tasks(tasks: List[Task]) -> List[Log]:
    """
    Step 7: Execute. 
    IF status == pending → mark completed → trigger next dependent task.
    Returns generated logs as a list.
    """
    logs = []
    ts = helpers.now_iso()
    
    # Pre-build a simple adjacency list of task dependencies from DB
    all_tasks_db = db.get_all_tasks()
    dependents_map = {}
    for t in all_tasks_db:
        t_id = t["task_id"]
        for dep in (t.get("depends_on") or []):
            if dep not in dependents_map:
                dependents_map[dep] = []
            dependents_map[dep].append(t_id)

    for task in tasks:
        # Step 7.1: Check if status is pending (only pending/healed can be executed)
        if task.status not in ["pending"]:
            continue
            
        # ── Step 7.2: Mark completed ───────────────────────────────────────
        logger.info(f"Executing dispatch: {task.task_id} (pending → completed)")
        db.update_task(task.task_id, {"status": "completed", "updated_at": ts})
        
        log = Log(
            log_id=helpers.new_id(),
            user_id=task.user_id,
            action="Task executed",
            reason="Manual dispatch by user",
            timestamp=ts,
            task_id=task.task_id,
            decision_trace="Action: mark completed && trigger next check"
        )
        db.insert_log(log)
        logs.append(log)
        
        # ── Step 7.3: Check if next dependent tasks are now unblocked ──────
        next_ids = dependents_map.get(task.task_id, [])
        for n_id in next_ids:
            logger.info(f"Signaling next task: {n_id} (parent completed)")
            log_n = Log(
                log_id=helpers.new_id(),
                user_id=task.user_id,
                action="Signaled dependent",
                reason=f"Parent {task.task_id} completed",
                timestamp=ts,
                task_id=n_id,
                decision_trace=f"Rule: parent {task.task_id} completed → signal {n_id}"
            )
            db.insert_log(log_n)
            logs.append(log_n)

    return logs
