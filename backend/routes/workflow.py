from fastapi import APIRouter, HTTPException
from models.schemas import CreateWorkflowRequest, CreateWorkflowResponse
from services.workflow_service import assign_dependencies
from utils import db

router = APIRouter()


@router.post("/create-workflow", response_model=CreateWorkflowResponse)
def create_workflow_endpoint(body: CreateWorkflowRequest):
    """
    Assign task dependencies and persist the updated workflow to Supabase.
    """
    if not body.tasks:
        raise HTTPException(status_code=400, detail="Task list must not be empty.")

    tasks_with_deps = assign_dependencies(body.tasks)
    db.upsert_tasks(tasks_with_deps)

    return CreateWorkflowResponse(tasks=tasks_with_deps)
