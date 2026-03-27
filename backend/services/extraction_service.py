"""
Extraction service.

Strategy:
  - If `MODEL_ENDPOINT` is configured in `settings`, call it with POST {text}.
  - Otherwise use a deterministic rule-based extractor (no LLMs).

The rule-based extractor splits the input into sentences and extracts
simple fields: owner (first token), task text, and deadline (if "by X" found).
"""

import re
from typing import List
from datetime import datetime, timedelta

import httpx

from settings import settings
from models.schemas import Task
from utils.helpers import new_id, now_iso, extend_deadline
from services.model_service import model_service


def _parse_deadline(token: str) -> str:
    """Parse a simple deadline token. Accept ISO date or weekday names; otherwise return empty."""
    token = token.strip().strip(".,")
    # ISO date
    if re.match(r"^\d{4}-\d{2}-\d{2}$", token):
        return token

    # Weekday name -> next occurrence
    weekdays = {
        "monday": 0,
        "tuesday": 1,
        "wednesday": 2,
        "thursday": 3,
        "friday": 4,
        "saturday": 5,
        "sunday": 6,
    }
    key = token.lower()
    if key in weekdays:
        today = datetime.utcnow().date()
        target = weekdays[key]
        days_ahead = (target - today.weekday() + 7) % 7
        days_ahead = days_ahead or 7
        return (today + timedelta(days=days_ahead)).isoformat()

    return ""


def _rule_extract(text: str) -> List[dict]:
    # Clean up transcript formatting (e.g. "**Name:**")
    text = re.sub(r'\*\*(.*?)\*\*:', r'\1:', text)
    sentences = re.split(r'(?<=[.!?\n])\s+', text.strip())
    tasks = []
    ts = now_iso()
    
    # Action keywords for filtering non-tasks
    action_words = ['will', 'can you', 'please', 'should', 'aim for', 'fix', 'update', 'complete', 'take that', 'finish', 'set up']
    
    for s in sentences:
        s_clean = s.strip()
        if not s_clean or len(s_clean) < 15:
            continue
            
        s_lower = s_clean.lower()
        if not any(w in s_lower for w in action_words):
            continue
            
        # Try to find owner
        owner = "Strategy"
        content_text = s_clean
        m_owner = re.search(r'^([A-Z][a-z]+)[:,\s]+', s_clean)
        if m_owner and m_owner.group(1).lower() not in ['alright', 'let', 'just', 'got', 'first', 'any', 'yes', 'no', 'should', 'morning']:
            owner = m_owner.group(1)
            # Remove name from task if it was at the start
            content_text = s_clean[len(m_owner.group(0)):].strip()
        elif "i'll" in s_clean or "i’ll" in s_clean or "i am" in s_lower:
            owner = "Self"

        # Parse deadline
        m_dl = re.search(r"\bby\s+([A-Za-z0-9\-]+)", s_clean, flags=re.IGNORECASE)
        # ... fallback
        dl_str = m_dl.group(1) if m_dl else "tomorrow"
        # Fix the NaNd by putting a real ISO date
        deadline = _parse_deadline(dl_str)
        if not deadline:
            deadline = (datetime.utcnow().date() + timedelta(days=1)).isoformat()

        # Priority
        pri = "medium"
        if re.search(r"\b(urgent|asap|critical|immediately)\b", s_clean, flags=re.IGNORECASE):
            pri = "high"
        elif "parallel" in s_clean or "minor" in s_clean:
            pri = "low"

        tasks.append(
            {
                "task_id": new_id(),
                "task": content_text,
                "owner": owner,
                "deadline": deadline,
                "priority": pri,
                "status": "pending",
                "depends_on": [],
                "created_at": ts,
                "updated_at": ts,
            }
        )

    # Post processing for sequence dependencies in rule-based
    # We will let workflow_service handle "depends_on" properly.
    return tasks



def _call_model_endpoint(text: str) -> List[dict]:
    # Use the local model service instead of an HTTP endpoint
    return model_service.predict_tasks(text)


def _normalise_task(raw: dict) -> Task:
    ts = now_iso()
    # Use extend_deadline with 0 days to leverage its safe parsing/defaulting logic
    deadline = extend_deadline(raw.get("deadline") or "", days=0)
    return Task(
        task_id=raw.get("task_id") or new_id(),
        task=raw.get("task", "Unnamed task"),
        owner=raw.get("owner") or "unassigned",
        deadline=deadline,
        priority=raw.get("priority", "medium") if raw.get("priority") in ("low", "medium", "high") else "medium",
        status=raw.get("status") or "pending",
        depends_on=raw.get("depends_on") or [],
        created_at=raw.get("created_at", ts),
        updated_at=raw.get("updated_at", ts),
    )


def extract_tasks(text: str) -> List[Task]:
    """Public extractor: use model_service, otherwise fallback to rule-based."""
    raw = model_service.predict_tasks(text)
    if not raw:
        # Fallback to rule-based if prediction returns empty (e.g. failed or no model)
        raw = _rule_extract(text)

    return [_normalise_task(r) for r in raw]
