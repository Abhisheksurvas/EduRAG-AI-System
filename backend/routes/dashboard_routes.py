from fastapi import APIRouter, Depends
from backend.models.store import DBStore
from backend.middleware.auth import require_auth
from backend.services.sample_docs_service import SampleDocsService

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/metrics")
async def get_dashboard_metrics(student_id: str = Depends(require_auth)):
    docs = DBStore.find_documents_by_student(student_id)
    if len(docs) == 0:
        docs = SampleDocsService.seed_sample_documents_for_student(student_id)

    notes = DBStore.find_notes_by_student(student_id)
    conversations = DBStore.find_conversations_by_student(student_id)
    quizzes = DBStore.find_quizzes_by_student(student_id)

    total_chunks = sum(d.get("totalChunks", 0) for d in docs)
    completed_quizzes = [q for q in quizzes if q.get("completed")]
    avg_score = (
        round(sum(q.get("score", 0) for q in completed_quizzes) / len(completed_quizzes), 1)
        if len(completed_quizzes) > 0
        else 0
    )

    return {
        "success": True,
        "metrics": {
            "totalDocuments": len(docs),
            "totalChunks": total_chunks,
            "totalNotes": len(notes),
            "totalConversations": len(conversations),
            "totalQuizzes": len(quizzes),
            "completedQuizzes": len(completed_quizzes),
            "averageQuizScore": avg_score,
        },
        "recentDocuments": docs[:4],
        "recentNotes": notes[:4],
        "recentConversations": conversations[:4],
    }
