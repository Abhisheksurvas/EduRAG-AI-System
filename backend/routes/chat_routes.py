from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from backend.models.store import DBStore
from backend.middleware.auth import require_auth
from backend.rag.retrieval import RAGRetriever
from backend.rag.study_material_generator import StudyMaterialGenerator
from backend.rag.ai_knowledge_generator import AiKnowledgeGenerator
from backend.services.sample_docs_service import SampleDocsService

router = APIRouter(prefix="/api/chat", tags=["chat"])

class SendMessagePayload(BaseModel):
    conversationId: Optional[str] = None
    question: str
    documentId: Optional[str] = None
    marks: Optional[int] = 6
    language: Optional[str] = "English"

class EditMessagePayload(BaseModel):
    newQuestion: str
    documentId: Optional[str] = None
    marks: Optional[int] = None
    language: Optional[str] = None

class RegeneratePayload(BaseModel):
    marks: Optional[int] = None
    language: Optional[str] = None
    documentId: Optional[str] = None

@router.get("/conversations")
async def get_conversations(student_id: str = Depends(require_auth)):
    conversations = DBStore.find_conversations_by_student(student_id)
    return {
        "success": True,
        "conversations": conversations
    }

@router.get("/conversations/{conv_id}/messages")
async def get_messages(conv_id: str, student_id: str = Depends(require_auth)):
    conv = DBStore.find_conversation_by_id(conv_id, student_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    messages = DBStore.find_messages_by_conversation(conv_id, student_id)
    return {
        "success": True,
        "conversation": conv,
        "messages": messages
    }

@router.post("/message")
async def send_message(payload: SendMessagePayload, student_id: str = Depends(require_auth)):
    clean_q = payload.question.strip()
    if not clean_q:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    target_marks = payload.marks if payload.marks in [4, 6, 8] else 6
    target_lang = payload.language or "English"

    # Ensure conversation exists
    conv_id = payload.conversationId
    if not conv_id:
        conv = DBStore.create_conversation({
            "studentId": student_id,
            "title": clean_q[:40] + ("..." if len(clean_q) > 40 else ""),
            "language": target_lang,
            "marks": target_marks
        })
        conv_id = str(conv["_id"])
    else:
        conv = DBStore.find_conversation_by_id(conv_id, student_id)
        if not conv:
            conv = DBStore.create_conversation({
                "studentId": student_id,
                "title": clean_q[:40] + ("..." if len(clean_q) > 40 else ""),
                "language": target_lang,
                "marks": target_marks
            })
            conv_id = str(conv["_id"])

    # Ensure documents exist
    existing_docs = DBStore.find_documents_by_student(student_id)
    if len(existing_docs) == 0:
        existing_docs = SampleDocsService.seed_sample_documents_for_student(student_id)

    effective_doc_id = payload.documentId
    attached_doc_name = None
    attached_doc_type = None

    if effective_doc_id:
        doc = DBStore.find_document_by_id(effective_doc_id, student_id)
        if doc:
            attached_doc_name = doc.get("originalName")
            attached_doc_type = doc.get("fileType")
    elif len(existing_docs) == 1:
        effective_doc_id = str(existing_docs[0]["_id"])
        attached_doc_name = existing_docs[0].get("originalName")
        attached_doc_type = existing_docs[0].get("fileType")

    # 1. Save user question
    user_msg = DBStore.create_message({
        "studentId": student_id,
        "conversationId": conv_id,
        "role": "user",
        "content": clean_q,
        "documentIds": [effective_doc_id] if effective_doc_id else [],
        "attachedDocumentName": attached_doc_name,
        "attachedDocumentType": attached_doc_type,
        "sources": [],
        "language": target_lang,
    })

    # 2. RAG Retrieval
    doc_filter = [effective_doc_id] if effective_doc_id else None
    retrieval = RAGRetriever.retrieve_relevant_chunks(
        student_id=student_id,
        query=clean_q,
        document_ids=doc_filter,
        top_k=5
    )

    # 3. Dual synthesis: Section 1 (Study Material Grounded) & Section 2 (AI Knowledge Final Answer)
    study_result = StudyMaterialGenerator.generate_answer(clean_q, retrieval, target_marks, target_lang)
    ai_result = AiKnowledgeGenerator.generate_answer(clean_q, target_marks, target_lang)

    # 4. Save assistant dual message
    assistant_msg = DBStore.create_message({
        "studentId": student_id,
        "conversationId": conv_id,
        "role": "assistant",
        "content": clean_q,
        "studyMaterialAnswer": study_result.get("answer"),
        "generalAiAnswer": ai_result,
        "answerMode": "dual",
        "marks": target_marks,
        "language": target_lang,
        "documentIds": [effective_doc_id] if effective_doc_id else [],
        "attachedDocumentName": attached_doc_name or (study_result.get("sources", [{}])[0].get("filename") if study_result.get("sources") else None),
        "attachedDocumentType": attached_doc_type,
        "sources": study_result.get("sources", []),
    })

    return {
        "success": True,
        "conversationId": conv_id,
        "userMessage": user_msg,
        "assistantMessage": assistant_msg
    }

@router.put("/messages/{msg_id}")
async def edit_message(msg_id: str, payload: EditMessagePayload, student_id: str = Depends(require_auth)):
    existing_msg = DBStore.find_message_by_id(msg_id, student_id)
    if not existing_msg or existing_msg.get("role") != "user":
        raise HTTPException(status_code=404, detail="User message not found.")

    clean_q = payload.newQuestion.strip()
    conv_id = str(existing_msg.get("conversationId"))
    target_marks = payload.marks or existing_msg.get("marks") or 6
    target_lang = payload.language or existing_msg.get("language") or "English"

    updated_user_msg = DBStore.update_message(msg_id, student_id, {
        "content": clean_q,
        "marks": target_marks,
        "language": target_lang
    })

    retrieval = RAGRetriever.retrieve_relevant_chunks(student_id, clean_q, top_k=5)
    study_result = StudyMaterialGenerator.generate_answer(clean_q, retrieval, target_marks, target_lang)
    ai_result = AiKnowledgeGenerator.generate_answer(clean_q, target_marks, target_lang)

    conv_messages = DBStore.find_messages_by_conversation(conv_id, student_id)
    user_idx = next((i for i, m in enumerate(conv_messages) if str(m.get("_id")) == str(msg_id)), -1)

    if user_idx != -1 and user_idx + 1 < len(conv_messages) and conv_messages[user_idx + 1].get("role") == "assistant":
        next_id = str(conv_messages[user_idx + 1]["_id"])
        assistant_msg = DBStore.update_message(next_id, student_id, {
            "content": clean_q,
            "studyMaterialAnswer": study_result.get("answer"),
            "generalAiAnswer": ai_result,
            "sources": study_result.get("sources", []),
            "marks": target_marks,
            "language": target_lang
        })
    else:
        assistant_msg = DBStore.create_message({
            "studentId": student_id,
            "conversationId": conv_id,
            "role": "assistant",
            "content": clean_q,
            "studyMaterialAnswer": study_result.get("answer"),
            "generalAiAnswer": ai_result,
            "answerMode": "dual",
            "marks": target_marks,
            "language": target_lang,
            "sources": study_result.get("sources", [])
        })

    return {
        "success": True,
        "userMessage": updated_user_msg,
        "assistantMessage": assistant_msg
    }

@router.post("/messages/{msg_id}/regenerate")
async def regenerate_answer(msg_id: str, payload: RegeneratePayload, student_id: str = Depends(require_auth)):
    target_msg = DBStore.find_message_by_id(msg_id, student_id)
    if not target_msg:
        raise HTTPException(status_code=404, detail="Message not found.")

    question = target_msg.get("content", "")
    target_marks = payload.marks or target_msg.get("marks") or 6
    target_lang = payload.language or target_msg.get("language") or "English"

    retrieval = RAGRetriever.retrieve_relevant_chunks(student_id, question, top_k=5)
    study_result = StudyMaterialGenerator.generate_answer(question, retrieval, target_marks, target_lang)
    ai_result = AiKnowledgeGenerator.generate_answer(question, target_marks, target_lang)

    updated = DBStore.update_message(msg_id, student_id, {
        "studyMaterialAnswer": study_result.get("answer"),
        "generalAiAnswer": ai_result,
        "sources": study_result.get("sources", []),
        "marks": target_marks,
        "language": target_lang
    })

    return {
        "success": True,
        "assistantMessage": updated
    }

@router.delete("/conversations/{conv_id}")
async def delete_conversation(conv_id: str, student_id: str = Depends(require_auth)):
    DBStore.delete_conversation(conv_id, student_id)
    return {
        "success": True,
        "message": "Conversation deleted successfully."
    }
