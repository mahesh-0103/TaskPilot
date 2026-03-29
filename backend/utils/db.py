"""
Supabase persistence layer.
"""

from supabase import create_client, Client
from settings import settings
from typing import List, Optional
import logging
from datetime import datetime, timezone
import uuid

logger = logging.getLogger(__name__)

# Initialize clients once globally
_client: Optional[Client] = None
_service_client: Optional[Client] = None

def get_client() -> Client:
    global _client
    if _client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    return _client

def get_service_client() -> Client:
    """Uses the high-privilege service role key for background operations (RLS Bypass)."""
    global _service_client
    if _service_client is None:
        key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY
        if settings.SUPABASE_SERVICE_ROLE_KEY:
            logger.info(f"Supabase Service Client initializing with SERVICE_ROLE_KEY (k={key[:5]}...)")
        else:
            logger.info(f"Supabase Service Client falling back to SUPABASE_KEY (k={key[:5]}...)")
        
        if not settings.SUPABASE_URL or not key:
            raise RuntimeError("SUPABASE_URL must be set in .env")
        _service_client = create_client(settings.SUPABASE_URL, key)
    return _service_client

# ── Task helpers ─────────────────────────────────────────────────────────────

def save_tasks(tasks: List[dict], user_id: Optional[str] = None) -> None:
    """Insert tasks into Supabase. Ensure task_id and user_id exist."""
    client = get_service_client()
    try:
        ts = datetime.now(timezone.utc).isoformat()
        # Schema adaptation: remove columns that don't exist in the current DB schema
        forbidden_cols = ["due_time", "is_checked"] 
        
        sanitized_tasks = []
        for t in tasks:
            if not t.get("task_id"):
                t["task_id"] = str(uuid.uuid4())
            if user_id and not t.get("user_id"):
                t["user_id"] = user_id
            if not t.get("created_at"): t["created_at"] = ts
            if not t.get("updated_at"): t["updated_at"] = ts
            
            # Remove non-existent fields for the current schema version
            clean_t = {k: v for k, v in t.items() if k not in forbidden_cols}
            sanitized_tasks.append(clean_t)
            
        logger.info(f"DB WRITE: Upserting {len(sanitized_tasks)} sanctioned tasks via Service Role.")
        res = client.table("tasks").upsert(sanitized_tasks).execute()
    except Exception as e:
        logger.error(f"Error saving tasks to Supabase: {e}")

def get_tasks(user_id: Optional[str] = None) -> List[dict]:
    """Fetch all tasks for a specific user or global scan."""
    client = get_service_client()
    try:
        query = client.table("tasks").select("*")
        if user_id:
            query = query.eq("user_id", user_id)
        result = query.execute()
        return result.data or []
    except Exception as e:
        logger.error(f"Error fetching tasks from Supabase: {e}")
        return []

def get_task_by_id(task_id: str, user_id: Optional[str] = None) -> Optional[dict]:
    """Fetch a single task by task_id. Returns None if not found."""
    client = get_service_client() if not user_id else get_client()
    try:
        result = (
            client.table("tasks")
            .select("*")
            .eq("task_id", task_id)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"Error fetching task by id from Supabase: {e}")
        return None

def update_tasks(tasks: List[dict], user_id: Optional[str] = None) -> None:
    """Update rows using task_id. Update updated_at timestamp."""
    client = get_service_client() if not user_id else get_client()
    ts = datetime.now(timezone.utc).isoformat()
    try:
        for task in tasks:
            task["updated_at"] = ts
            if "task_id" in task:
                query = client.table("tasks").update(task).eq("task_id", task["task_id"])
                if user_id:
                    query = query.eq("user_id", user_id)
                query.execute()
    except Exception as e:
        logger.error(f"Error updating tasks in Supabase: {e}")

# ── Log helpers ───────────────────────────────────────────────────────────────

def add_log(log: dict) -> None:
    """Insert into logs table. Ensure log_id and user_id exist."""
    user_id = log.get("user_id")
    client = get_service_client() if not user_id else get_client()
    try:
        if not log.get("log_id"):
            log["log_id"] = str(uuid.uuid4())
        
        # Remove None values so Supabase uses column defaults
        clean = {k: v for k, v in log.items() if v is not None}
        client.table("logs").insert(clean).execute()
    except Exception as e:
        logger.error(f"Error adding log to Supabase: {e}")

def get_logs(user_id: Optional[str] = None) -> List[dict]:
    """Fetch logs ordered by timestamp ascending."""
    client = get_service_client() if not user_id else get_client()
    try:
        query = client.table("logs").select("*").order("timestamp", desc=False)
        if user_id:
            query = query.eq("user_id", user_id)
        result = query.execute()
        return result.data or []
    except Exception as e:
        logger.error(f"Error fetching logs from Supabase: {e}")
        return []

# ── Aliases to preserve compatibility with existing routes/services ─────────

def upsert_tasks(tasks: List[dict], user_id: Optional[str] = None):
    if tasks and not isinstance(tasks[0], dict):
        tasks = [t.model_dump() for t in tasks]
    
    # Critical: Enforce NOT NULL for user_id to avoid discard errors
    tasks = [{k: v for k, v in t.items() if v is not None} for t in tasks]
    save_tasks(tasks, user_id=user_id)

def get_all_tasks() -> List[dict]:
    return get_tasks()

def update_task(task_id: str, fields: dict, user_id: Optional[str] = None):
    # Old function updated a single task by ID
    fields["task_id"] = task_id
    if user_id:
        fields["user_id"] = user_id
    update_tasks([fields], user_id=user_id)

def insert_log(log):
    if not isinstance(log, dict):
        log = log.model_dump()
    add_log(log)

def get_all_logs() -> List[dict]:
    return get_logs()

def get_user_email(user_id: str) -> Optional[str]:
    """Fetch user email from profiles table."""
    client = get_service_client()
    try:
        res = client.table("profiles").select("email").eq("id", user_id).limit(1).execute()
        return res.data[0]["email"] if res.data else None
    except Exception:
        return None
