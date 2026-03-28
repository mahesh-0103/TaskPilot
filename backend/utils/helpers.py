import uuid
from datetime import datetime, timezone, timedelta


def new_id() -> str:
    """Generate a new UUID4 string."""
    return str(uuid.uuid4())


def now_iso() -> str:
    """Current UTC time in ISO-8601 format."""
    return datetime.now(timezone.utc).isoformat()


def extend_deadline(deadline_iso: str, days: int = 1) -> str:
    """
    Add `days` to an ISO-format date/datetime string.
    Returns the new date as an ISO-format string.
    If empty, returns empty.
    If malformed, returns first 10 chars of now + 1 day.
    """
    from datetime import date
    if not deadline_iso or deadline_iso == "NaN-NaN-NaN":
        return ""
        
    try:
        # Try full datetime first
        dt = datetime.fromisoformat(deadline_iso)
        return (dt + timedelta(days=days)).isoformat()
    except Exception:
        try:
            # Plain date string  e.g. "2024-06-01"
            d = date.fromisoformat(deadline_iso)
            return (d + timedelta(days=days)).isoformat()
        except Exception:
            # Only default if it was supposed to be a date but failed parsing
            return (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()[:10]
