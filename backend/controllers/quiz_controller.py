from typing import Dict, Any, Optional
from backend.models.store import DBStore
from backend.rag.quiz_generator import QuizGenerator

class QuizController:
    @staticmethod
    def generate(
        student_id: str,
        document_id: str,
        topic: Optional[str] = None,
        difficulty: Optional[str] = "Medium",
        question_count: Optional[int] = 5,
        time_limit: Optional[int] = 10
    ) -> Dict[str, Any]:
        if not document_id:
            return {"success": False, "message": "Please select a study material document."}

        doc = DBStore.find_document_by_id(document_id, student_id)
        if not doc:
            return {"success": False, "message": "Selected document not found in your account."}

        if doc.get("status") != "ready":
            return {
                "success": False,
                "message": f"Document status is '{doc.get('status')}'. Please wait until document processing is complete."
            }

        count = int(question_count or 5)
        diff = difficulty if difficulty in ["Easy", "Hard"] else "Medium"
        limit = int(time_limit or 10)

        quiz_topic = topic or doc.get("originalName", "").split(".")[0]
        generated = QuizGenerator.generate_quiz(student_id, document_id, count)

        quiz = DBStore.create_quiz({
            "studentId": student_id,
            "documentId": document_id,
            "documentName": doc.get("originalName", "Document"),
            "title": generated.get("title", f"Quiz: {quiz_topic}"),
            "topic": quiz_topic,
            "difficulty": diff,
            "questionCount": len(generated.get("questions", [])),
            "timeLimit": limit,
            "questions": generated.get("questions", []),
            "status": "unattempted",
            "score": 0,
            "totalAnswered": 0,
        })

        DBStore.create_notification({
            "studentId": student_id,
            "type": "quiz",
            "title": "Quiz Ready",
            "message": f"Your dynamic quiz '{quiz.get('title')}' ({quiz.get('questionCount', count)} questions) has been generated.",
            "read": False,
        })

        return {"success": True, "quiz": quiz}

    @staticmethod
    def get_quizzes(student_id: str) -> Dict[str, Any]:
        quizzes = DBStore.find_quizzes_by_student(student_id)
        unattempted = [q for q in quizzes if q.get("status") in ["unattempted", "in_progress"]]
        history = [q for q in quizzes if q.get("status") == "completed"]

        return {
            "success": True,
            "quizzes": quizzes,
            "unattempted": unattempted,
            "history": history,
        }

    @staticmethod
    def get_quiz_by_id(quiz_id: str, student_id: str) -> Dict[str, Any]:
        quiz = DBStore.find_quiz_by_id(quiz_id, student_id)
        if not quiz:
            return {"success": False, "message": "Quiz not found."}
        return {"success": True, "quiz": quiz}

    @staticmethod
    def submit_quiz(quiz_id: str, student_id: str, answers: Any) -> Dict[str, Any]:
        quiz = DBStore.find_quiz_by_id(quiz_id, student_id)
        if not quiz:
            return {"success": False, "message": "Quiz not found."}

        questions = quiz.get("questions", [])
        correct_count = 0
        answered_count = 0

        updated_questions = []
        for idx, q in enumerate(questions):
            q_num = q.get("questionNumber", idx + 1)
            selected = None
            if isinstance(answers, dict):
                selected = answers.get(str(q_num), answers.get(q_num, None))
            elif isinstance(answers, list) and idx < len(answers):
                selected = answers[idx]

            is_answered = selected is not None
            if is_answered:
                answered_count += 1

            correct_ans = q.get("correctAnswer", 0)
            is_correct = is_answered and int(selected) == int(correct_ans)
            if is_correct:
                correct_count += 1

            q_copy = dict(q)
            q_copy["selectedAnswer"] = int(selected) if is_answered else None
            updated_questions.append(q_copy)

        pct = round((correct_count / (len(questions) or 1)) * 100)

        updated_quiz = DBStore.update_quiz(quiz_id, student_id, {
            "questions": updated_questions,
            "status": "completed",
            "completed": True,
            "score": pct,
            "totalAnswered": answered_count,
        })

        DBStore.create_notification({
            "studentId": student_id,
            "type": "quiz",
            "title": "Quiz Completed",
            "message": f"You scored {pct}% ({correct_count}/{len(questions)}) on '{quiz.get('title')}'.",
            "read": False,
        })

        return {
            "success": True,
            "quiz": updated_quiz,
            "score": pct,
            "correctCount": correct_count,
            "totalQuestions": len(questions),
        }

    @staticmethod
    def retry_quiz(quiz_id: str, student_id: str) -> Dict[str, Any]:
        quiz = DBStore.find_quiz_by_id(quiz_id, student_id)
        if not quiz:
            return {"success": False, "message": "Quiz not found."}

        reset_questions = []
        for q in quiz.get("questions", []):
            qc = dict(q)
            qc["selectedAnswer"] = None
            reset_questions.append(qc)

        updated = DBStore.update_quiz(quiz_id, student_id, {
            "questions": reset_questions,
            "status": "unattempted",
            "completed": False,
            "score": 0,
            "totalAnswered": 0,
        })

        return {"success": True, "quiz": updated}

    @staticmethod
    def delete_quiz(quiz_id: str, student_id: str) -> Dict[str, Any]:
        DBStore.delete_quiz(quiz_id, student_id)
        return {"success": True, "message": "Quiz deleted successfully."}
