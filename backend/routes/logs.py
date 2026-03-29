from fastapi import APIRouter, HTTPException
from models.schemas import GetLogsResponse, Log
from utils import db

router = APIRouter()


@router.get("/", response_model=GetLogsResponse)
def get_logs_endpoint():
    """
    Retrieve all audit log entries, ordered by timestamp ascending.
    """
    try:
        raw_logs = db.get_all_logs()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch logs: {exc}")

    logs = [Log(**row) for row in raw_logs]
    return GetLogsResponse(logs=logs)
