from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from backend.models.store import DBStore
from backend.middleware.auth import require_auth

router = APIRouter(prefix="/api/profile", tags=["profile"])

class UpdateProfilePayload(BaseModel):
    name: Optional[str] = None
    rollNo: Optional[str] = None
    semester: Optional[str] = None
    year: Optional[str] = None
    branch: Optional[str] = None
    avatar: Optional[str] = None
    goals: Optional[str] = None

@router.get("")
async def get_profile(student_id: str = Depends(require_auth)):
    student = DBStore.find_student_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")
    student_copy = dict(student)
    student_copy.pop("password", None)
    return {
        "success": True,
        "student": student_copy
    }

@router.put("")
async def update_profile(payload: UpdateProfilePayload, student_id: str = Depends(require_auth)):
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    updated = DBStore.update_student(student_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Student profile not found.")
    student_copy = dict(updated)
    student_copy.pop("password", None)
    return {
        "success": True,
        "student": student_copy
    }
