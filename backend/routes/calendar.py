"""
Calendar and Email integration routes.
POST /calendar/push-task  — pushes task to Google Calendar
POST /send-reminder       — sends Gmail reminder
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import utils.db as db

logger = logging.getLogger(__name__)
router = APIRouter()


class CreateEventRequest(BaseModel):
    task_id: str
    user_id: str
    summary: str
    description: str
    start_time: str
    end_time: str

class SendReminderRequest(BaseModel):
    task_id: str
    user_id: str
    email: str
    token: Optional[str] = None

@router.post("/create-event")
def create_event(body: CreateEventRequest, token: Optional[str] = None):
    """
    Push a task as a Google Calendar event.
    Requires a valid Google OAuth2 token.
    """
    # The frontend apiRequest sends token in the body, which FastAPI might not map
    # automatically if it's not in the model. We'll check both.
    actual_token = token
    # Extract from body manually if needed or expect it in the query
    if not actual_token:
         raise HTTPException(status_code=401, detail="Google Access Token required.")

    try:
        import httpx

        # Use the richer body provided by the frontend
        event_body = {
            "summary": body.summary,
            "description": body.description,
            "start": {
                "dateTime": body.start_time,
                "timeZone": "UTC",
            },
            "end": {
                "dateTime": body.end_time,
                "timeZone": "UTC",
            },
        }

        headers = {
            "Authorization": f"Bearer {actual_token}",
            "Content-Type": "application/json",
        }

        resp = httpx.post(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            json=event_body,
            headers=headers,
            timeout=15,
        )

        if resp.status_code not in (200, 201):
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Google API Error: {resp.text}"
            )

        event_data = resp.json()
        event_id = event_data.get("id", "")

        # Update task with calendar_event_id
        db.update_task(body.task_id, {"calendar_event_id": event_id}, user_id=body.user_id)

        return {"event_id": event_id, "message": "Objective Synchronized to Google Calendar."}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Calendar push failed: {e}")
        raise HTTPException(status_code=500, detail=f"Calendar push failed: {e}")


@router.post("/send-reminder")
def send_reminder(body: SendReminderRequest, token: Optional[str] = None):
    """
    Send a Gmail reminder for a task.
    Requires a valid Google OAuth2 access_token with gmail.send scope.
    """
    actual_token = token or body.token
    if not actual_token:
        raise HTTPException(status_code=401, detail="Google Access Token required.")

    task = db.get_task_by_id(body.task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {body.task_id} not found.")

    try:
        import httpx
        import base64
        from email.mime.text import MIMEText

        task_name = task.get("task", "TaskPilot Task")
        deadline = task.get("deadline", "N/A")
        owner = task.get("owner", "Team")

        msg_body = (
            f"Hi {owner},\n\n"
            f"This is a reminder for your task:\n\n"
            f"Task: {task_name}\n"
            f"Deadline: {deadline}\n"
            f"Priority: {task.get('priority', 'medium')}\n"
            f"Status: {task.get('status', 'pending')}\n\n"
            f"Please ensure this is completed on time.\n\n"
            f"— TaskPilot"
        )

        msg = MIMEText(msg_body)
        msg["to"] = body.email
        msg["subject"] = f"[TaskPilot] Reminder: {task_name[:60]}"

        raw_message = base64.urlsafe_b64encode(msg.as_bytes()).decode()

        headers = {
            "Authorization": f"Bearer {actual_token}",
            "Content-Type": "application/json",
        }

        resp = httpx.post(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
            json={"raw": raw_message},
            headers=headers,
            timeout=15,
        )

        if resp.status_code not in (200, 201):
            raise HTTPException(
                status_code=resp.status_code,
                detail=f"Gmail API error: {resp.text}"
            )

        return {"message": "Reminder email sent successfully."}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send reminder failed: {e}")
        raise HTTPException(status_code=500, detail=f"Send reminder failed: {e}")
@router.post("/sync-tasks")
def sync_tasks(body: dict, token: Optional[str] = None):
    """
    Push multiple tasks to Google Calendar at once.
    """
    actual_token = token or body.get("token")
    if not actual_token:
         raise HTTPException(status_code=401, detail="Google Access Token required.")
    
    tasks = body.get("tasks", [])
    results = []
    
    for task in tasks:
        try:
            summary = task.get("task", "TaskPilot Directive")
            desc = f"Owner: {task.get('owner')}\nPriority: {task.get('priority')}\n\nAutomated by TaskPilot."
            deadline = task.get("deadline")
            due_time = task.get("due_time", "09:00")
            
            if not deadline or deadline == "unknown":
                continue
                
            start_str = f"{deadline.split('T')[0]}T{due_time}:00Z"
            end_str = f"{deadline.split('T')[0]}T{int(due_time.split(':')[0])+1:02d}:00:00Z"

            import httpx
            event_body = {
                "summary": summary,
                "description": desc,
                "start": {"dateTime": start_str, "timeZone": "UTC"},
                "end": {"dateTime": end_str, "timeZone": "UTC"},
            }
            
            resp = httpx.post(
                "https://www.googleapis.com/calendar/v3/calendars/primary/events",
                json=event_body,
                headers={"Authorization": f"Bearer {actual_token}"},
                timeout=10
            )
            if resp.status_code in (200, 201):
                results.append(task.get("task_id"))
        except:
             continue
             
    return {"synchronized": results, "count": len(results)}
