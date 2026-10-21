from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from backend.models.store import DBStore
from backend.middleware.auth import require_auth
from backend.rag.quiz_generator import QuizGenerator

router = APIRouter(prefix="/api/quiz", tags=["quiz"])

class GenerateQuizPayload(BaseModel):
    documentId: str
    numQuestions: Optional[int] = 10

class SubmitQuizPayload(BaseModel):
    userAnswers: List[int]

@router.get("")
async def get_quizzes(student_id: str = Depends(require_auth)):
    quizzes = DBStore.find_quizzes_by_student(student_id)
    return {
        "success": True,
        "quizzes": quizzes
    }

@router.get("/{quiz_id}")
async def get_quiz_by_id(quiz_id: str, student_id: str = Depends(require_auth)):
    quiz = DBStore.find_quiz_by_id(quiz_id, student_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    return {
        "success": True,
        "quiz": quiz
    }

@router.post("/generate")
async def generate_quiz(payload: GenerateQuizPayload, student_id: str = Depends(require_auth)):
    generated = QuizGenerator.generate_quiz(student_id, payload.documentId, payload.numQuestions or 10)

    quiz = DBStore.create_quiz({
        "studentId": student_id,
        "documentId": payload.documentId,
        "title": generated.get("title", "Exam Practice Quiz"),
        "questions": generated.get("questions", []),
        "totalMarks": generated.get("totalMarks", 10),
        "score": None,
        "completed": False,
        "userAnswers": []
    })

    return {
        "success": True,
        "quiz": quiz
    }

@router.post("/{quiz_id}/submit")
async def submit_quiz(quiz_id: str, payload: SubmitQuizPayload, student_id: str = Depends(require_auth)):
    quiz = DBStore.find_quiz_by_id(quiz_id, student_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    questions = quiz.get("questions", [])
    user_answers = payload.userAnswers

    score = 0
    for idx, q in enumerate(questions):
        correct = q.get("correctAnswer", 0)
        user_choice = user_answers[idx] if idx < len(user_answers) else -1
        if user_choice == correct:
            score += 1

    updated = DBStore.update_quiz(quiz_id, student_id, {
        "score": score,
        "completed": True,
        "userAnswers": user_answers
    })

    DBStore.create_notification({
        "studentId": student_id,
        "title": "Quiz Completed",
        "message": f"You scored {score}/{len(questions)} on '{quiz.get('title')}'.",
        "type": "success" if score >= len(questions) * 0.7 else "info"
    })

    return {
        "success": True,
        "quiz": updated,
        "score": score,
        "total": len(questions)
    }
