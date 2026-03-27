"""
TaskPilot – End-to-End Demo Script
===================================
Walks through the complete DEMO FLOW defined in the spec:
  1. Input meeting text
  2. Extract tasks
  3. Create workflow
  4. Simulate delay
  5. Run self-heal
  6. Fetch logs

Run:  python demo.py
(Server must be running:  uvicorn main:app --reload)
"""

import json
import httpx

BASE = "http://localhost:8000"
HEADERS = {"Content-Type": "application/json"}


def pp(label: str, data: dict):
    print(f"\n{'='*60}")
    print(f"  {label}")
    print('='*60)
    print(json.dumps(data, indent=2))


# ── 1. Extract Tasks ──────────────────────────────────────────

MEETING_TEXT = """
Team sync – 14 March 2025

Alice will design the database schema by next Monday (urgent).
Bob will then implement the REST API once the schema is ready.
Carol must write integration tests after the API is done (high priority).
Dave will deploy the service to staging and notify the team.
"""

resp = httpx.post(f"{BASE}/extract-tasks", json={"text": MEETING_TEXT}, headers=HEADERS, timeout=30.0)
resp.raise_for_status()
tasks_data = resp.json()
pp("STEP 1 – Extracted Tasks", tasks_data)

tasks = tasks_data["tasks"]

# ── 2. Create Workflow ────────────────────────────────────────

resp = httpx.post(f"{BASE}/create-workflow", json={"tasks": tasks}, headers=HEADERS, timeout=30.0)
resp.raise_for_status()
workflow_data = resp.json()
pp("STEP 2 – Workflow (with dependencies)", workflow_data)

tasks = workflow_data["tasks"]

# ── 3. Simulate Delay (on first task) ────────────────────────

target_task_id = tasks[0]["task_id"]
resp = httpx.post(f"{BASE}/simulate-delay", json={"task_id": target_task_id}, headers=HEADERS, timeout=30.0)
resp.raise_for_status()
pp(f"STEP 3 – Simulated Delay on task '{target_task_id}'", resp.json())

# Mark the task as delayed locally for self-heal input
tasks[0]["status"] = "delayed"

# ── 4. Self-Heal ──────────────────────────────────────────────

resp = httpx.post(f"{BASE}/self-heal", json={"tasks": tasks}, headers=HEADERS, timeout=30.0)
resp.raise_for_status()
healed_data = resp.json()
pp("STEP 4 – Self-Healed Tasks", healed_data)

# ── 5. Fetch Logs ─────────────────────────────────────────────

resp = httpx.get(f"{BASE}/logs", headers=HEADERS, timeout=30.0)
resp.raise_for_status()
pp("STEP 5 – Audit Logs", resp.json())

print("\n✅  Demo complete.")
