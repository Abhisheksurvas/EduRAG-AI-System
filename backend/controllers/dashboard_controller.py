from typing import Dict, Any
from backend.models.store import DBStore
from backend.services.sample_docs_service import SampleDocsService

class DashboardController:
    @staticmethod
    def get_dashboard(student_id: str) -> Dict[str, Any]:
        student = DBStore.find_student_by_id(student_id)
        docs = DBStore.find_documents_by_student(student_id)
        if len(docs) == 0:
            docs = SampleDocsService.seed_sample_documents_for_student(student_id)

        notes = DBStore.find_notes_by_student(student_id)
        convs = DBStore.find_conversations_by_student(student_id)
        quizzes = DBStore.find_quizzes_by_student(student_id)
        unreads = DBStore.count_unread_notifications(student_id)

        ready_docs = [d for d in docs if d.get("status") == "ready"]
        total_chunks = sum(d.get("totalChunks", 0) for d in docs)
        completed_quizzes = [q for q in quizzes if q.get("completed") or q.get("status") == "completed"]
        avg_score = (
            round(sum(q.get("score", 0) for q in completed_quizzes) / len(completed_quizzes), 1)
            if len(completed_quizzes) > 0
            else 0
        )

        safe_student = dict(student or {})
        safe_student.pop("passwordHash", None)

        return {
            "success": True,
            "data": {
                "student": safe_student,
                "counts": {
                    "totalDocuments": len(docs),
                    "readyDocuments": len(ready_docs),
                    "generatedNotes": len(notes),
                    "generatedQuizzes": len(quizzes),
                    "recentChats": len(convs),
                    "unreadNotifications": unreads,
                },
                "metrics": {
                    "totalDocuments": len(docs),
                    "totalChunks": total_chunks,
                    "totalNotes": len(notes),
                    "totalConversations": len(convs),
                    "totalQuizzes": len(quizzes),
                    "completedQuizzes": len(completed_quizzes),
                    "averageQuizScore": avg_score,
                },
                "recentDocuments": docs[:5],
                "recentNotes": notes[:5],
                "recentConversations": convs[:5],
            }
        }
