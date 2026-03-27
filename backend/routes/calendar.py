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


class PushTaskRequest(BaseModel):
    task_id: str
    access_token: str


class SendReminderRequest(BaseModel):
    task_id: str
    access_token: str
    email: str


@router.post("/calendar/push-task")
def push_task_to_calendar(body: PushTaskRequest):
    """
    Push a task as a Google Calendar event.
    Requires a valid Google OAuth2 access_token with calendar.events scope.
    """
    task = db.get_task_by_id(body.task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {body.task_id} not found.")

    try:
        import httpx

        event_body = {
            "summary": task.get("task", "TaskPilot Task"),
            "description": (
                f"Owner: {task.get('owner', 'unassigned')}\n"
                f"Priority: {task.get('priority', 'medium')}\n"
                f"Status: {task.get('status', 'pending')}\n"
                f"Task ID: {task.get('task_id', '')}"
            ),
            "start": {
                "date": task.get("deadline", ""),
                "timeZone": "UTC",
            },
            "end": {
                "date": task.get("deadline", ""),
                "timeZone": "UTC",
            },
        }

        headers = {
            "Authorization": f"Bearer {body.access_token}",
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
                detail=f"Google Calendar API error: {resp.text}"
            )

        event_data = resp.json()
        event_id = event_data.get("id", "")

        # Update task with calendar_event_id
        db.update_task(body.task_id, {"calendar_event_id": event_id}, user_id=task.get("user_id"))

        return {"event_id": event_id, "message": "Event created in Google Calendar."}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Calendar push failed: {e}")
        raise HTTPException(status_code=500, detail=f"Calendar push failed: {e}")


@router.post("/send-reminder")
def send_reminder(body: SendReminderRequest):
    """
    Send a Gmail reminder for a task.
    Requires a valid Google OAuth2 access_token with gmail.send scope.
    """
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
            "Authorization": f"Bearer {body.access_token}",
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
