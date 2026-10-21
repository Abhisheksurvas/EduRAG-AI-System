from typing import Dict, Any, List
from backend.models.store import DBStore
from backend.rag.notes_generator import NotesGenerator
from backend.rag.quiz_generator import QuizGenerator

class DocumentController:
    @staticmethod
    def get_documents(student_id: str) -> List[Dict[str, Any]]:
        return DBStore.find_documents_by_student(student_id)

    @staticmethod
    def delete_document(doc_id: str, student_id: str) -> bool:
        return DBStore.delete_document(doc_id, student_id)

class NotesController:
    @staticmethod
    def get_notes(student_id: str) -> List[Dict[str, Any]]:
        return DBStore.find_notes_by_student(student_id)

    @staticmethod
    def generate(student_id: str, doc_id: str, prompt_type: str = "Revision Summary", **kwargs) -> Dict[str, Any]:
        params = {"studentId": student_id, "documentId": doc_id, "promptType": prompt_type, **kwargs}
        res = NotesGenerator.generate_notes(params)
        return DBStore.create_note({
            "studentId": student_id,
            "documentId": doc_id,
            "title": res.get("title"),
            "content": res.get("content"),
            "promptType": prompt_type
        })

class QuizController:
    @staticmethod
    def get_quizzes(student_id: str) -> List[Dict[str, Any]]:
        return DBStore.find_quizzes_by_student(student_id)

    @staticmethod
    def generate(student_id: str, doc_id: str, num_questions: int = 10) -> Dict[str, Any]:
        gen = QuizGenerator.generate_quiz(student_id, doc_id, num_questions)
        return DBStore.create_quiz({
            "studentId": student_id,
            "documentId": doc_id,
            "title": gen.get("title"),
            "questions": gen.get("questions"),
            "totalMarks": gen.get("totalMarks", 10),
            "completed": False,
        })
