"""Activities CRUD — all routes require auth, all queries scoped to the authenticated user."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.auth import AuthenticatedUID

router = APIRouter()


class ActivityOut(BaseModel):
    id: str
    user_id: str
    category: str
    description: str
    co2e_kg: float
    timestamp: str


class ActivitiesResponse(BaseModel):
    activities: list[ActivityOut]
    total: int


@router.get("/activities", response_model=ActivitiesResponse)
async def list_activities(
    uid: AuthenticatedUID,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    cursor: str | None = None,
) -> ActivitiesResponse:
    """List the authenticated user's activities. Scoped to uid — never returns other users' data."""
    # TODO Sprint 3: implement Firestore query with .where("user_id", "==", uid)
    return ActivitiesResponse(activities=[], total=0)


@router.delete("/activities/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_activity(
    activity_id: str,
    uid: AuthenticatedUID,
) -> None:
    """Delete an activity. Verifies ownership before deletion."""
    # TODO Sprint 3: fetch document, verify doc.user_id == uid before deleting
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found.")
