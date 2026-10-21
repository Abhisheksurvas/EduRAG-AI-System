import json
import re
from typing import Dict, Any, List
from backend.models.store import DBStore
from backend.services.gemini_service import generate_content_safe

class QuizGenerator:
    @classmethod
    def generate_quiz(cls, student_id: str, document_id: str, num_questions: int = 10) -> Dict[str, Any]:
        doc = DBStore.find_document_by_id(document_id, student_id)
        doc_name = doc.get("originalName", "Course Material") if doc else "Course Material"

        chunks = DBStore.find_chunks(student_id, [document_id])
        if not chunks:
            chunks = DBStore.find_chunks(student_id)

        context_text = "\n\n---\n\n".join([f"[Page {c.get('pageNumber', 1)}]: {c.get('text', '')}" for c in chunks[:12]])

        system_instruction = f"""You are EduRAG AI Quiz Engine for University Engineering Exams.
Generate exactly {num_questions} high-quality Multiple Choice Questions (MCQs) grounded in the provided STUDY MATERIAL CONTEXT.
Each question MUST have:
1. "question": clear academic question stem.
2. "options": array of exactly 4 strings.
3. "correctAnswer": integer index (0, 1, 2, or 3) of the correct option.
4. "explanation": detailed explanation explaining why the answer is correct with formulas and concept references.

Output MUST be valid JSON with a root "quiz" array:
{{
  "quiz": [
    {{
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "..."
    }}
  ]
}}"""

        user_prompt = f"""DOCUMENT: {doc_name}
STUDY MATERIAL CONTEXT:
{context_text}

Generate {num_questions} verified MCQs in JSON format now."""

        try:
            response = generate_content_safe(
                contents=user_prompt,
                config={
                    "systemInstruction": system_instruction,
                    "responseMimeType": "application/json",
                    "temperature": 0.2
                }
            )
            raw = getattr(response, "text", "") or ""
            # Strip markdown json codeblock if present
            cleaned = re.sub(r"^```json\s*", "", raw.strip())
            cleaned = re.sub(r"\s*```$", "", cleaned.strip())
            parsed = json.loads(cleaned)
            questions = parsed.get("quiz") or parsed.get("questions") or []
            if len(questions) > 0:
                return {
                    "title": f"Quiz: {doc_name.rsplit('.', 1)[0]}",
                    "questions": questions,
                    "totalMarks": len(questions),
                }
        except Exception as e:
            print(f"Quiz generation error, using fallback: {e}")

        # Fallback question set
        fallback_questions = [
            {
                "question": f"In study material '{doc_name}', what is the primary role of algorithmic verification?",
                "options": [
                    "Ensuring mathematical correctness and bounded resource execution",
                    "Maximizing arbitrary heap allocations",
                    "Disabling runtime type assertions",
                    "Hardcoding static buffer sizes"
                ],
                "correctAnswer": 0,
                "explanation": "Algorithmic verification ensures computational correctness and optimal performance."
            },
            {
                "question": "Which metric evaluates accuracy while accounting for class imbalance?",
                "options": [
                    "F1-Score (Harmonic Mean of Precision and Recall)",
                    "Simple Unweighted Accuracy",
                    "Raw Token Byte Length",
                    "Clock Cycle Count"
                ],
                "correctAnswer": 0,
                "explanation": "F1-score provides the balanced harmonic mean between precision and recall."
            }
        ]

        return {
            "title": f"Exam Quiz: {doc_name.rsplit('.', 1)[0]}",
            "questions": fallback_questions,
            "totalMarks": len(fallback_questions),
        }
