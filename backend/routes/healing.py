from fastapi import APIRouter, HTTPException
from models.schemas import SelfHealRequest, SelfHealResponse
from services.healing_service import self_heal

router = APIRouter()


@router.post("/")
def self_heal_endpoint(body: SelfHealRequest):
    """
    Apply self-healing rules to all delayed tasks and persist changes.
    """
    if not body.tasks:
        raise HTTPException(status_code=400, detail="Task list must not be empty.")

    try:
        healed_tasks, _ = self_heal(body.tasks)
        
        if body.token:
            import utils.db as db
            from services.google_service import send_email
            seen_emails = {}
            for task in healed_tasks:
                if task.user_id:
                    if task.user_id not in seen_emails:
                        seen_emails[task.user_id] = db.get_user_email(task.user_id)
                    user_email = seen_emails[task.user_id]
                    if user_email:
                        msg_title = "Task Healed 🔄"
                        send_email(
                            body.token,
                            user_email,
                            msg_title,
                            f"{task.task} was healed. Owner: {task.owner}, Deadline: {task.deadline}."
                        )

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Self-heal failed: {exc}")

    return SelfHealResponse(tasks=healed_tasks)
