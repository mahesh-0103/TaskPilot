import httpx
import base64
import logging

logger = logging.getLogger(__name__)

def create_calendar_event(token: str, task: dict):
    if not token: return
    try:
        url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        deadline = task.get("deadline", "")
        # Very simple validation avoiding complex tz logic
        if not deadline or deadline == "unknown":
            return
            
        # Optional truncating if it's full isoformat
        if "T" in deadline:
            deadline = deadline.split("T")[0]
            
        event = {
            "summary": task.get("task", "TaskPilot Task"),
            "description": f"Owner: {task.get('owner', 'unassigned')}\nPriority: {task.get('priority', 'medium')}",
            "start": {
                "dateTime": f"{deadline}T10:00:00Z",
                "timeZone": "UTC"
            },
            "end": {
                "dateTime": f"{deadline}T11:00:00Z",
                "timeZone": "UTC"
            }
        }
        with httpx.Client() as client:
            resp = client.post(url, headers=headers, json=event, timeout=10)
            resp.raise_for_status()
            logger.info("Successfully created calendar event.")
    except Exception as e:
        logger.error(f"Google Calendar integration error: {e}")

def send_email(token: str, to: str, subject: str, message: str):
    if not token or not to: return
    try:
        url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"
        email_content = f"To: {to}\r\nSubject: {subject}\r\n\r\n{message}"
        encoded_message = base64.urlsafe_b64encode(email_content.encode()).decode()

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        body = {
            "raw": encoded_message
        }
        with httpx.Client() as client:
            resp = client.post(url, headers=headers, json=body, timeout=10)
            resp.raise_for_status()
            logger.info("Successfully sent reminder email.")
    except Exception as e:
        logger.error(f"Gmail integration error: {e}")
