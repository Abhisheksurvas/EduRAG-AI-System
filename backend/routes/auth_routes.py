from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from backend.models.store import DBStore
from backend.middleware.auth import hash_password, compare_password, generate_token, require_auth

router = APIRouter(prefix="/api/auth", tags=["auth"])

class RegisterPayload(BaseModel):
    name: str
    email: EmailStr
    password: str
    rollNo: Optional[str] = ""
    branch: Optional[str] = ""
    semester: Optional[str] = ""
    year: Optional[str] = ""

class LoginPayload(BaseModel):
    email: EmailStr
    password: str

@router.post("/register")
async def register(payload: RegisterPayload):
    existing = DBStore.find_student_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=400, detail="Student account with this email already exists.")

    student = DBStore.create_student({
        "name": payload.name.strip(),
        "email": payload.email.lower().strip(),
        "password": hash_password(payload.password),
        "rollNo": payload.rollNo,
        "branch": payload.branch,
        "semester": payload.semester,
        "year": payload.year,
        "avatar": "",
        "goals": ""
    })

    # Auto seed initial study notes
    try:
        from backend.services.sample_docs_service import SampleDocsService
        SampleDocsService.seed_sample_documents_for_student(student["_id"])
    except Exception as e:
        print(f"Sample docs seeding note: {e}")

    token = generate_token(student["_id"])
    student_copy = dict(student)
    student_copy.pop("password", None)

    return {
        "success": True,
        "token": token,
        "student": student_copy
    }

@router.post("/login")
async def login(payload: LoginPayload):
    student = DBStore.find_student_by_email(payload.email)
    if not student or not compare_password(payload.password, student.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = generate_token(student["_id"])
    student_copy = dict(student)
    student_copy.pop("password", None)

    return {
        "success": True,
        "token": token,
        "student": student_copy
    }

@router.get("/me")
async def get_current_user(student_id: str = Depends(require_auth)):
    student = DBStore.find_student_by_id(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")
    student_copy = dict(student)
    student_copy.pop("password", None)
    return {
        "success": True,
        "student": student_copy
    }
