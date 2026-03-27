"""
TaskPilot – Test Suite
Run with:  pytest tests/ -v
"""

import json
import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

import pytest
from fastapi.testclient import TestClient

# ── App import ────────────────────────────────────────────────────────────────
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from main import app
from schemas import Task, Log
from helpers import new_id, now_iso, extend_deadline
from workflow_service import assign_dependencies
from healing_service import self_heal

client = TestClient(app)

# ── Fixtures ──────────────────────────────────────────────────────────────────

def make_task(**overrides) -> Task:
    ts = now_iso()
    base = dict(
        task_id=new_id(),
        task="Write unit tests",
        owner="alice",
        deadline=(datetime.now(timezone.utc) + timedelta(days=7)).date().isoformat(),
        priority="medium",
        status="pending",
        depends_on=[],
        created_at=ts,
        updated_at=ts,
    )
    base.update(overrides)
    return Task(**base)


# ── Utility tests ─────────────────────────────────────────────────────────────

class TestHelpers:
    def test_new_id_is_uuid(self):
        uid = new_id()
        uuid.UUID(uid)  # raises if invalid

    def test_now_iso_format(self):
        ts = now_iso()
        datetime.fromisoformat(ts)  # raises if invalid

    def test_extend_deadline_adds_days(self):
        result = extend_deadline("2024-06-01", 1)
        assert result == "2024-06-02"

    def test_extend_deadline_datetime(self):
        result = extend_deadline("2024-06-01T10:00:00+00:00", 1)
        assert "2024-06-02" in result


# ── Workflow service tests ────────────────────────────────────────────────────

class TestWorkflowService:
    def test_single_task_no_dependency(self):
        t = make_task()
        result = assign_dependencies([t])
        assert result[0].depends_on == []

    def test_two_tasks_sequential(self):
        t1, t2 = make_task(task="Design DB"), make_task(task="Implement API")
        result = assign_dependencies([t1, t2])
        assert result[0].depends_on == []
        assert result[1].depends_on == [result[0].task_id]

    def test_sequence_keyword_links(self):
        t1 = make_task(task="Build auth module")
        t2 = make_task(task="After auth, deploy service")
        result = assign_dependencies([t1, t2])
        assert result[1].depends_on == [result[0].task_id]

    def test_empty_list(self):
        assert assign_dependencies([]) == []


# ── Self-heal service tests ───────────────────────────────────────────────────

class TestHealingService:
    @patch("services.healing_service.db")
    def test_reassign_owner_when_no_deps(self, mock_db):
        mock_db.upsert_tasks = MagicMock()
        mock_db.insert_log = MagicMock()

        t = make_task(status="delayed", depends_on=[])
        healed, logs = self_heal([t])

        assert healed[0].owner == "backup_user"
        assert logs[0].action == "Task reassigned"
        assert logs[0].reason == "Delay without dependency"

    @patch("services.healing_service.db")
    def test_extend_deadline_with_deps(self, mock_db):
        mock_db.upsert_tasks = MagicMock()
        mock_db.insert_log = MagicMock()

        dep_id = new_id()
        t = make_task(status="delayed", depends_on=[dep_id], deadline="2024-06-01")
        healed, logs = self_heal([t])

        assert healed[0].deadline == "2024-06-02"
        assert logs[0].action == "Deadline extended"
        assert logs[0].reason == "Dependent task delay"

    @patch("services.healing_service.db")
    def test_pending_task_unchanged(self, mock_db):
        mock_db.upsert_tasks = MagicMock()
        mock_db.insert_log = MagicMock()

        t = make_task(status="pending")
        healed, logs = self_heal([t])

        assert healed[0].status == "pending"
        assert healed[0].owner == t.owner
        assert logs == []


# ── API endpoint tests ────────────────────────────────────────────────────────

class TestExtractTasksEndpoint:
    def test_empty_text_returns_400(self):
        resp = client.post("/extract-tasks", json={"text": "  "})
        assert resp.status_code == 400

    @patch("routes.tasks.extract_tasks")
    @patch("routes.tasks.db")
    def test_valid_text_returns_tasks(self, mock_db, mock_extract):
        mock_db.upsert_tasks = MagicMock()
        sample = make_task()
        mock_extract.return_value = [sample]

        resp = client.post("/extract-tasks", json={"text": "Alice must finish report by Friday."})
        assert resp.status_code == 200
        data = resp.json()
        assert "tasks" in data
        assert len(data["tasks"]) == 1
        assert data["tasks"][0]["task_id"] == sample.task_id


class TestCreateWorkflowEndpoint:
    def test_empty_tasks_returns_400(self):
        resp = client.post("/create-workflow", json={"tasks": []})
        assert resp.status_code == 400

    @patch("routes.workflow.db")
    def test_workflow_assigns_deps(self, mock_db):
        mock_db.upsert_tasks = MagicMock()
        t1 = make_task()
        t2 = make_task()
        payload = {"tasks": [t1.model_dump(), t2.model_dump()]}

        resp = client.post("/create-workflow", json=payload)
        assert resp.status_code == 200
        tasks = resp.json()["tasks"]
        assert tasks[0]["depends_on"] == []
        assert tasks[1]["depends_on"] == [tasks[0]["task_id"]]


class TestSimulateDelayEndpoint:
    @patch("routes.monitor.simulate_delay")
    def test_valid_task_id(self, mock_simulate):
        mock_simulate.return_value = MagicMock()
        resp = client.post("/simulate-delay", json={"task_id": str(uuid.uuid4())})
        assert resp.status_code == 200
        assert resp.json()["message"] == "Task marked as delayed"

    @patch("routes.monitor.simulate_delay", side_effect=ValueError("not found"))
    def test_invalid_task_id_returns_404(self, _):
        resp = client.post("/simulate-delay", json={"task_id": "nonexistent"})
        assert resp.status_code == 404


class TestSelfHealEndpoint:
    def test_empty_tasks_returns_400(self):
        resp = client.post("/self-heal", json={"tasks": []})
        assert resp.status_code == 400

    @patch("routes.healing.self_heal")
    def test_heal_response(self, mock_heal):
        t = make_task(status="delayed")
        healed = make_task(**{**t.model_dump(), "owner": "backup_user"})
        mock_heal.return_value = ([healed], [])

        resp = client.post("/self-heal", json={"tasks": [t.model_dump()]})
        assert resp.status_code == 200
        assert resp.json()["tasks"][0]["owner"] == "backup_user"


class TestLogsEndpoint:
    @patch("routes.logs.db")
    def test_get_logs(self, mock_db):
        ts = now_iso()
        mock_db.get_all_logs.return_value = [
            {
                "log_id": new_id(),
                "action": "Task delayed",
                "reason": "Manual simulation",
                "timestamp": ts,
                "task_id": new_id(),
            }
        ]
        resp = client.get("/logs")
        assert resp.status_code == 200
        logs = resp.json()["logs"]
        assert len(logs) == 1
        assert logs[0]["action"] == "Task delayed"
