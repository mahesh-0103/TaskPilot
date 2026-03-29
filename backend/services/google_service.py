import httpx
import base64
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

def get_free_slots(token: str, date_str: str):
    """Fetch free busy information and find the first available 1-hour slot between 09:00 and 17:00."""
    if not token: return None
    try:
        url = "https://www.googleapis.com/calendar/v3/freeBusy"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Define working hours for the date
        start_day = f"{date_str}T09:00:00Z"
        end_day = f"{date_str}T17:00:00Z"
        
        payload = {
            "timeMin": start_day,
            "timeMax": end_day,
            "items": [{"id": "primary"}]
        }
        
        with httpx.Client() as client:
            resp = client.post(url, headers=headers, json=payload, timeout=10)
            resp.raise_for_status()
            busy_data = resp.json().get("calendars", {}).get("primary", {}).get("busy", [])
            
            # Simple slot finder: check each hour
            current_time = datetime.fromisoformat(start_day.replace("Z", "+00:00"))
            end_limit = datetime.fromisoformat(end_day.replace("Z", "+00:00"))
            
            while current_time + timedelta(hours=1) <= end_limit:
                slot_start = current_time
                slot_end = current_time + timedelta(hours=1)
                
                is_busy = False
                for b in busy_data:
                    b_start = datetime.fromisoformat(b["start"].replace("Z", "+00:00"))
                    b_end = datetime.fromisoformat(b["end"].replace("Z", "+00:00"))
                    # Overlap check
                    if not (slot_end <= b_start or slot_start >= b_end):
                        is_busy = True
                        break
                
                if not is_busy:
                    return slot_start.isoformat().replace("+00:00", "Z")
                
                current_time += timedelta(hours=1)
                
        return None
    except Exception as e:
        logger.error(f"Error fetching free slots: {e}")
        return None

def create_calendar_event(token: str, task: dict, auto_schedule: bool = False):
    if not token: return
    try:
        url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        deadline = task.get("deadline", "")
        if not deadline or deadline == "unknown":
            return
            
        if "T" in deadline:
            deadline = deadline.split("T")[0]
            
        start_time = f"{deadline}T10:00:00Z" # Default
        if auto_schedule:
            optimal_time = get_free_slots(token, deadline)
            if optimal_time:
                start_time = optimal_time
                logger.info(f"Auto-Scheduled task to optimal time: {start_time}")
            else:
                logger.info("No free slots found, falling back to default time.")

        # Calculate 1 hour duration
        start_dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
        end_time = (start_dt + timedelta(hours=1)).isoformat().replace("+00:00", "Z")
            
        event = {
            "summary": f"🚀 {task.get('task', 'TaskPilot Task')}",
            "description": f"Owner: {task.get('owner', 'unassigned')}\nPriority: {task.get('priority', 'medium')}\n\nAutomated by TaskPilot Intelligent Scheduler.",
            "start": {
                "dateTime": start_time,
                "timeZone": "UTC"
            },
            "end": {
                "dateTime": end_time,
                "timeZone": "UTC"
            },
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "email", "minutes": 24 * 60},
                    {"method": "popup", "minutes": 10}
                ]
            }
        }
        with httpx.Client() as client:
            resp = client.post(url, headers=headers, json=event, timeout=10)
            resp.raise_for_status()
            logger.info("Successfully created calendar event.")
            return resp.json().get("id")
    except Exception as e:
        logger.error(f"Google Calendar integration error: {e}")
        return None

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
