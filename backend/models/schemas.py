from pydantic import BaseModel, Field
from typing import List, Optional, Literal


class Task(BaseModel):
    task_id: str
    user_id: Optional[str] = None          # UUID – set by frontend or route
    workflow_id: Optional[str] = None
    task: str
    owner: str
    deadline: str                           # ISO date string YYYY-MM-DD
    due_time: str = "09:00"                 # 24h format HH:MM
    priority: Literal["low", "medium", "high"]
    status: Literal["pending", "completed", "delayed"]   # DB constraint; healed → pending
    depends_on: List[str] = Field(default_factory=list)
    notification_emails: List[str] = Field(default_factory=list)
    is_checked: bool = False
    calendar_event_id: Optional[str] = None
    created_at: str = ""                   # ISO datetime string
    updated_at: str = ""                   # ISO datetime string


class Log(BaseModel):
    log_id: str
    user_id: Optional[str] = None          # UUID – propagated from task where possible
    action: str
    reason: str
    timestamp: str                          # ISO datetime string
    task_id: Optional[str] = None
    decision_trace: Optional[str] = None


# ── Request / Response wrappers ───────────────────────────────────────────────

class ExtractTasksRequest(BaseModel):
    text: str
    token: Optional[str] = None
    user_id: Optional[str] = None
    email: Optional[str] = None


class ExtractTasksResponse(BaseModel):
    tasks: List[Task]


class CreateWorkflowRequest(BaseModel):
    tasks: List[Task]
    token: Optional[str] = None


class CreateWorkflowResponse(BaseModel):
    tasks: List[Task]


class SimulateDelayRequest(BaseModel):
    task_id: str
    token: Optional[str] = None


class SimulateDelayResponse(BaseModel):
    message: str


class SelfHealRequest(BaseModel):
    tasks: List[Task]
    token: Optional[str] = None


class SelfHealResponse(BaseModel):
    tasks: List[Task]


class GetLogsResponse(BaseModel):
    logs: List[Log]
