from typing import Dict, Any, Optional
from backend.models.store import DBStore
from backend.rag.notes_generator import NotesGenerator

class NotesController:
    @staticmethod
    def generate(
        student_id: str,
        document_id: str,
        unit: Optional[str] = None,
        chapter: Optional[str] = None,
        prompt_type: Optional[str] = "Five key takeaways",
        custom_prompt: Optional[str] = None
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

        generated = NotesGenerator.generate_notes(
            student_id=student_id,
            document_id=document_id,
            unit=unit or "",
            chapter=chapter or "",
            prompt_type=prompt_type or "Five key takeaways",
            custom_prompt=custom_prompt or ""
        )

        note = DBStore.create_note({
            "studentId": student_id,
            "documentId": document_id,
            "documentName": doc.get("originalName", "Document"),
            "title": generated.get("title", f"Notes: {prompt_type}"),
            "unit": unit or "General",
            "chapter": chapter or "All Chapters",
            "prompt": prompt_type or "Five key takeaways",
            "promptType": prompt_type or "Five key takeaways",
            "content": generated.get("content", ""),
        })

        DBStore.create_notification({
            "studentId": student_id,
            "type": "notes",
            "title": "Notes Generated",
            "message": f"Notes for '{doc.get('originalName')}' generated successfully ({note.get('title')}).",
            "read": False,
        })

        return {"success": True, "note": note}

    @staticmethod
    def get_notes(student_id: str) -> Dict[str, Any]:
        notes = DBStore.find_notes_by_student(student_id)
        return {"success": True, "notes": notes}

    @staticmethod
    def get_note_by_id(note_id: str, student_id: str) -> Dict[str, Any]:
        note = DBStore.find_note_by_id(note_id, student_id)
        if not note:
            return {"success": False, "message": "Note not found."}
        return {"success": True, "note": note}

    @staticmethod
    def update_note(note_id: str, student_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        clean_updates: Dict[str, Any] = {}
        if "title" in updates and updates["title"]:
            clean_updates["title"] = updates["title"].strip()
        if "content" in updates:
            clean_updates["content"] = updates["content"]

        updated = DBStore.update_note(note_id, student_id, clean_updates)
        if not updated:
            return {"success": False, "message": "Note not found."}
        return {"success": True, "note": updated}

    @staticmethod
    def delete_note(note_id: str, student_id: str) -> Dict[str, Any]:
        DBStore.delete_note(note_id, student_id)
        return {"success": True, "message": "Note deleted successfully."}

    @staticmethod
    def delete_all_notes(student_id: str) -> Dict[str, Any]:
        DBStore.delete_all_notes(student_id)
        return {"success": True, "message": "All notes deleted successfully."}

    @staticmethod
    def export_note(note_id: str, student_id: str, export_format: str = "txt") -> Dict[str, Any]:
        note = DBStore.find_note_by_id(note_id, student_id)
        if not note:
            return {"success": False, "message": "Note not found."}

        title = note.get("title", "study_notes")
        content = note.get("content", "")
        doc_name = note.get("documentName", "Study Material")

        if export_format in ["docx", "doc"]:
            html_doc = f"<!DOCTYPE html><html><head><meta charset='utf-8'><title>{title}</title></head><body><h1>{title}</h1><p><em>Source: {doc_name}</em></p><hr/><pre>{content}</pre></body></html>"
            return {
                "success": True,
                "content_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "filename": f"{title}.doc",
                "body": html_doc
            }

        text_content = f"EDURAG AI - STUDY NOTES\n============================\nTitle: {title}\nSource: {doc_name}\n\n{content}"
        return {
            "success": True,
            "content_type": "text/plain; charset=utf-8",
            "filename": f"{title}.txt",
            "body": text_content
        }
