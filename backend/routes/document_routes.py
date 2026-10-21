from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import Optional, List
from backend.models.store import DBStore
from backend.middleware.auth import require_auth
from backend.rag.extractor import DocumentExtractor
from backend.rag.chunker import DocumentChunker
from backend.rag.embedding import EmbeddingService
from backend.services.sample_docs_service import SampleDocsService

router = APIRouter(prefix="/api/documents", tags=["documents"])

@router.get("")
async def get_documents(student_id: str = Depends(require_auth)):
    docs = DBStore.find_documents_by_student(student_id)
    if len(docs) == 0:
        docs = SampleDocsService.seed_sample_documents_for_student(student_id)
    return {
        "success": True,
        "documents": docs
    }

@router.get("/{doc_id}")
async def get_document_by_id(doc_id: str, student_id: str = Depends(require_auth)):
    doc = DBStore.find_document_by_id(doc_id, student_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {
        "success": True,
        "document": doc
    }

@router.get("/{doc_id}/chunks")
async def get_document_chunks(doc_id: str, student_id: str = Depends(require_auth)):
    doc = DBStore.find_document_by_id(doc_id, student_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    chunks = DBStore.find_chunks(student_id, [doc_id])
    return {
        "success": True,
        "document": doc,
        "chunks": chunks,
        "totalChunks": len(chunks)
    }

@router.post("/upload")
async def upload_document(file: UploadFile = File(...), student_id: str = Depends(require_auth)):
    contents = await file.read()
    filename = file.filename or "Uploaded_Document.pdf"
    file_size = len(contents)
    file_type = filename.split(".")[-1].upper() if "." in filename else "PDF"

    text, page_count = DocumentExtractor.extract_text(contents, filename)
    raw_chunks = DocumentChunker.chunk_text(text)

    doc = DBStore.create_document({
        "studentId": student_id,
        "originalName": filename,
        "fileType": file_type,
        "fileSize": file_size,
        "totalChunks": len(raw_chunks),
        "status": "ready",
        "pageCount": page_count,
        "courseSubject": "Uploaded Course Material"
    })

    chunk_records = []
    for idx, c in enumerate(raw_chunks):
        chunk_records.append({
            "documentId": str(doc["_id"]),
            "studentId": student_id,
            "filename": filename,
            "pageNumber": c.get("pageNumber", 1),
            "chunkIndex": idx,
            "unit": c.get("unit", ""),
            "chapter": c.get("chapter", ""),
            "text": c.get("text", ""),
            "embedding": EmbeddingService.generate_embedding(c.get("text", ""))
        })

    DBStore.create_chunks(chunk_records)

    DBStore.create_notification({
        "studentId": student_id,
        "title": "Document Indexed Successfully",
        "message": f"'{filename}' has been indexed into {len(raw_chunks)} vector chunks and is ready for exam Q&A.",
        "type": "success"
    })

    return {
        "success": True,
        "document": doc,
        "chunksCreated": len(raw_chunks)
    }

@router.post("/seed-sample")
async def seed_sample_docs(student_id: str = Depends(require_auth)):
    docs = SampleDocsService.seed_sample_documents_for_student(student_id)
    return {
        "success": True,
        "message": "Sample materials seeded successfully.",
        "documents": docs
    }

@router.delete("/{doc_id}")
async def delete_document(doc_id: str, student_id: str = Depends(require_auth)):
    success = DBStore.delete_document(doc_id, student_id)
    return {
        "success": success,
        "message": "Document deleted successfully."
    }
