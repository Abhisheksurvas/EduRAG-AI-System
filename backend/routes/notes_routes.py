from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from backend.models.store import DBStore
from backend.middleware.auth import require_auth
from backend.rag.notes_generator import NotesGenerator

router = APIRouter(prefix="/api/notes", tags=["notes"])

class GenerateNotesPayload(BaseModel):
    documentId: str
    promptType: Optional[str] = "Revision Summary"
    chapter: Optional[str] = ""
    unit: Optional[str] = ""
    customPrompt: Optional[str] = None

class UpdateNotePayload(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

@router.get("")
async def get_notes(student_id: str = Depends(require_auth)):
    notes = DBStore.find_notes_by_student(student_id)
    return {
        "success": True,
        "notes": notes
    }

@router.get("/{note_id}")
async def get_note_by_id(note_id: str, student_id: str = Depends(require_auth)):
    note = DBStore.find_note_by_id(note_id, student_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found.")
    return {
        "success": True,
        "note": note
    }

@router.post("/generate")
async def generate_note(payload: GenerateNotesPayload, student_id: str = Depends(require_auth)):
    result = NotesGenerator.generate_notes({
        "studentId": student_id,
        "documentId": payload.documentId,
        "promptType": payload.promptType,
        "chapter": payload.chapter,
        "unit": payload.unit,
        "customPrompt": payload.customPrompt
    })

    note = DBStore.create_note({
        "studentId": student_id,
        "documentId": payload.documentId,
        "title": result.get("title", "Study Notes"),
        "content": result.get("content", ""),
        "promptType": payload.promptType,
        "chapter": payload.chapter,
        "unit": payload.unit
    })

    DBStore.create_notification({
        "studentId": student_id,
        "title": "Study Notes Generated",
        "message": f"'{note['title']}' has been created from your course material.",
        "type": "success"
    })

    return {
        "success": True,
        "note": note
    }

@router.put("/{note_id}")
async def update_note(note_id: str, payload: UpdateNotePayload, student_id: str = Depends(require_auth)):
    updates = {}
    if payload.title is not None:
        updates["title"] = payload.title
    if payload.content is not None:
        updates["content"] = payload.content

    updated = DBStore.update_note(note_id, student_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Note not found.")
    return {
        "success": True,
        "note": updated
    }

@router.delete("/{note_id}")
async def delete_note(note_id: str, student_id: str = Depends(require_auth)):
    DBStore.delete_note(note_id, student_id)
    return {
        "success": True,
        "message": "Note deleted successfully."
    }
