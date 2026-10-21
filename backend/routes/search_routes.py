from fastapi import APIRouter, Depends, Query
from backend.models.store import DBStore
from backend.middleware.auth import require_auth
from backend.config.db import get_mongo_status
from backend.services.gemini_service import is_gemini_configured

search_router = APIRouter(prefix="/api/search", tags=["search"])
router = search_router
health_router = APIRouter(prefix="/api/health", tags=["health"])

@search_router.get("")
async def search_all(q: str = Query(..., min_length=1), student_id: str = Depends(require_auth)):
    query = q.lower().strip()

    docs = DBStore.find_documents_by_student(student_id)
    matched_docs = [d for d in docs if query in d.get("originalName", "").lower() or query in d.get("courseSubject", "").lower()]

    notes = DBStore.find_notes_by_student(student_id)
    matched_notes = [n for n in notes if query in n.get("title", "").lower() or query in n.get("content", "").lower()]

    convs = DBStore.find_conversations_by_student(student_id)
    matched_convs = [c for c in convs if query in c.get("title", "").lower()]

    return {
        "success": True,
        "query": q,
        "results": {
            "documents": matched_docs,
            "notes": matched_notes,
            "conversations": matched_convs,
            "totalHits": len(matched_docs) + len(matched_notes) + len(matched_convs)
        }
    }

@health_router.get("")
async def health_check():
    mongo = get_mongo_status()
    gemini_ready = is_gemini_configured()
    return {
        "status": "healthy",
        "service": "EduRAG AI Backend (Python)",
        "database": mongo,
        "gemini": {
            "configured": gemini_ready,
            "models": ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"]
        }
    }
