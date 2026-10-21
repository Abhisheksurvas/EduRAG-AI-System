from typing import Dict, Any
from backend.models.store import DBStore

class ProfileController:
    @staticmethod
    def get_profile(student_id: str) -> Dict[str, Any]:
        student = DBStore.find_student_by_id(student_id)
        if not student:
            return {"success": False, "message": "Student not found."}

        safe_student = dict(student)
        safe_student.pop("passwordHash", None)
        return {"success": True, "profile": safe_student}

    @staticmethod
    def update_profile(student_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        allowed_fields = ["name", "rollNo", "branch", "semester", "year", "goals", "avatar"]
        clean_updates: Dict[str, Any] = {}
        for f in allowed_fields:
            if f in updates and updates[f] is not None:
                clean_updates[f] = updates[f].strip() if isinstance(updates[f], str) else updates[f]

        updated = DBStore.update_student(student_id, clean_updates)
        if not updated:
            return {"success": False, "message": "Student not found."}

        DBStore.create_notification({
            "studentId": student_id,
            "type": "system",
            "title": "Profile Updated",
            "message": "Your student academic profile details have been saved.",
            "read": False,
        })

        safe_student = dict(updated)
        safe_student.pop("passwordHash", None)
        return {"success": True, "profile": safe_student}
