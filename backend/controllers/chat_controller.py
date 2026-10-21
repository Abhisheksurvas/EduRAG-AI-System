from typing import Dict, Any, Optional
from backend.models.store import DBStore
from backend.rag.retrieval import RAGRetriever
from backend.rag.study_material_generator import StudyMaterialGenerator
from backend.rag.ai_knowledge_generator import AiKnowledgeGenerator

class ChatController:
    @staticmethod
    def send_message(student_id: str, question: str, conv_id: Optional[str] = None, doc_id: Optional[str] = None, marks: int = 6, language: str = "English") -> Dict[str, Any]:
        clean_q = question.strip()
        if not conv_id:
            conv = DBStore.create_conversation({
                "studentId": student_id,
                "title": clean_q[:40] + ("..." if len(clean_q) > 40 else ""),
                "language": language,
                "marks": marks
            })
            conv_id = str(conv["_id"])

        user_msg = DBStore.create_message({
            "studentId": student_id,
            "conversationId": conv_id,
            "role": "user",
            "content": clean_q,
            "documentIds": [doc_id] if doc_id else [],
            "marks": marks,
            "language": language,
        })

        retrieval = RAGRetriever.retrieve_relevant_chunks(student_id, clean_q, document_ids=[doc_id] if doc_id else None)
        study_res = StudyMaterialGenerator.generate_answer(clean_q, retrieval, marks, language)
        ai_res = AiKnowledgeGenerator.generate_answer(clean_q, marks, language)

        assistant_msg = DBStore.create_message({
            "studentId": student_id,
            "conversationId": conv_id,
            "role": "assistant",
            "content": clean_q,
            "studyMaterialAnswer": study_res.get("answer"),
            "generalAiAnswer": ai_res,
            "answerMode": "dual",
            "marks": marks,
            "language": language,
            "sources": study_res.get("sources", []),
        })

        return {
            "conversationId": conv_id,
            "userMessage": user_msg,
            "assistantMessage": assistant_msg
        }
